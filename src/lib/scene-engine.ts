import { getCatalogItem } from "./catalog-data";
import { ENVIRONMENTS } from "./environments";
import { getArtworkPlacementError, getRoomArtworks } from "./room-decor";
import { IdSchema, OperationsSchema, SceneSchema, type Operation, type Scene, type SceneObject } from "./schema";

export class DomainError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "DomainError";
  }
}

const EPSILON = 1e-7;

function validateObject(scene: Scene, object: SceneObject): void {
  const item = getCatalogItem(object.sku);
  if (!item) throw new DomainError("UNKNOWN_SKU", `Furniture SKU '${object.sku}' is not in the catalog.`);
  if (!item.colors.includes(object.color)) throw new DomainError("INVALID_COLOR", `${item.name} is not available in ${object.color}. Choose ${item.colors.join(", ")}.`);

  const [width, height, depth] = item.dimensions;
  const [x, y, z] = object.position;
  const cosine = Math.abs(Math.cos(object.rotation));
  const sine = Math.abs(Math.sin(object.rotation));
  const halfWidth = (width * cosine + depth * sine) / 2;
  const halfDepth = (width * sine + depth * cosine) / 2;
  if (Math.abs(x) + halfWidth > scene.room.width / 2 + EPSILON ||
      Math.abs(z) + halfDepth > scene.room.depth / 2 + EPSILON ||
      y < -EPSILON || y + height > scene.room.height + EPSILON) {
    throw new DomainError("OUT_OF_BOUNDS", `${item.name} must fit inside the ${scene.room.width} × ${scene.room.depth} m room, above the floor and below the ceiling.`);
  }
}

export type ApplyOptions = { idFactory?: () => string; now?: () => Date };

/** Applies an entire command to a copy; any failure leaves the input untouched. */
export function applyOperations(scene: Scene, operations: Operation[], options: ApplyOptions = {}): Scene {
  const parsedScene = SceneSchema.safeParse(scene);
  if (!parsedScene.success) throw new DomainError("INVALID_SCENE", parsedScene.error.issues.map((issue) => issue.message).join(" "));
  const parsedOperations = OperationsSchema.safeParse(operations);
  if (!parsedOperations.success) throw new DomainError("INVALID_COMMAND", parsedOperations.error.issues.map((issue) => issue.message).join(" "));

  // Zod has already created a detached copy, including each position tuple.
  const result = parsedScene.data;
  const idFactory = options.idFactory ?? (() => globalThis.crypto.randomUUID());
  const now = options.now ?? (() => new Date());

  for (const operation of parsedOperations.data) {
    if (operation.type === "move_artwork" || operation.type === "set_artwork") {
      const artworks = getRoomArtworks(result.room);
      const artwork = artworks.find((entry) => entry.id === operation.artworkId);
      if (!artwork) throw new DomainError("ARTWORK_NOT_FOUND", `Painting '${operation.artworkId}' does not exist. Refresh the room before editing it.`);
      if (operation.type === "move_artwork") {
        artwork.wall = operation.wall;
        artwork.offset = operation.offset;
        artwork.height = operation.height;
      } else artwork.design = operation.design;
      const placementError = getArtworkPlacementError(result.room, artwork);
      if (placementError) throw new DomainError("INVALID_ARTWORK_PLACEMENT", placementError);
      result.room.artworks = artworks;
      continue;
    }
    if (operation.type === "set_environment") {
      const environment = ENVIRONMENTS.find((entry) => entry.id === operation.environmentId)!;
      result.room.wallColor = environment.wallColor;
      result.room.floorColor = environment.floorColor;
      continue;
    }
    if (operation.type === "add") {
      if (result.objects.length >= 60) throw new DomainError("OBJECT_LIMIT", "This room supports at most 60 furniture objects.");
      const id = idFactory();
      if (!IdSchema.safeParse(id).success || result.objects.some((object) => object.id === id)) {
        throw new DomainError("INVALID_OBJECT_ID", "The new furniture object needs a valid, unique ID.");
      }
      const object: SceneObject = { id, sku: operation.sku, position: [...operation.position], rotation: operation.rotation, color: operation.color };
      validateObject(result, object);
      result.objects.push(object);
      continue;
    }

    const index = result.objects.findIndex((object) => object.id === operation.objectId);
    if (index < 0) throw new DomainError("OBJECT_NOT_FOUND", `Furniture '${operation.objectId}' does not exist. Refresh the scene before editing it.`);
    if (operation.type === "remove") {
      result.objects.splice(index, 1);
      continue;
    }
    const object = result.objects[index];
    if (operation.type === "move") object.position = [...operation.position];
    if (operation.type === "recolor") object.color = operation.color;
    if (operation.type === "rotate") object.rotation = operation.rotation;
    validateObject(result, object);
  }

  // Also protect against malformed persisted data entering the renderer.
  result.objects.forEach((object) => validateObject(result, object));
  if (result.room.artworks) for (const artwork of result.room.artworks) {
    const placementError = getArtworkPlacementError(result.room, artwork);
    if (placementError) throw new DomainError("INVALID_ARTWORK_PLACEMENT", placementError);
  }
  result.revision += 1;
  result.updatedAt = now().toISOString();
  return result;
}
