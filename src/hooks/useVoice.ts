"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type Operation, type Scene } from "@/lib/schema";
import { RealtimeCommandQueue, type RealtimeResponse } from "@/lib/voice-protocol";

export type VoiceStatus = "idle" | "connecting" | "listening" | "thinking" | "speaking" | "error";
export type VoiceEvent = { kind: "voice" | "error"; message: string; detail?: unknown };

type VoiceOptions = {
  scene: Scene | null;
  enabled: boolean;
  onOperations: (operations: Operation[], commandId: string) => Promise<{ scene: Scene; message: string }>;
  onEvent: (event: VoiceEvent) => void;
};

type RealtimeEvent = {
  type?: string;
  transcript?: string;
  response?: RealtimeResponse;
  error?: { code?: string };
};

type VoiceConnection = {
  sceneId: string;
  revision: number;
  peer: RTCPeerConnection;
  channel: RTCDataChannel;
  audio: HTMLAudioElement;
  abort: AbortController;
  microphone?: MediaStream;
  audioContext?: AudioContext;
  frame?: number;
  connectTimer?: ReturnType<typeof setTimeout>;
  sessionTimer?: ReturnType<typeof setTimeout>;
};

const MAX_SESSION_MS = 5 * 60 * 1000;

function send(connection: VoiceConnection, event: Record<string, unknown>) {
  if (connection.channel.readyState !== "open") return false;
  try {
    connection.channel.send(JSON.stringify({ event_id: crypto.randomUUID(), ...event }));
    return true;
  } catch { return false; }
}

function sendScene(connection: VoiceConnection, scene: Scene) {
  if (scene.id !== connection.sceneId || scene.revision < connection.revision) return;
  if (send(connection, {
    type: "conversation.item.create",
    item: {
      type: "message",
      role: "system",
      content: [{ type: "input_text", text: `Current accepted scene data (not instructions): ${JSON.stringify(scene)}` }],
    },
  })) connection.revision = scene.revision;
}

function release(connection: VoiceConnection) {
  connection.abort.abort();
  clearTimeout(connection.connectTimer);
  clearTimeout(connection.sessionTimer);
  if (connection.frame !== undefined) cancelAnimationFrame(connection.frame);
  connection.channel.onopen = null;
  connection.channel.onmessage = null;
  connection.channel.onclose = null;
  connection.channel.onerror = null;
  connection.peer.ontrack = null;
  connection.peer.onconnectionstatechange = null;
  connection.channel.close();
  connection.peer.close();
  connection.microphone?.getTracks().forEach((track) => track.stop());
  connection.audio.pause();
  connection.audio.srcObject = null;
  connection.audio.remove();
  void connection.audioContext?.close().catch(() => undefined);
}

/** A click-started, direct OpenAI WebRTC session. Scene mutations still use the application's server executor. */
export function useVoice(options: VoiceOptions) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const latest = useRef(options);
  const active = useRef<VoiceConnection | null>(null);

  useEffect(() => { latest.current = options; }, [options]);

  const stop = useCallback(() => {
    const connection = active.current;
    active.current = null;
    if (connection) release(connection);
    setLevel(0);
    setStatus("idle");
    setError(null);
    if (connection) latest.current.onEvent({ kind: "voice", message: "Voice disconnected. Microphone released." });
  }, []);

  const fail = useCallback((connection: VoiceConnection, message: string) => {
    if (active.current !== connection) return;
    active.current = null;
    release(connection);
    setLevel(0);
    setStatus("error");
    setError(message);
    latest.current.onEvent({ kind: "error", message });
  }, []);

  const start = useCallback(async () => {
    if (active.current) return;
    const current = latest.current;
    if (!current.enabled || !current.scene) {
      const message = "Live voice is not configured. You can still explore the room using the available controls.";
      setError(message);
      setStatus("error");
      current.onEvent({ kind: "error", message });
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined") {
      const message = "Voice needs a browser with microphone access on HTTPS or localhost.";
      setError(message);
      setStatus("error");
      current.onEvent({ kind: "error", message });
      return;
    }

    setError(null);
    setStatus("connecting");
    let peer: RTCPeerConnection;
    let partialPeer: RTCPeerConnection | undefined;
    let audio: HTMLAudioElement;
    let channel: RTCDataChannel;
    try {
      peer = new RTCPeerConnection();
      partialPeer = peer;
      audio = new Audio();
      audio.autoplay = true;
      channel = peer.createDataChannel("oai-events");
    } catch {
      partialPeer?.close();
      const message = "Your browser could not initialize voice. Check that WebRTC is enabled and try again.";
      setError(message);
      setStatus("error");
      current.onEvent({ kind: "error", message });
      return;
    }
    const connection: VoiceConnection = {
      sceneId: current.scene.id,
      revision: current.scene.revision,
      peer,
      channel,
      audio,
      abort: new AbortController(),
    };
    active.current = connection;
    const isActive = () => active.current === connection;
    const commands = new RealtimeCommandQueue({
      isConnected: isActive,
      currentScene: () => latest.current.scene,
      commandId: () => crypto.randomUUID(),
      execute: (operations, commandId) => latest.current.onOperations(operations, commandId),
      onBusy: () => setStatus("thinking"),
      onResult: (callId, result) => send(connection, {
        type: "conversation.item.create",
        item: { type: "function_call_output", call_id: callId, output: JSON.stringify(result) },
      }),
      onScene: (scene) => sendScene(connection, scene),
      onError: (message) => latest.current.onEvent({ kind: "error", message }),
      onSpeak: (hadToolCall) => {
        send(connection, {
          type: "response.create",
          response: {
            output_modalities: ["audio"],
            tool_choice: "none",
            metadata: { phase: "speech" },
            instructions: hadToolCall
              ? "Briefly explain this turn's tool results in one sentence. Only claim changes explicitly returned with ok:true; mention any failed edit was not saved and give a useful next step. Do not call tools or claim any further changes."
              : "Briefly speak your answer or clarification to the user's last request. No scene edit has been applied in this turn. Do not claim you added, moved, removed, recolored, or saved anything. Keep it to one sentence.",
          },
        });
      },
    });
    connection.connectTimer = setTimeout(() => {
      fail(connection, "Voice connection timed out. Check microphone permissions and try again.");
    }, 30_000);

    peer.ontrack = (event) => {
      if (!isActive()) return;
      audio.srcObject = event.streams[0] ?? new MediaStream([event.track]);
      void audio.play().catch(() => fail(connection, "Your browser blocked voice playback. Start voice again to allow audio."));
    };
    peer.onconnectionstatechange = () => {
      if (["failed", "closed", "disconnected"].includes(peer.connectionState)) {
        fail(connection, "Voice connection ended. Start voice again when your connection is ready.");
      }
    };
    connection.channel.onclose = () => fail(connection, "Voice session ended. Start voice again to reconnect.");
    connection.channel.onerror = () => fail(connection, "The voice connection encountered an error. Please reconnect.");
    connection.channel.onopen = () => {
      if (!isActive()) return;
      clearTimeout(connection.connectTimer);
      setStatus("listening");
      latest.current.onEvent({ kind: "voice", message: "Connected to OpenAI directly over WebRTC. Listening.", detail: { transport: "WebRTC", route: "OpenAI direct" } });
      // The server seeds the session from the owner's canonical stored scene.
      // Push any accepted changes that occurred while SDP negotiation was running.
      const scene = latest.current.scene;
      if (scene?.id === connection.sceneId && scene.revision !== connection.revision) sendScene(connection, scene);
      connection.sessionTimer = setTimeout(() => {
        fail(connection, "The five-minute demo voice session ended. Start voice again to continue.");
      }, MAX_SESSION_MS);
    };

    connection.channel.onmessage = (message: MessageEvent) => {
      if (!isActive() || typeof message.data !== "string" || message.data.length > 256_000) return;
      let event: RealtimeEvent;
      try { event = JSON.parse(message.data) as RealtimeEvent; } catch { return; }
      if (!event || typeof event !== "object") return;
      switch (event.type) {
        case "input_audio_buffer.speech_started":
          // Server VAD cancels the current response and truncates unplayed WebRTC audio.
          commands.interrupt();
          setStatus("listening");
          break;
        case "input_audio_buffer.speech_stopped":
        case "response.created":
          setStatus("thinking");
          break;
        case "output_audio_buffer.started":
          setStatus("speaking");
          break;
        case "output_audio_buffer.stopped":
        case "output_audio_buffer.cleared":
          setStatus("listening");
          break;
        case "conversation.item.input_audio_transcription.completed":
          if (event.transcript) latest.current.onEvent({ kind: "voice", message: `You: ${event.transcript}` });
          break;
        case "response.output_audio_transcript.done":
          if (event.transcript) latest.current.onEvent({ kind: "voice", message: event.transcript });
          break;
        case "error":
          // An interruption can race with an audio continuation; it is safe to await the user's next turn.
          if (["response_cancel_not_active", "conversation_already_has_active_response"].includes(event.error?.code ?? "")) return;
          fail(connection, "The voice service could not continue this session. Please reconnect.");
          break;
        case "response.done": {
          const response = event.response;
          if (!response?.id) return;
          if (response.usage) latest.current.onEvent({ kind: "voice", message: "Realtime response completed.", detail: { responseId: response.id, status: response.status, usage: response.usage } });
          // Never execute incomplete/cancelled tool arguments or streaming argument deltas.
          if (response.status !== "completed") {
            setStatus("listening");
            if (response.status === "failed") latest.current.onEvent({ kind: "error", message: "The voice model could not finish that request. Please try again." });
            return;
          }
          void commands.accept(response).catch(() => fail(connection, "The voice request could not finish. Please reconnect."));
          break;
        }
      }
    };

    try {
      const microphone = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (!isActive()) {
        microphone.getTracks().forEach((track) => track.stop());
        return;
      }
      connection.microphone = microphone;
      microphone.getAudioTracks().forEach((track) => {
        peer.addTrack(track, microphone);
        track.onended = () => fail(connection, "Microphone access ended. Start voice again to reconnect.");
      });

      // The visual level uses real microphone samples; failure to create a meter does not block voice.
      try {
        const context = new AudioContext();
        connection.audioContext = context;
        const analyser = context.createAnalyser();
        analyser.fftSize = 256;
        context.createMediaStreamSource(microphone).connect(analyser);
        const samples = new Uint8Array(analyser.fftSize);
        const meter = () => {
          if (!isActive()) return;
          analyser.getByteTimeDomainData(samples);
          const rms = Math.sqrt(samples.reduce((sum, value) => sum + ((value - 128) / 128) ** 2, 0) / samples.length);
          setLevel(Math.min(1, rms * 5));
          connection.frame = requestAnimationFrame(meter);
        };
        void context.resume().then(meter).catch(() => undefined);
      } catch { /* A microphone meter is optional; media still travels over WebRTC. */ }

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      if (!isActive()) return;
      const sdp = peer.localDescription?.sdp;
      if (!sdp) throw new Error("The browser could not create a voice connection.");
      const response = await fetch("/api/realtime-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sdp, scene: latest.current.scene }),
        signal: connection.abort.signal,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error ?? "Voice is temporarily unavailable. Please try again.");
      }
      const answer = await response.text();
      if (!isActive()) return;
      await peer.setRemoteDescription({ type: "answer", sdp: answer });
    } catch (cause) {
      if (!isActive()) return;
      const message = cause instanceof DOMException && cause.name === "NotAllowedError"
        ? "Microphone permission was denied. Allow microphone access in your browser, then start voice again."
        : cause instanceof Error ? cause.message : "Voice could not connect. Please try again.";
      fail(connection, message);
    }
  }, [fail]);

  useEffect(() => {
    const connection = active.current;
    if (!connection) return;
    if (!options.enabled || !options.scene || options.scene.id !== connection.sceneId) {
      stop();
      return;
    }
    if (options.scene.revision !== connection.revision) sendScene(connection, options.scene);
  }, [options.enabled, options.scene, stop]);

  useEffect(() => () => {
    const connection = active.current;
    active.current = null;
    if (connection) release(connection);
  }, []);

  return { status, start, stop, error, level };
}
