import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import { parseGeneratedPlan } from "../src/lib/server/scene-plan";
import { errorResponse, HttpError } from "../src/lib/server/errors";
import { DomainError } from "../src/lib/scene-engine";

test("valid generated edits retain the strict domain operations", () => {
  const operations = [{ type: "recolor", objectId: "studio-plant", color: "#e7dfce" }];
  assert.deepEqual(parseGeneratedPlan({ message: "Use a cream pot.", operations }), { message: "Use a cream pot.", operations });
});

test("questions and clarifications remain valid without inventing an edit", () => {
  assert.deepEqual(parseGeneratedPlan({ message: "Which painting should I move?", operations: [] }), { message: "Which painting should I move?", operations: [] });
});

test("invalid generated plans are upstream failures rather than malformed user requests", async () => {
  const invalidOutputs = [
    undefined,
    { message: "Missing hex prefix.", operations: [{ type: "recolor", objectId: "studio-plant", color: "e7dfce" }] },
    { message: "Invalid coordinates.", operations: [{ type: "move", objectId: "studio-sofa", position: [1, 0] }] },
    { message: "Too many edits.", operations: Array.from({ length: 13 }, () => ({ type: "remove", objectId: "studio-plant" })) },
  ];
  for (const output of invalidOutputs) {
    let rejected: unknown;
    try { parseGeneratedPlan(output); } catch (error) { rejected = error; }
    assert.ok(rejected instanceof HttpError);
    const response = errorResponse(rejected);
    assert.equal(response.status, 502);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    const body = await response.json();
    assert.equal(body.code, "INVALID_MODEL_OUTPUT");
    assert.match(body.error, /nothing was saved/);
  }
});

test("client validation and domain failures keep their status and disable caching", async () => {
  const malformedRequest = z.object({ prompt: z.string() }).safeParse({ prompt: 4 });
  assert.equal(malformedRequest.success, false);
  const requestResponse = errorResponse(malformedRequest.error);
  assert.equal(requestResponse.status, 400);
  assert.equal(requestResponse.headers.get("Cache-Control"), "no-store");
  assert.equal((await requestResponse.json()).code, "INVALID_REQUEST");
  const domainResponse = errorResponse(new DomainError("OUT_OF_BOUNDS", "Keep the sofa inside the room."));
  assert.equal(domainResponse.status, 422);
  assert.equal(domainResponse.headers.get("Cache-Control"), "no-store");
  assert.equal((await domainResponse.json()).code, "OUT_OF_BOUNDS");
});
