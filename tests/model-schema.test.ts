import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import { zodSchema } from "ai";
import { ModelOperationSchema, ModelPlanSchema, ModelToolSchema } from "../src/lib/model-schema";
import { OperationsSchema } from "../src/lib/schema";
import { applyOperations, DomainError } from "../src/lib/scene-engine";
import { createScene } from "../src/lib/presets";

const addChair = { type: "add", sku: "arc-chair", position: [0, 0, 0], rotation: 0, color: "#687761" };

test("provider schemas use anyOf and omit unsupported or expensive constraints", () => {
  for (const schema of [ModelOperationSchema, ModelPlanSchema, ModelToolSchema]) {
    const converted = z.toJSONSchema(schema);
    const keys: string[] = [];
    function collect(value: unknown): void {
      if (Array.isArray(value)) { value.forEach(collect); return; }
      if (value && typeof value === "object") {
        for (const [key, nested] of Object.entries(value)) { keys.push(key); collect(nested); }
      }
    }
    collect(converted);
    assert.equal(keys.includes("anyOf"), true);
    for (const forbidden of ["oneOf", "prefixItems", "pattern", "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "minItems", "maxItems", "minLength", "maxLength"]) {
      assert.equal(keys.includes(forbidden), false, `Provider schema contains ${forbidden}`);
    }
    assert.equal(JSON.stringify(converted).includes('"additionalProperties":false'), true);
  }
});

test("AI SDK provider conversion also preserves anyOf and homogeneous arrays", async () => {
  const converted = await zodSchema(ModelPlanSchema).jsonSchema;
  const serialized = JSON.stringify(converted);
  assert.equal(serialized.includes('"anyOf"'), true);
  assert.equal(serialized.includes('"oneOf"'), false);
  assert.equal(serialized.includes('"prefixItems"'), false);
  assert.equal(serialized.includes('"pattern"'), false);
});

test("valid wire operations pass independent domain validation", () => {
  const plan = ModelPlanSchema.parse({ message: "Add a sage chair.", operations: [addChair] });
  const operations = OperationsSchema.parse(plan.operations);
  const scene = applyOperations(createScene("model-test", "empty"), operations, { idFactory: () => "new-chair" });
  assert.equal(scene.objects[0].sku, "arc-chair");
  assert.equal(scene.revision, 1);
});

test("domain validation rejects loose wire coordinates, IDs, colors, rotations, and counts", () => {
  const malformed = [
    [{ ...addChair, position: [0, 0] }],
    [{ ...addChair, position: [0, 0, 0, 0] }],
    [{ ...addChair, position: [101, 0, 0] }],
    [{ ...addChair, rotation: 90 }],
    [{ ...addChair, color: "blue" }],
    [{ type: "remove", objectId: "../invalid-id" }],
    [{ type: "set_environment", environmentId: "invented-style" }],
    [],
    Array.from({ length: 13 }, () => addChair),
  ];
  for (const operations of malformed) {
    const tool = ModelToolSchema.parse({ operations });
    assert.equal(OperationsSchema.safeParse(tool.operations).success, false);
  }
});

test("provider style operations pass domain validation without introducing new scene fields", () => {
  const plan = ModelPlanSchema.parse({ message: "Use the midnight room style.", operations: [{ type: "set_environment", environmentId: "midnight" }] });
  const before = createScene("model-style-test");
  const after = applyOperations(before, OperationsSchema.parse(plan.operations));
  assert.equal(after.room.wallColor, "#323c50");
  assert.deepEqual(after.objects, before.objects);
  assert.deepEqual(Object.keys(after.room), Object.keys(before.room));
});

test("catalog and room semantics remain enforced after provider and domain parsing", () => {
  const scene = createScene("model-test", "empty");
  const malformed = [
    { operation: { ...addChair, sku: "invented-chair" }, code: "UNKNOWN_SKU" },
    { operation: { ...addChair, color: "#ff00ff" }, code: "INVALID_COLOR" },
    { operation: { ...addChair, position: [4, 0, 0] }, code: "OUT_OF_BOUNDS" },
  ];
  for (const entry of malformed) {
    const tool = ModelToolSchema.parse({ operations: [entry.operation] });
    const operations = OperationsSchema.parse(tool.operations);
    assert.throws(() => applyOperations(scene, operations), (error) => error instanceof DomainError && error.code === entry.code);
  }
  assert.equal(scene.revision, 0);
  assert.equal(scene.objects.length, 0);
});
