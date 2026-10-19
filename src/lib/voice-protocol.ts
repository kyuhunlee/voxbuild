import { z } from "zod";
import { OperationsSchema, type Operation, type Scene } from "./schema";

export type RealtimeResponse = {
  id?: string;
  status?: string;
  metadata?: Record<string, string> | null;
  usage?: unknown;
  output?: {
    type?: string;
    status?: string;
    name?: string;
    call_id?: string;
    arguments?: string;
  }[];
};

type ToolResult = { ok: boolean; message: string; scene: Scene | null };
type CoordinatorOptions = {
  isConnected: () => boolean;
  currentScene: () => Scene | null;
  commandId: () => string;
  execute: (operations: Operation[], commandId: string) => Promise<{ scene: Scene; message: string }>;
  onBusy: () => void;
  onResult: (callId: string, result: ToolResult) => void;
  onScene: (scene: Scene) => void;
  onError: (message: string) => void;
  onSpeak: (hadToolCall: boolean) => void;
};

const ArgumentsSchema = z.object({ operations: OperationsSchema }).strict();

/** Serializes completed calls and places the audio continuation after the server acknowledgement. */
export class RealtimeCommandQueue {
  private calls = new Set<string>();
  private responses = new Set<string>();
  private queue: Promise<void> = Promise.resolve();
  private turn = 0;

  constructor(private readonly options: CoordinatorOptions) {}

  interrupt() { this.turn += 1; }

  accept(response: RealtimeResponse): Promise<void> {
    if (!response.id || this.responses.has(response.id)) return Promise.resolve();
    this.responses.add(response.id);
    if (response.status !== "completed" || response.metadata?.phase === "speech") return Promise.resolve();
    const calls = (Array.isArray(response.output) ? response.output : [])
      .filter((item) => item.type === "function_call" && item.status === "completed");
    const turn = this.turn;
    this.queue = this.queue.then(async () => {
      if (!this.options.isConnected() || this.turn !== turn) return;
      let newCalls = 0;
      for (const call of calls) {
        if (!call.call_id || this.calls.has(call.call_id)) continue;
        this.calls.add(call.call_id);
        newCalls += 1;
        let result: ToolResult;
        try {
          if (this.turn !== turn) throw new Error("The remaining edits were interrupted and were not applied.");
          if (call.name !== "apply_scene_operations") throw new Error("This voice tool is not supported.");
          if (!call.arguments || call.arguments.length > 30_000) throw new Error("The requested room edit was too large.");
          let args: unknown;
          try { args = JSON.parse(call.arguments); }
          catch { throw new Error("The requested room edit was not valid. Try a simpler instruction."); }
          const parsed = ArgumentsSchema.safeParse(args);
          if (!parsed.success) throw new Error("The requested room edit was not valid. Try a simpler instruction.");
          this.options.onBusy();
          const accepted = await this.options.execute(parsed.data.operations, this.options.commandId());
          result = { ok: true, ...accepted };
          if (this.options.isConnected()) this.options.onScene(accepted.scene);
        } catch (cause) {
          const message = cause instanceof Error ? cause.message : "The room edit could not be saved. Please try again.";
          result = { ok: false, message, scene: this.options.currentScene() };
          if (this.options.isConnected()) this.options.onError(message);
        }
        if (!this.options.isConnected()) return;
        this.options.onResult(call.call_id, result);
      }
      if (!this.options.isConnected() || this.turn !== turn) return;
      // A duplicate call in a different response must not trigger another mutation or confirmation.
      if (calls.length && !newCalls) return;
      this.options.onSpeak(calls.length > 0);
    });
    return this.queue;
  }
}
