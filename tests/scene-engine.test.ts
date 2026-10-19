import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import { CATALOG } from "../src/lib/catalog-data";
import { createScene, PRESETS, PRESET_IDS, PresetIdSchema } from "../src/lib/presets";
import { ENVIRONMENTS, getEnvironmentForRoom } from "../src/lib/environments";
import { applyOperations, DomainError } from "../src/lib/scene-engine";
import { CommandBatchSchema, OperationsSchema, SceneSchema, type Operation } from "../src/lib/schema";

const fixedNow = () => new Date("2026-10-19T12:00:00.000Z");
const addChair: Operation = { type: "add", sku: "arc-chair", position: [0, 0, 0], rotation: 0, color: "#687761" };
const hasCode = (code: string) => (error: unknown) => error instanceof DomainError && error.code === code;

test("an accepted batch increments one revision and preserves IDs and source state", () => {
  const before = createScene("scene-test");
  const original = structuredClone(before);
  const after = applyOperations(before, [
    { type: "move", objectId: "studio-sofa", position: [-0.4, 0, -1.75] },
    { type: "recolor", objectId: "studio-sofa", color: "#446a87" },
  ], { now: fixedNow });
  assert.equal(after.revision, 1);
  assert.equal(after.updatedAt, fixedNow().toISOString());
  assert.deepEqual(after.objects.map((object) => object.id), original.objects.map((object) => object.id));
  assert.deepEqual(after.objects.find((object) => object.id === "studio-sofa")?.position, [-0.4, 0, -1.75]);
  assert.equal(after.objects.find((object) => object.id === "studio-sofa")?.color, "#446a87");
  assert.deepEqual(before, original);
});

test("failed batches are atomic even after a valid earlier operation", () => {
  const before = createScene("scene-test");
  const original = structuredClone(before);
  assert.throws(() => applyOperations(before, [
    { type: "remove", objectId: "studio-table" },
    { type: "move", objectId: "studio-sofa", position: [3, 0, 0] },
  ]), hasCode("OUT_OF_BOUNDS"));
  assert.deepEqual(before, original);
});

test("dimensions come from catalog; rotated bounds include the full object", () => {
  const scene = createScene("scene-test", "empty");
  const desk: Operation = { type: "add", sku: "line-desk", position: [0, 0, 2.2], rotation: 0, color: "#d8bc91" };
  const after = applyOperations(scene, [desk], { idFactory: () => "new-desk" });
  assert.throws(() => applyOperations(after, [{ type: "rotate", objectId: "new-desk", rotation: Math.PI / 2 }]), hasCode("OUT_OF_BOUNDS"));
  assert.equal(after.objects[0].rotation, 0);
});

test("rejects below-floor and above-ceiling placement", () => {
  const scene = createScene("scene-test", "empty");
  assert.throws(() => applyOperations(scene, [{ ...addChair, position: [0, -0.1, 0] }]), hasCode("OUT_OF_BOUNDS"));
  assert.throws(() => applyOperations(scene, [{ ...addChair, position: [0, 2.5, 0] }]), hasCode("OUT_OF_BOUNDS"));
});

test("rejects unknown SKUs, unsupported colors, and nonexistent object targets", () => {
  const scene = createScene("scene-test", "empty");
  assert.throws(() => applyOperations(scene, [{ ...addChair, sku: "invented-sofa" }]), hasCode("UNKNOWN_SKU"));
  assert.throws(() => applyOperations(scene, [{ ...addChair, color: "#ff00ff" }]), hasCode("INVALID_COLOR"));
  assert.throws(() => applyOperations(scene, [{ type: "remove", objectId: "missing" }]), hasCode("OBJECT_NOT_FOUND"));
});

test("new object IDs are generated on the server and must be unique", () => {
  const scene = createScene("scene-test", "empty");
  const after = applyOperations(scene, [addChair], { idFactory: () => "generated-chair" });
  assert.equal(after.objects[0].id, "generated-chair");
  assert.throws(() => applyOperations(after, [addChair], { idFactory: () => "generated-chair" }), hasCode("INVALID_OBJECT_ID"));
  assert.throws(() => applyOperations(scene, [addChair], { idFactory: () => "../bad" }), hasCode("INVALID_OBJECT_ID"));
});

test("commands reject arbitrary properties, non-finite coordinates, and unbounded batches", () => {
  const command = { sceneId: "scene-test", commandId: "command-1", expectedRevision: 0, operations: [addChair] };
  assert.equal(CommandBatchSchema.safeParse(command).success, true);
  assert.equal(CommandBatchSchema.safeParse({ ...command, expectedRevision: -1 }).success, false);
  assert.equal(CommandBatchSchema.safeParse({ ...command, operations: [] }).success, false);
  assert.equal(CommandBatchSchema.safeParse({ ...command, operations: Array.from({ length: 13 }, () => addChair) }).success, false);
  assert.equal(CommandBatchSchema.safeParse({ ...command, operations: [{ ...addChair, code: "execute()" }] }).success, false);
  assert.equal(CommandBatchSchema.safeParse({ ...command, operations: [{ ...addChair, position: [NaN, 0, 0] }] }).success, false);
  assert.equal(CommandBatchSchema.safeParse({ ...command, operations: [{ ...addChair, position: [0, 0] }] }).success, false);
  assert.equal(CommandBatchSchema.safeParse({ ...command, operations: [{ ...addChair, dimensions: [0.01, 0.01, 0.01] }] }).success, false);
});

test("operation schema converts to model-compatible homogeneous array JSON schema", () => {
  const schema = z.toJSONSchema(OperationsSchema);
  const serialized = JSON.stringify(schema);
  assert.equal(serialized.includes("prefixItems"), false);
  assert.equal(serialized.includes('"minItems":3'), true);
  assert.equal(serialized.includes('"maxItems":3'), true);
});

test("furniture may overlap a floor rug; this engine enforces room bounds, not collision physics", () => {
  const scene = createScene("scene-test", "empty");
  let sequence = 0;
  const after = applyOperations(scene, [
    { type: "add", sku: "woven-rug", position: [0, 0, 0], rotation: 0, color: "#e5d6ba" },
    addChair,
  ], { idFactory: () => `added-${++sequence}` });
  assert.equal(after.objects.length, 2);
});

test("all furnished presets fit their rooms and new scenes do not share mutable data", () => {
  for (const preset of PRESETS) {
    const scene = createScene(`test-${preset.id}`, preset.id);
    if (scene.objects.length) {
      const first = scene.objects[0];
      assert.doesNotThrow(() => applyOperations(scene, [{ type: "recolor", objectId: first.id, color: first.color }]));
    }
  }
  const first = createScene("first");
  first.room.width = 20;
  first.objects[0].position[0] = 99;
  const second = createScene("second");
  assert.equal(second.room.width, 6);
  assert.notEqual(second.objects[0].position[0], 99);
  assert.equal(CATALOG.every((item) => item.colors.includes(item.defaultColor)), true);
});

test("all seven new furniture shapes obey their catalog footprint and height", () => {
  const skus = ["haven-bed", "stack-bookcase", "low-sideboard", "gather-table", "pebble-side-table", "cloud-ottoman", "reed-dining-chair"];
  assert.equal(CATALOG.length, 14);
  assert.equal(new Set(CATALOG.map((item) => item.sku)).size, 14);
  for (const sku of skus) {
    const item = CATALOG.find((entry) => entry.sku === sku)!;
    const scene = createScene(`bounds-${sku}`, "empty");
    const operation: Operation = { type: "add", sku, position: [scene.room.width / 2 - item.dimensions[2] / 2, 0, 0], rotation: Math.PI / 2, color: item.defaultColor };
    const accepted = applyOperations(scene, [operation], { idFactory: () => "new-item" });
    assert.equal(accepted.objects[0].sku, sku);
    assert.throws(() => applyOperations(scene, [{ ...operation, position: [operation.position[0] + 0.01, 0, 0] }]), hasCode("OUT_OF_BOUNDS"));
    assert.throws(() => applyOperations(scene, [{ ...operation, position: [0, scene.room.height - item.dimensions[1] + 0.01, 0] }]), hasCode("OUT_OF_BOUNDS"));
  }
});

test("new furnished presets have unique room dimensions and separated furniture", () => {
  assert.deepEqual(PRESETS.map((preset) => preset.id), [...PRESET_IDS]);
  const furnished = PRESETS.filter((preset) => preset.id !== "empty");
  assert.equal(new Set(furnished.map(({ room }) => `${room.width}:${room.depth}:${room.height}`)).size, furnished.length);
  for (const id of ["bedroom", "dining", "lounge"] as const) {
    assert.equal(PresetIdSchema.parse(id), id);
    const scene = createScene(`preset-${id}`, id);
    const bounds = scene.objects.filter((object) => object.sku !== "woven-rug").map((object) => {
      const [width, , depth] = CATALOG.find((item) => item.sku === object.sku)!.dimensions;
      const halfWidth = (width * Math.abs(Math.cos(object.rotation)) + depth * Math.abs(Math.sin(object.rotation))) / 2;
      const halfDepth = (width * Math.abs(Math.sin(object.rotation)) + depth * Math.abs(Math.cos(object.rotation))) / 2;
      return { id: object.id, x: object.position[0], z: object.position[2], halfWidth, halfDepth };
    });
    for (let i = 0; i < bounds.length; i++) for (let j = i + 1; j < bounds.length; j++) {
      const a = bounds[i]; const b = bounds[j];
      assert.ok(Math.abs(a.x - b.x) >= a.halfWidth + b.halfWidth || Math.abs(a.z - b.z) >= a.halfDepth + b.halfDepth, `${a.id} overlaps ${b.id}`);
    }
  }
});

test("each environment changes only the palette while preserving old scene shape and furniture", () => {
  const before = createScene("legacy-scene");
  const original = structuredClone(before);
  for (const environment of ENVIRONMENTS) {
    const after = applyOperations(before, [{ type: "set_environment", environmentId: environment.id }], { now: fixedNow });
    assert.deepEqual(after.room, { ...before.room, wallColor: environment.wallColor, floorColor: environment.floorColor });
    assert.deepEqual(after.objects, before.objects);
    assert.equal(after.schemaVersion, 1);
    assert.equal(after.revision, before.revision + 1);
    assert.equal(after.updatedAt, fixedNow().toISOString());
    assert.equal(getEnvironmentForRoom(after.room).id, environment.id);
    assert.deepEqual(SceneSchema.parse(JSON.parse(JSON.stringify(after))), after);
  }
  assert.deepEqual(before, original);
  for (const [preset, environment] of [["studio", "sunlit"], ["office", "forest"]] as const) {
    assert.equal(getEnvironmentForRoom(createScene(`legacy-${preset}`, preset).room).id, environment);
  }
  assert.equal(getEnvironmentForRoom({ wallColor: "#123456", floorColor: "#654321" }).id, "sunlit");
});

test("environment and furniture edits share one atomic batch and reject invalid style IDs", () => {
  const before = createScene("scene-test");
  const original = structuredClone(before);
  const after = applyOperations(before, [
    { type: "set_environment", environmentId: "midnight" },
    { type: "recolor", objectId: "studio-sofa", color: "#446a87" },
  ]);
  assert.equal(after.revision, 1);
  assert.equal(getEnvironmentForRoom(after.room).id, "midnight");
  assert.equal(after.objects.find((item) => item.id === "studio-sofa")?.color, "#446a87");
  assert.throws(() => applyOperations(before, [
    { type: "set_environment", environmentId: "desert" },
    { type: "move", objectId: "studio-sofa", position: [30, 0, 0] },
  ]), hasCode("OUT_OF_BOUNDS"));
  for (const invalid of [{ type: "set_environment", environmentId: "invented" }, { type: "set_environment", environmentId: "forest", wallColor: "#123456" }]) {
    assert.equal(OperationsSchema.safeParse([invalid]).success, false);
    assert.throws(() => applyOperations(before, [invalid] as Operation[]), hasCode("INVALID_COMMAND"));
  }
  assert.deepEqual(before, original);
});
