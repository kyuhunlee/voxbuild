import assert from "node:assert/strict";
import test from "node:test";
import { createScene } from "../src/lib/presets";
import type { Operation, Scene } from "../src/lib/schema";
import { RealtimeCommandQueue, type RealtimeResponse } from "../src/lib/voice-protocol";

const move: Operation = { type: "move", objectId: "studio-sofa", position: [-0.4, 0, -1.75] };
const scene = createScene("voice-test");
const saved = { scene: { ...scene, revision: 1 }, message: "Saved the new sofa position." };

function response(id = "response-1", callId = "call-1"): RealtimeResponse {
  return { id, status: "completed", output: [{ type: "function_call", status: "completed", name: "apply_scene_operations", call_id: callId, arguments: JSON.stringify({ operations: [move] }) }] };
}

function harness(execute?: (operations: Operation[], commandId: string) => Promise<{ scene: Scene; message: string }>) {
  const events: { kind: string; data?: unknown }[] = [];
  let connected = true;
  const queue = new RealtimeCommandQueue({
    isConnected: () => connected,
    currentScene: () => scene,
    commandId: () => "command-test",
    execute: async (operations, commandId) => {
      events.push({ kind: "execute", data: { operations, commandId } });
      return execute ? execute(operations, commandId) : saved;
    },
    onBusy: () => events.push({ kind: "busy" }),
    onScene: (scene) => events.push({ kind: "scene", data: scene }),
    onResult: (callId, result) => events.push({ kind: "result", data: { callId, ...result } }),
    onError: (message) => events.push({ kind: "error", data: message }),
    onSpeak: (hadToolCall) => events.push({ kind: "speak", data: hadToolCall }),
  });
  return { queue, events, disconnect: () => { connected = false; } };
}

test("spoken confirmation follows the acknowledged scene and correlated tool result", async () => {
  let acknowledge!: (value: typeof saved) => void;
  const pending = new Promise<typeof saved>((resolve) => { acknowledge = resolve; });
  const { queue, events } = harness(() => pending);
  const completed = queue.accept(response());
  await Promise.resolve();
  assert.deepEqual(events.map((event) => event.kind), ["busy", "execute"]);
  acknowledge(saved);
  await completed;
  assert.deepEqual(events.map((event) => event.kind), ["busy", "execute", "scene", "result", "speak"]);
  assert.deepEqual(events.find((event) => event.kind === "result")?.data, { callId: "call-1", ok: true, ...saved });
});

test("duplicate responses and repeated call IDs never apply or confirm twice", async () => {
  const { queue, events } = harness();
  await queue.accept(response());
  await queue.accept(response());
  await queue.accept(response("response-2", "call-1"));
  assert.equal(events.filter((event) => event.kind === "execute").length, 1);
  assert.equal(events.filter((event) => event.kind === "speak").length, 1);
});

test("cancelled, failed, and incomplete responses never mutate the room", async () => {
  const { queue, events } = harness();
  for (const status of ["cancelled", "failed", "incomplete"]) await queue.accept({ ...response(status), status });
  assert.deepEqual(events, []);
});

test("a completed spoken continuation does not create an infinite response loop", async () => {
  const { queue, events } = harness();
  await queue.accept({ ...response(), metadata: { phase: "speech" } });
  assert.deepEqual(events, []);
});

test("invalid completed tool arguments produce an error output without running the executor", async () => {
  const { queue, events } = harness();
  const invalid = response();
  invalid.output![0].arguments = JSON.stringify({ operations: [{ type: "execute", code: "alert(1)" }] });
  await queue.accept(invalid);
  assert.equal(events.some((event) => event.kind === "execute"), false);
  assert.equal(events.some((event) => event.kind === "scene"), false);
  assert.equal((events.find((event) => event.kind === "result")?.data as { ok: boolean }).ok, false);
});

test("save failure returns failure, keeps the current scene, and then requests an explanation", async () => {
  const { queue, events } = harness(async () => { throw new Error("The scene changed. Try again."); });
  await queue.accept(response());
  assert.equal(events.some((event) => event.kind === "scene"), false);
  assert.deepEqual(events.find((event) => event.kind === "result")?.data, {
    callId: "call-1", ok: false, message: "The scene changed. Try again.", scene,
  });
  assert.equal(events.at(-1)?.kind, "speak");
});

test("barge-in drops edits that have not started executing", async () => {
  const { queue, events } = harness();
  const completed = queue.accept(response());
  queue.interrupt();
  await completed;
  assert.deepEqual(events, []);
});

test("barge-in during a save preserves the acknowledged result but suppresses stale speech", async () => {
  let acknowledge!: (value: typeof saved) => void;
  const pending = new Promise<typeof saved>((resolve) => { acknowledge = resolve; });
  const { queue, events } = harness(() => pending);
  const completed = queue.accept(response());
  await Promise.resolve();
  queue.interrupt();
  acknowledge(saved);
  await completed;
  assert.equal(events.some((event) => event.kind === "result"), true);
  assert.equal(events.some((event) => event.kind === "speak"), false);
});

test("disconnect during a save sends no stale result or audio to a later session", async () => {
  let acknowledge!: (value: typeof saved) => void;
  const pending = new Promise<typeof saved>((resolve) => { acknowledge = resolve; });
  const { queue, events, disconnect } = harness(() => pending);
  const completed = queue.accept(response());
  await Promise.resolve();
  disconnect();
  acknowledge(saved);
  await completed;
  assert.deepEqual(events.map((event) => event.kind), ["busy", "execute"]);
});

test("successive completed calls execute serially", async () => {
  let acknowledge!: (value: typeof saved) => void;
  const pending = new Promise<typeof saved>((resolve) => { acknowledge = resolve; });
  const { queue, events } = harness(() => pending);
  const first = queue.accept(response());
  const second = queue.accept(response("response-2", "call-2"));
  await Promise.resolve();
  assert.equal(events.filter((event) => event.kind === "execute").length, 1);
  acknowledge(saved);
  await Promise.all([first, second]);
  assert.equal(events.filter((event) => event.kind === "execute").length, 2);
});
