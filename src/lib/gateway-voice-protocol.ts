import type { Experimental_RealtimeServerEvent } from "ai";
import type { RealtimeResponse } from "./voice-protocol";

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

/** Converts completed normalized Gateway turns into the validated command queue contract. */
export class GatewayVoiceResponses {
  private calls = new Map<string, NonNullable<RealtimeResponse["output"]>>();
  private speechResponses = new Set<string>();
  private speechPending = false;

  expectSpeech() { this.speechPending = true; }
  interrupt() { this.speechPending = false; }

  receive(event: Experimental_RealtimeServerEvent): RealtimeResponse | null {
    const raw = object(event.raw);
    const response = object(raw?.response);
    const metadata = object(response?.metadata);
    if (event.type === "response-created") {
      if (metadata?.phase === "speech" || this.speechPending) this.speechResponses.add(event.responseId);
      this.speechPending = false;
      return null;
    }
    if (event.type === "function-call-arguments-done") {
      const calls = this.calls.get(event.responseId) ?? [];
      if (!calls.some((call) => call.call_id === event.callId)) calls.push({
        type: "function_call", status: "completed", name: event.name, call_id: event.callId, arguments: event.arguments,
      });
      this.calls.set(event.responseId, calls);
      return null;
    }
    if (event.type !== "response-done") return null;
    const speech = metadata?.phase === "speech" || this.speechResponses.has(event.responseId);
    const output = this.calls.get(event.responseId) ?? [];
    this.calls.delete(event.responseId);
    this.speechResponses.delete(event.responseId);
    return {
      id: event.responseId, status: event.status, output,
      ...(speech ? { metadata: { phase: "speech" } } : {}),
      ...(response?.usage !== undefined ? { usage: response.usage } : {}),
    };
  }
}
