import assert from "node:assert/strict";
import { test } from "node:test";
import type { Experimental_RealtimeServerEvent } from "ai";
import { GatewayVoiceResponses } from "../src/lib/gateway-voice-protocol";
import { RealtimeCommandQueue } from "../src/lib/voice-protocol";
import { createScene } from "../src/lib/presets";

const argumentsEvent = (responseId = "response-edit"): Experimental_RealtimeServerEvent => ({
  type: "function-call-arguments-done", responseId, itemId: "item-edit", callId: "call-edit", name: "apply_scene_operations",
  arguments: JSON.stringify({ operations: [{ type: "set_environment", environmentId: "midnight" }] }), raw: {},
});
const done = (responseId: string, status = "completed", raw: unknown = {}): Experimental_RealtimeServerEvent => ({ type: "response-done", responseId, status, raw });

test("Gateway streamed arguments do not become executable before a completed response", () => {
  const adapter = new GatewayVoiceResponses();
  assert.equal(adapter.receive({ type: "function-call-arguments-delta", responseId: "response-edit", itemId: "item-edit", callId: "call-edit", delta: "{", raw: {} }), null);
  assert.equal(adapter.receive(argumentsEvent()), null);
  const completed = adapter.receive(done("response-edit"))!;
  assert.equal(completed.status, "completed");
  assert.equal(completed.output?.length, 1);
  assert.equal(completed.output?.[0].call_id, "call-edit");
  assert.deepEqual(JSON.parse(completed.output![0].arguments!), { operations: [{ type: "set_environment", environmentId: "midnight" }] });
});

test("Gateway terminal status is preserved so cancellation never executes accumulated calls", async () => {
  const adapter = new GatewayVoiceResponses();
  const scene = createScene("gateway-voice-test", "studio");
  let mutations = 0;
  const queue = new RealtimeCommandQueue({
    isConnected: () => true, currentScene: () => scene, commandId: () => "command-test",
    execute: async () => { mutations++; return { scene, message: "Saved" }; },
    onBusy() {}, onResult() {}, onScene() {}, onError() {}, onSpeak() {},
  });
  queue.responseStarted("response-edit");
  adapter.receive(argumentsEvent());
  await queue.accept(adapter.receive(done("response-edit", "cancelled"))!);
  assert.equal(mutations, 0);
});

test("speech-phase tool output cannot mutate a room or start another audio continuation", async () => {
  const adapter = new GatewayVoiceResponses();
  const scene = createScene("gateway-voice-test", "studio");
  let mutations = 0; let continuations = 0;
  const queue = new RealtimeCommandQueue({
    isConnected: () => true, currentScene: () => scene, commandId: () => "command-test",
    execute: async () => { mutations++; return { scene, message: "Saved" }; },
    onBusy() {}, onResult() {}, onScene() {}, onError() {}, onSpeak() { continuations++; },
  });
  adapter.expectSpeech();
  adapter.receive({ type: "response-created", responseId: "speech-response", raw: {} });
  adapter.receive(argumentsEvent("speech-response"));
  const completed = adapter.receive(done("speech-response"))!;
  assert.equal(completed.metadata?.phase, "speech");
  await queue.accept(completed);
  assert.equal(mutations, 0);
  assert.equal(continuations, 0);
});

test("echoed speech metadata remains authoritative after a barge-in clears pending speech", () => {
  const adapter = new GatewayVoiceResponses();
  adapter.expectSpeech(); adapter.interrupt();
  adapter.receive({ type: "response-created", responseId: "new-user-response", raw: {} });
  assert.equal(adapter.receive(done("new-user-response"))?.metadata, undefined);
  assert.equal(adapter.receive(done("late-speech", "completed", { response: { metadata: { phase: "speech" } } }))?.metadata?.phase, "speech");
});

test("duplicate argument events are one call and returned usage survives normalization", () => {
  const adapter = new GatewayVoiceResponses();
  adapter.receive(argumentsEvent()); adapter.receive(argumentsEvent());
  const usage = { input_tokens: 25, output_tokens: 7 };
  const response = adapter.receive(done("response-edit", "completed", { response: { usage } }))!;
  assert.equal(response.output?.length, 1);
  assert.deepEqual(response.usage, usage);
  assert.deepEqual(adapter.receive(done("another-read-only-response"))?.output, []);
});
