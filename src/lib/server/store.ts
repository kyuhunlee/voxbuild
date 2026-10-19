import { createHash, randomUUID } from "node:crypto";
import { MongoClient, type Db } from "mongodb";
import { createScene, PRESETS, type PresetId } from "../presets";
import { applyOperations } from "../scene-engine";
import { CommandBatchSchema, IdSchema, SceneSchema, type CommandBatch, type Scene } from "../schema";
import { HttpError } from "./errors";

/** Receipts and scene state share one atomic document write. Old retries retain
 * their original expectedRevision, so an evicted receipt cannot reapply an edit. */
export const RECEIPT_LIMIT = 128;
export type CommandReceipt = { commandId: string; digest: string; revision: number; acceptedAt: string };
export type StoredScene = Scene & { _id: string; ownerId: string; receipts: CommandReceipt[]; createdAt: string };
type OwnedFilter = { _id: string; ownerId: string };
type CasFilter = OwnedFilter & { revision: number; "receipts.commandId": { $ne: string } };
type CasUpdate = { $set: Scene; $push: { receipts: { $each: CommandReceipt[]; $slice: number } } };

/** Narrow collection port permits deterministic races in tests while production
 * still executes a real MongoDB compare-and-swap operation. */
export type SceneCollectionPort = {
  findOne(filter: OwnedFilter): Promise<StoredScene | null>;
  insertOne(document: StoredScene): Promise<unknown>;
  findOneAndUpdate(filter: CasFilter, update: CasUpdate): Promise<StoredScene | null>;
  listOwned(ownerId: string): Promise<StoredScene[]>;
};

const mongoGlobal = globalThis as typeof globalThis & { voxbuildMongo?: Promise<MongoClient> };

export async function getDatabase(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new HttpError(503, "Saved rooms are unavailable until MongoDB Atlas is configured.", "STORAGE_UNAVAILABLE");
  if (!mongoGlobal.voxbuildMongo) {
    const client = new MongoClient(uri, { maxPoolSize: 5, serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000 });
    mongoGlobal.voxbuildMongo = client.connect().catch(async () => {
      delete mongoGlobal.voxbuildMongo;
      await client.close().catch(() => undefined);
      throw new HttpError(503, "MongoDB Atlas could not be reached. Your last accepted room is unchanged.", "STORAGE_UNAVAILABLE");
    });
  }
  const client = await mongoGlobal.voxbuildMongo;
  return client.db(process.env.MONGODB_DB || "voxbuild");
}

function canonicalScene(document: StoredScene): Scene {
  return SceneSchema.parse({
    id: document.id,
    revision: document.revision,
    schemaVersion: document.schemaVersion,
    room: document.room,
    objects: document.objects,
    updatedAt: document.updatedAt,
  });
}

function digestPayload(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function duplicateResult(document: StoredScene, commandId: string, digest: string): { scene: Scene; duplicate: true } | null {
  const receipt = document.receipts.find((entry) => entry.commandId === commandId);
  if (!receipt) return null;
  if (receipt.digest !== digest) throw new HttpError(409, "This command ID was already used for a different request. Use a new command ID.", "COMMAND_ID_REUSED");
  return { scene: canonicalScene(document), duplicate: true };
}

export function createSceneRepository(collection: SceneCollectionPort) {
  async function getScene(ownerId: string, sceneId: string): Promise<Scene | null> {
    const document = await collection.findOne({ _id: sceneId, ownerId });
    return document ? canonicalScene(document) : null;
  }

  async function createStoredScene(ownerId: string, preset: PresetId = "studio"): Promise<Scene> {
    const scene = createScene(randomUUID(), preset);
    await collection.insertOne({ ...scene, _id: scene.id, ownerId, receipts: [], createdAt: scene.updatedAt });
    return scene;
  }

  async function commit(ownerId: string, sceneId: string, commandId: string, expectedRevision: number, digest: string, buildNext: (scene: Scene) => Scene): Promise<{ scene: Scene; duplicate: boolean }> {
    const current = await collection.findOne({ _id: sceneId, ownerId });
    if (!current) throw new HttpError(404, "This room was not found in your session.", "SCENE_NOT_FOUND");
    const duplicate = duplicateResult(current, commandId, digest);
    if (duplicate) return duplicate;
    if (current.revision !== expectedRevision) throw new HttpError(409, "This room changed since your command began. Refresh it and try again.", "REVISION_CONFLICT");

    const next = buildNext(canonicalScene(current));
    const receipt: CommandReceipt = { commandId, digest, revision: next.revision, acceptedAt: next.updatedAt };
    const accepted = await collection.findOneAndUpdate(
      { _id: sceneId, ownerId, revision: expectedRevision, "receipts.commandId": { $ne: commandId } },
      { $set: next, $push: { receipts: { $each: [receipt], $slice: -RECEIPT_LIMIT } } },
    );
    if (accepted) return { scene: canonicalScene(accepted), duplicate: false };

    // Another request may have accepted this exact command while we validated it.
    const latest = await collection.findOne({ _id: sceneId, ownerId });
    if (!latest) throw new HttpError(404, "This room was not found in your session.", "SCENE_NOT_FOUND");
    const racedDuplicate = duplicateResult(latest, commandId, digest);
    if (racedDuplicate) return racedDuplicate;
    throw new HttpError(409, "Another edit was saved first. Refresh the room before trying again.", "REVISION_CONFLICT");
  }

  async function applyCommand(ownerId: string, batch: CommandBatch): Promise<{ scene: Scene; duplicate: boolean }> {
    const parsed = CommandBatchSchema.safeParse(batch);
    if (!parsed.success) throw new HttpError(400, "The scene command is invalid.", "INVALID_COMMAND");
    const command = parsed.data;
    return commit(ownerId, command.sceneId, command.commandId, command.expectedRevision, digestPayload({ kind: "operations", ...command }),
      (scene) => applyOperations(scene, command.operations));
  }

  async function resetScene(ownerId: string, sceneId: string, preset: PresetId, expectedRevision: number, commandId: string): Promise<{ scene: Scene; duplicate: boolean }> {
    if (!IdSchema.safeParse(sceneId).success || !IdSchema.safeParse(commandId).success || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0 || !PRESETS.some((entry) => entry.id === preset)) {
      throw new HttpError(400, "The room reset request is invalid.", "INVALID_COMMAND");
    }
    return commit(ownerId, sceneId, commandId, expectedRevision, digestPayload({ kind: "reset", sceneId, commandId, expectedRevision, preset }), (scene) => ({
      ...createScene(scene.id, preset), revision: scene.revision + 1,
    }));
  }

  async function listScenes(ownerId: string): Promise<Scene[]> {
    return (await collection.listOwned(ownerId)).map(canonicalScene);
  }

  return { getScene, createStoredScene, applyCommand, resetScene, listScenes };
}

async function productionRepository() {
  const database = await getDatabase();
  const collection = database.collection<StoredScene>("scenes");
  return createSceneRepository({
    findOne: (filter) => collection.findOne(filter),
    insertOne: (document) => collection.insertOne(document),
    findOneAndUpdate: (filter, update) => collection.findOneAndUpdate(filter, update, { returnDocument: "after", includeResultMetadata: false }),
    listOwned: (ownerId) => collection.find({ ownerId }).sort({ updatedAt: -1 }).limit(10).toArray(),
  });
}

export async function getScene(ownerId: string, sceneId: string): Promise<Scene | null> {
  return (await productionRepository()).getScene(ownerId, sceneId);
}
export async function createStoredScene(ownerId: string, preset: PresetId = "studio"): Promise<Scene> {
  return (await productionRepository()).createStoredScene(ownerId, preset);
}
export async function applyCommand(ownerId: string, batch: CommandBatch): Promise<{ scene: Scene; duplicate: boolean }> {
  return (await productionRepository()).applyCommand(ownerId, batch);
}
export async function resetScene(ownerId: string, sceneId: string, preset: PresetId, expectedRevision: number, commandId: string): Promise<{ scene: Scene; duplicate: boolean }> {
  return (await productionRepository()).resetScene(ownerId, sceneId, preset, expectedRevision, commandId);
}
export async function listScenes(ownerId: string): Promise<Scene[]> {
  return (await productionRepository()).listScenes(ownerId);
}
