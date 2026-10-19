import assert from "node:assert/strict";
import test from "node:test";
import { createSceneRepository, RECEIPT_LIMIT, type SceneCollectionPort, type StoredScene } from "../src/lib/server/store";
import { HttpError } from "../src/lib/server/errors";
import type { CommandBatch, Operation } from "../src/lib/schema";

/** A Mongo-shaped atomic collection double. Concurrent callers yield on reads,
 * but the conditional update is indivisible, as on a single Mongo document. */
function fakeCollection() {
  const documents = new Map<string, StoredScene>();
  let failWrites = false;
  let loseAcknowledgement = false;
  let successfulUpdates = 0;
  const collection: SceneCollectionPort = {
    async findOne(filter) {
      const document = documents.get(filter._id);
      return document?.ownerId === filter.ownerId ? structuredClone(document) : null;
    },
    async insertOne(document) { documents.set(document._id, structuredClone(document)); },
    async findOneAndUpdate(filter, update) {
      if (failWrites) throw new Error("database unavailable");
      const document = documents.get(filter._id);
      if (!document || document.ownerId !== filter.ownerId || document.revision !== filter.revision || document.receipts.some((receipt) => receipt.commandId === filter["receipts.commandId"].$ne)) return null;
      const next = {
        ...document,
        ...structuredClone(update.$set),
        receipts: [...document.receipts, ...structuredClone(update.$push.receipts.$each)].slice(update.$push.receipts.$slice),
      };
      documents.set(document._id, next);
      successfulUpdates += 1;
      if (loseAcknowledgement) { loseAcknowledgement = false; throw new Error("connection lost after commit"); }
      return structuredClone(next);
    },
    async listOwned(ownerId) {
      return [...documents.values()].filter((document) => document.ownerId === ownerId).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)).slice(0, 10).map((document) => structuredClone(document));
    },
  };
  return {
    repository: createSceneRepository(collection), documents,
    failWrites: () => { failWrites = true; },
    loseNextAcknowledgement: () => { loseAcknowledgement = true; },
    successfulUpdates: () => successfulUpdates,
  };
}

const addChair: Operation = { type: "add", sku: "arc-chair", position: [0, 0, 0], rotation: 0, color: "#687761" };
const hasCode = (code: string) => (error: unknown) => error instanceof HttpError && error.code === code;
const command = (sceneId: string, commandId = "command-1", expectedRevision = 0): CommandBatch => ({ sceneId, commandId, expectedRevision, operations: [addChair] });

test("scenes are isolated by owner and private storage metadata never leaves the repository", async () => {
  const { repository } = fakeCollection();
  const scene = await repository.createStoredScene("owner-a", "empty");
  assert.equal(await repository.getScene("owner-b", scene.id), null);
  assert.deepEqual(await repository.listScenes("owner-b"), []);
  await assert.rejects(repository.applyCommand("owner-b", command(scene.id)), hasCode("SCENE_NOT_FOUND"));
  const saved = await repository.getScene("owner-a", scene.id);
  assert.equal("ownerId" in saved!, false);
  assert.equal("receipts" in saved!, false);
  assert.equal("_id" in saved!, false);
});

test("duplicate retries cause one mutation and return the current canonical scene", async () => {
  const { repository, successfulUpdates } = fakeCollection();
  const scene = await repository.createStoredScene("owner-a", "empty");
  const first = command(scene.id);
  const accepted = await repository.applyCommand("owner-a", first);
  assert.equal(accepted.duplicate, false);
  await repository.applyCommand("owner-a", command(scene.id, "command-2", 1));
  const duplicate = await repository.applyCommand("owner-a", first);
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.scene.revision, 2);
  assert.equal(duplicate.scene.objects.length, 2);
  assert.equal(successfulUpdates(), 2);
  await assert.rejects(repository.applyCommand("owner-a", { ...first, operations: [{ ...addChair, color: "#446a87" }] }), hasCode("COMMAND_ID_REUSED"));
});

test("two concurrent deliveries of the same command accept exactly once", async () => {
  const { repository, successfulUpdates } = fakeCollection();
  const scene = await repository.createStoredScene("owner-a", "empty");
  const results = await Promise.all([repository.applyCommand("owner-a", command(scene.id)), repository.applyCommand("owner-a", command(scene.id))]);
  assert.deepEqual(results.map((result) => result.duplicate).sort(), [false, true]);
  assert.equal(successfulUpdates(), 1);
  assert.equal((await repository.getScene("owner-a", scene.id))?.objects.length, 1);
});

test("competing edits from the same revision cannot overwrite each other", async () => {
  const { repository, successfulUpdates } = fakeCollection();
  const scene = await repository.createStoredScene("owner-a", "empty");
  const results = await Promise.allSettled([repository.applyCommand("owner-a", command(scene.id, "one")), repository.applyCommand("owner-a", command(scene.id, "two"))]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  const rejected = results.find((result) => result.status === "rejected") as PromiseRejectedResult;
  assert.equal(hasCode("REVISION_CONFLICT")(rejected.reason), true);
  assert.equal(successfulUpdates(), 1);
  assert.equal((await repository.getScene("owner-a", scene.id))?.revision, 1);
});

test("a lost acknowledgement can be retried without duplicating committed furniture", async () => {
  const storage = fakeCollection();
  const scene = await storage.repository.createStoredScene("owner-a", "empty");
  storage.loseNextAcknowledgement();
  await assert.rejects(storage.repository.applyCommand("owner-a", command(scene.id)), /connection lost/);
  const result = await storage.repository.applyCommand("owner-a", command(scene.id));
  assert.equal(result.duplicate, true);
  assert.equal(result.scene.objects.length, 1);
  assert.equal(storage.successfulUpdates(), 1);
});

test("database failures do not acknowledge or fabricate accepted scene changes", async () => {
  const storage = fakeCollection();
  const scene = await storage.repository.createStoredScene("owner-a", "empty");
  storage.failWrites();
  await assert.rejects(storage.repository.applyCommand("owner-a", command(scene.id)), /database unavailable/);
  assert.equal((await storage.repository.getScene("owner-a", scene.id))?.revision, 0);
  assert.equal((await storage.repository.getScene("owner-a", scene.id))?.objects.length, 0);
});

test("invalid commands never reach the atomic database update", async () => {
  const storage = fakeCollection();
  const scene = await storage.repository.createStoredScene("owner-a", "empty");
  await assert.rejects(storage.repository.applyCommand("owner-a", { ...command(scene.id), operations: [{ ...addChair, position: [20, 0, 0] }] }));
  assert.equal(storage.successfulUpdates(), 0);
});

test("resets preserve identity, advance revision, and share deduplication guarantees", async () => {
  const { repository } = fakeCollection();
  const scene = await repository.createStoredScene("owner-a", "studio");
  const reset = await repository.resetScene("owner-a", scene.id, "empty", 0, "reset-1");
  assert.equal(reset.scene.id, scene.id);
  assert.equal(reset.scene.revision, 1);
  assert.equal(reset.scene.objects.length, 0);
  const duplicate = await repository.resetScene("owner-a", scene.id, "empty", 0, "reset-1");
  assert.equal(duplicate.duplicate, true);
  await assert.rejects(repository.resetScene("owner-a", scene.id, "loft", 0, "reset-1"), hasCode("COMMAND_ID_REUSED"));
});

test("receipts remain bounded and an evicted original retry fails its revision precondition", async () => {
  const storage = fakeCollection();
  const scene = await storage.repository.createStoredScene("owner-a", "studio");
  const first: CommandBatch = { sceneId: scene.id, commandId: "color-0", expectedRevision: 0, operations: [{ type: "recolor", objectId: "studio-sofa", color: "#687761" }] };
  for (let revision = 0; revision <= RECEIPT_LIMIT; revision += 1) {
    await storage.repository.applyCommand("owner-a", { ...first, commandId: `color-${revision}`, expectedRevision: revision });
  }
  assert.equal(storage.documents.get(scene.id)?.receipts.length, RECEIPT_LIMIT);
  assert.equal(storage.documents.get(scene.id)?.receipts.some((receipt) => receipt.commandId === first.commandId), false);
  await assert.rejects(storage.repository.applyCommand("owner-a", first), hasCode("REVISION_CONFLICT"));
});
