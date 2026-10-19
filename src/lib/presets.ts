import { getCatalogItem } from "./catalog-data";
import { SceneSchema, type Room, type Scene, type SceneObject } from "./schema";

export type PresetId = "studio" | "loft" | "office" | "empty";
export type ScenePreset = { id: PresetId; name: string; description: string; room: Room; objects: SceneObject[] };

function object(id: string, sku: string, x: number, z: number, rotation = 0, color?: string): SceneObject {
  const item = getCatalogItem(sku);
  if (!item) throw new Error(`Unknown preset catalog item: ${sku}`);
  return { id, sku, position: [x, 0, z], rotation, color: color ?? item.defaultColor };
}

export const PRESETS: ScenePreset[] = [
  {
    id: "studio", name: "Sunlit studio", description: "A warm 31 m² apartment, ready to make your own.",
    room: { width: 6, depth: 5.2, height: 2.8, wallColor: "#f1ede4", floorColor: "#d9bd95" },
    objects: [
      object("studio-rug", "woven-rug", -0.65, -0.55),
      object("studio-sofa", "nook-sofa", -0.8, -1.75),
      object("studio-table", "orbit-table", -0.65, -0.45),
      object("studio-chair", "arc-chair", 1.4, -0.55, -0.45),
      object("studio-lamp", "stem-lamp", -2.25, -1.85),
      object("studio-plant", "olive-plant", 2.3, 1.8),
    ],
  },
  {
    id: "loft", name: "City loft", description: "A spacious 42 m² room with a calm, open layout.",
    room: { width: 7, depth: 6, height: 3.2, wallColor: "#e8e5df", floorColor: "#bda48a" },
    objects: [
      object("loft-rug", "woven-rug", -0.65, -0.6, 0, "#929b82"),
      object("loft-sofa", "nook-sofa", -0.9, -1.9, 0, "#e7dfce"),
      object("loft-table", "orbit-table", -0.65, -0.5, 0, "#584336"),
      object("loft-chair", "arc-chair", 1.65, -0.65, -0.6, "#cc7656"),
      object("loft-lamp", "stem-lamp", -2.4, -1.9, 0, "#404448"),
      object("loft-plant", "olive-plant", 2.7, 2.2),
    ],
  },
  {
    id: "office", name: "Work from home", description: "A 26 m² room balancing a work nook and a place to unwind.",
    room: { width: 5.5, depth: 4.8, height: 2.8, wallColor: "#edf0e8", floorColor: "#d7c4a4" },
    objects: [
      object("office-rug", "woven-rug", -0.6, -0.65, 0, "#929b82"),
      object("office-sofa", "nook-sofa", -0.6, -1.65, 0, "#687761"),
      object("office-table", "orbit-table", -0.6, -0.45),
      object("office-desk", "line-desk", 1.6, -1.9),
      object("office-chair", "arc-chair", 1.6, -0.95, Math.PI),
      object("office-plant", "olive-plant", -2.05, 1.65),
    ],
  },
  {
    id: "empty", name: "Blank canvas", description: "Start with an empty 31 m² apartment.",
    room: { width: 6, depth: 5.2, height: 2.8, wallColor: "#f1ede4", floorColor: "#d9bd95" },
    objects: [],
  },
];

export function createScene(id: string, preset: PresetId = "studio"): Scene {
  const definition = PRESETS.find((entry) => entry.id === preset);
  if (!definition) throw new Error(`Unknown room preset: ${preset}`);
  return SceneSchema.parse({ id, revision: 0, schemaVersion: 1, room: definition.room, objects: definition.objects, updatedAt: new Date().toISOString() });
}
