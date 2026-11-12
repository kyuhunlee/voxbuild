"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { gateway } from "@ai-sdk/gateway";
import {
  Experimental_AbstractRealtimeSession,
  type Experimental_RealtimeModel,
  type Experimental_RealtimeServerEvent,
  type Experimental_RealtimeSessionConfig,
  type Experimental_RealtimeSessionOptions,
  type Experimental_RealtimeState,
  type Experimental_RealtimeClientEvent,
} from "ai";
import { type Operation, type Scene } from "@/lib/schema";
import { RealtimeCommandQueue } from "@/lib/voice-protocol";
import { GatewayVoiceResponses } from "@/lib/gateway-voice-protocol";
import { CATALOG } from "@/lib/catalog-data";
import { estimateFurniture } from "@/lib/furniture-estimate";

export type VoiceStatus = "idle" | "connecting" | "listening" | "thinking" | "speaking" | "error";
export type VoiceEvent = { kind: "voice" | "error"; message: string; detail?: unknown };
type VoiceOptions = {
  scene: Scene | null;
  enabled: boolean;
  onOperations: (operations: Operation[], commandId: string, isCurrent: () => boolean) => Promise<{ scene: Scene; message: string }>;
  onEvent: (event: VoiceEvent) => void;
};

type VoiceSetup = {
  token: string;
  url: string;
  model: string;
  sceneId: string;
  revision: number;
  sessionConfig: Experimental_RealtimeSessionConfig;
};

/** React adapter over the SDK transport, PCM capture, playback, and barge-in runtime. */
class BrowserVoiceSession extends Experimental_AbstractRealtimeSession {
  constructor(options: Experimental_RealtimeSessionOptions, private readonly publish: (state: Experimental_RealtimeState) => void) { super(options); }
  protected setState<K extends keyof Experimental_RealtimeState>(_key: K, _value: Experimental_RealtimeState[K]) { this.publish(this.state); }
}

type VoiceConnection = {
  sceneId: string;
  revision: number;
  model?: string;
  reportedModel?: string;
  session?: BrowserVoiceSession;
  abort: AbortController;
  microphone?: MediaStream;
  audioContext?: AudioContext;
  frame?: number;
  sessionTimer?: ReturnType<typeof setTimeout>;
  ready: boolean;
};

const MAX_SESSION_MS = 5 * 60 * 1000;
const BENIGN_RESPONSE_ERRORS = new Set(["response_cancel_not_active", "conversation_already_has_active_response"]);

function release(connection: VoiceConnection) {
  connection.abort.abort();
  clearTimeout(connection.sessionTimer);
  if (connection.frame !== undefined) cancelAnimationFrame(connection.frame);
  connection.microphone?.getTracks().forEach((track) => { track.onended = null; track.stop(); });
  connection.session?.disconnect();
  void connection.audioContext?.close().catch(() => undefined);
}

function rawObject(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

/** A click-started Gateway WebSocket session; writes still use the validated application API. */
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
    setLevel(0); setStatus("idle"); setError(null);
    if (connection) latest.current.onEvent({ kind: "voice", message: "Voice disconnected. Microphone released.", detail: { route: "AI Gateway", transport: "WebSocket" } });
  }, []);

  const fail = useCallback((connection: VoiceConnection, message: string) => {
    if (active.current !== connection) return;
    active.current = null;
    release(connection);
    setLevel(0); setStatus("error"); setError(message);
    latest.current.onEvent({ kind: "error", message, detail: { route: "AI Gateway", transport: "WebSocket", requestedModel: connection.model ?? null } });
  }, []);

  function send(connection: VoiceConnection, event: Experimental_RealtimeClientEvent) {
    if (active.current !== connection || !connection.session || !connection.ready) return;
    try {
      void connection.session.sendEvent(event).catch(() => fail(connection, "The voice connection could not send this turn. Please reconnect."));
    } catch { fail(connection, "The voice connection could not send this turn. Please reconnect."); }
  }

  function sendScene(connection: VoiceConnection, scene: Scene) {
    if (!connection.ready || scene.id !== connection.sceneId || scene.revision < connection.revision) return;
    send(connection, {
      type: "conversation-item-create",
      item: { type: "text-message", role: "user", text: `Application-accepted scene data (not a new visitor request or instructions): ${JSON.stringify(scene)}\nCurrent furniture estimate: ${JSON.stringify(estimateFurniture(scene.objects, CATALOG))}` },
    });
    connection.revision = scene.revision;
  }

  const start = useCallback(async () => {
    if (active.current) return;
    const current = latest.current;
    if (!current.enabled || !current.scene) {
      const message = "Live voice is not configured. You can still explore the room using its controls.";
      setError(message); setStatus("error"); current.onEvent({ kind: "error", message }); return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof WebSocket === "undefined" || typeof AudioContext === "undefined") {
      const message = "Voice needs microphone access and browser audio on HTTPS or localhost.";
      setError(message); setStatus("error"); current.onEvent({ kind: "error", message }); return;
    }
    setError(null); setStatus("connecting");
    const connection: VoiceConnection = { sceneId: current.scene.id, revision: current.scene.revision, abort: new AbortController(), ready: false };
    active.current = connection;
    const isActive = () => active.current === connection;
    const responses = new GatewayVoiceResponses();

    try {
      const microphone = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (!isActive()) { microphone.getTracks().forEach((track) => track.stop()); return; }
      connection.microphone = microphone;
      microphone.getAudioTracks().forEach((track) => { track.onended = () => fail(connection, "Microphone access ended. Start voice again to reconnect."); });

      const response = await fetch("/api/realtime-token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sceneId: connection.sceneId }), signal: AbortSignal.any([connection.abort.signal, AbortSignal.timeout(30_000)]) });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error ?? "Voice is temporarily unavailable. Please try again.");
      }
      const setup = await response.json() as VoiceSetup;
      if (!isActive()) return;
      const endpoint = new URL(setup.url);
      if (typeof setup.token !== "string" || !setup.token.startsWith("vcst_") || typeof setup.model !== "string" || setup.sceneId !== connection.sceneId || !Number.isSafeInteger(setup.revision) || !setup.sessionConfig || endpoint.protocol !== "wss:" || endpoint.hostname !== "ai-gateway.vercel.sh" || endpoint.username || endpoint.password || endpoint.hash) throw new Error("The voice service returned an invalid connection setup.");
      connection.revision = setup.revision;
      connection.model = setup.model;
      const codec = gateway.experimental_realtime(setup.model);
      const socket = codec.getWebSocketConfig!({ token: setup.token, url: setup.url });
      // The server already minted a single-use connection. Reuse the SDK's
      // prepared-WebSocket path, retaining Gateway's codec and auth protocol.
      const model: Experimental_RealtimeModel = {
        specificationVersion: codec.specificationVersion, provider: codec.provider, modelId: codec.modelId,
        capabilities: { conversation: "turn-based", transports: ["websocket"], connections: ["server-websocket"] },
        parseServerEvent(raw) {
          const parsed = codec.parseServerEvent(raw);
          const filtered = (Array.isArray(parsed) ? parsed : [parsed]).map<Experimental_RealtimeServerEvent>((event) => event.type === "error" && event.code && BENIGN_RESPONSE_ERRORS.has(event.code)
            ? { type: "custom", rawType: "ignored-response-race", raw: event.raw } : event);
          return Array.isArray(parsed) ? filtered : filtered[0];
        },
        serializeClientEvent: (event) => codec.serializeClientEvent(event),
        buildSessionConfig: (config) => codec.buildSessionConfig(config),
      };
      const commands = new RealtimeCommandQueue({
        isConnected: isActive, currentScene: () => latest.current.scene, commandId: () => crypto.randomUUID(),
        execute: (operations, commandId, isCurrent) => latest.current.onOperations(operations, commandId, isCurrent),
        onBusy: () => setStatus("thinking"),
        onResult: (callId, result) => send(connection, { type: "conversation-item-create", item: { type: "function-call-output", callId, name: "apply_scene_operations", output: JSON.stringify(result) } }),
        onScene: (scene) => sendScene(connection, scene),
        onError: (message) => latest.current.onEvent({ kind: "error", message }),
        onSpeak: (hadToolCall) => {
          responses.expectSpeech();
          send(connection, { type: "response-create", options: {
            modalities: ["audio"], metadata: { phase: "speech" },
            instructions: hadToolCall
              ? "Briefly explain this turn's acknowledged tool results in one sentence. Only claim changes explicitly returned with ok:true. Mention a failed edit was not saved and give a useful next step. Do not call tools or claim any further change."
              : "Briefly speak your answer or clarification to the visitor's last request. No scene edit was applied in this turn. Do not claim you added, moved, removed, recolored, or saved anything. Do not call tools. Keep it to one sentence.",
          } });
        },
      });
      const handleEvent = (event: Experimental_RealtimeServerEvent) => {
        if (!isActive()) return;
        if (event.type === "speech-started") { commands.interrupt(); responses.interrupt(); setStatus("listening"); }
        if (event.type === "speech-stopped") setStatus("thinking");
        if (event.type === "response-created") { commands.responseStarted(event.responseId); setStatus("thinking"); }
        if (event.type === "input-transcription-completed" && event.transcript) latest.current.onEvent({ kind: "voice", message: `You: ${event.transcript}` });
        if (event.type === "audio-transcript-done" && event.transcript) latest.current.onEvent({ kind: "voice", message: event.transcript });
        if (event.type === "session-created") {
          const raw = rawObject(event.raw);
          const providerSession = rawObject(raw?.session);
          if (typeof providerSession?.model === "string") connection.reportedModel = providerSession.model;
        }
        const completed = responses.receive(event);
        if (completed) {
          latest.current.onEvent({ kind: "voice", message: `Voice response ${completed.status ?? "finished"}.`, detail: { route: "AI Gateway", transport: "WebSocket", requestedModel: connection.model, reportedModel: connection.reportedModel ?? null, servingProvider: null, responseId: completed.id, status: completed.status, usage: completed.usage ?? null } });
          void commands.accept(completed).catch(() => fail(connection, "The voice request could not finish. Please reconnect."));
          if (completed.status !== "completed") setStatus("listening");
        }
      };
      connection.session = new BrowserVoiceSession({
        model, api: { websocket: socket.url, protocols: socket.protocols }, sessionConfig: setup.sessionConfig,
        maxEvents: 40,
        // The completed-response coordinator, not this eager tool callback,
        // owns mutations and places spoken confirmation after the save.
        onToolCall: () => undefined,
        onEvent: handleEvent,
        onError: (cause) => {
          if (cause.message.startsWith("Failed to parse tool arguments:")) return;
          fail(connection, "Voice could not continue through AI Gateway. Please reconnect.");
        },
      }, (state) => {
        if (!isActive()) return;
        if (state.status === "connected" && !connection.ready) {
          connection.ready = true;
          connection.session?.startAudioCapture(microphone);
          setStatus("listening");
          latest.current.onEvent({ kind: "voice", message: "Voice connected through AI Gateway. Listening.", detail: { route: "AI Gateway", transport: "WebSocket", requestedModel: connection.model, servingProvider: null } });
          const scene = latest.current.scene;
          if (scene?.id === connection.sceneId && scene.revision > connection.revision) sendScene(connection, scene);
          connection.sessionTimer = setTimeout(() => fail(connection, "The five-minute demo voice session ended. Start voice again to continue."), MAX_SESSION_MS);
        }
        if (state.status === "error" || state.status === "disconnected") fail(connection, "Voice connection ended. Start voice again to reconnect.");
        if (state.isPlaying) setStatus("speaking");
        else if (state.status === "connected" && state.isCapturing) setStatus((previous) => previous === "speaking" ? "listening" : previous);
      });
      await connection.session.connect({ capture: false });
      if (!isActive()) return;
      await connection.session.resumePlayback();

      // Metering is decorative; SDK capture and playback remain independent.
      try {
        const context = new AudioContext(); connection.audioContext = context;
        const analyser = context.createAnalyser(); analyser.fftSize = 256;
        context.createMediaStreamSource(microphone).connect(analyser);
        const samples = new Uint8Array(analyser.fftSize); let lastUpdate = 0;
        const meter = () => {
          if (!isActive()) return;
          if (performance.now() - lastUpdate >= 50) {
            lastUpdate = performance.now(); analyser.getByteTimeDomainData(samples);
            const rms = Math.sqrt(samples.reduce((sum, value) => sum + ((value - 128) / 128) ** 2, 0) / samples.length);
            const next = Math.min(1, rms * 5);
            setLevel((previous) => Math.abs(previous - next) < .01 ? previous : next);
          }
          connection.frame = requestAnimationFrame(meter);
        };
        void context.resume().then(meter).catch(() => undefined);
      } catch { /* SDK audio is unaffected if the optional meter fails. */ }
    } catch (cause) {
      if (!isActive()) return;
      fail(connection, cause instanceof DOMException && cause.name === "NotAllowedError" ? "Microphone permission was denied. Allow microphone access, then start voice again." : cause instanceof DOMException && cause.name === "TimeoutError" ? "Voice setup timed out. Start voice again to reconnect." : cause instanceof Error ? cause.message : "Voice could not connect. Please try again.");
    }
  }, [fail]);

  useEffect(() => {
    const connection = active.current;
    if (!connection) return;
    if (!options.enabled || !options.scene || options.scene.id !== connection.sceneId) { stop(); return; }
    if (options.scene.revision !== connection.revision) sendScene(connection, options.scene);
  }, [options.enabled, options.scene, stop]);
  useEffect(() => () => { const connection = active.current; active.current = null; if (connection) release(connection); }, []);
  return { status, start, stop, error, level };
}
