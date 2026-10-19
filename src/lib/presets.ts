import { getCatalogItem } from "./catalog-data";
import { z } from "zod";
import { ENVIRONMENTS, type EnvironmentId } from "./environments";
import type { Artwork, WindowLayoutId } from "./room-decor";
import { SceneSchema, type Room, type Scene, type SceneObject } from "./schema";

export const PRESET_IDS = ["studio", "office", "bedroom", "dining", "lounge", "empty"] as const;
export const PresetIdSchema = z.enum(PRESET_IDS);
export type PresetId = z.infer<typeof PresetIdSchema>;
export type ScenePreset = { id: PresetId; name: string; description: string; room: Room; objects: SceneObject[] };

function room(width: number, depth: number, height: number, environmentId: EnvironmentId, windowLayout: WindowLayoutId, artworks: Artwork[]): Room {
  const { wallColor, floorColor } = ENVIRONMENTS.find((entry) => entry.id === environmentId)!;
  return { width, depth, height, wallColor, floorColor, windowLayout, artworks };
}

function object(id: string, sku: string, x: number, z: number, rotation = 0, color?: string): SceneObject {
  const item = getCatalogItem(sku);
  if (!item) throw new Error(`Unknown preset catalog item: ${sku}`);
  return { id, sku, position: [x, 0, z], rotation, color: color ?? item.defaultColor };
}

export const PRESETS: ScenePreset[] = [
  {
    id: "studio", name: "Sunlit studio", description: "A warm 31 m² apartment, ready to make your own.",
    room: room(6, 5.2, 2.8, "sunlit", "back-wide", [
      { id: "studio-artwork", design: "abstract", wall: "left", offset: -0.2, height: 1.7 },
    ]),
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
    id: "office", name: "Work from home", description: "A 26 m² room balancing a work nook and a place to unwind.",
    room: room(5.5, 4.8, 2.8, "forest", "left-pair", [
      { id: "office-artwork", design: "botanical", wall: "back", offset: 0.1, height: 1.65 },
      { id: "office-artwork-small", design: "geometric", wall: "left", offset: 0, height: 1.6 },
    ]),
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
    id: "bedroom", name: "Quiet bedroom", description: "A restful 28 m² bedroom with soft textures and bedside storage.",
    room: room(5.6, 5, 2.8, "coastal", "left-tall", [
      { id: "bedroom-artwork", design: "coastal", wall: "back", offset: -0.4, height: 1.75 },
      { id: "bedroom-artwork-side", design: "botanical", wall: "left", offset: 0.95, height: 1.65 },
    ]),
    objects: [
      object("bedroom-rug", "woven-rug", -0.4, 0.25, Math.PI / 2, "#69828c"),
      object("bedroom-bed", "haven-bed", -0.4, -0.65),
      object("bedroom-table-left", "pebble-side-table", -1.65, -1.3),
      object("bedroom-table-right", "pebble-side-table", 0.85, -1.3),
      object("bedroom-bookcase", "stack-bookcase", 2.05, -1.95),
      object("bedroom-sideboard", "low-sideboard", -0.4, 1.95, Math.PI),
      object("bedroom-plant", "olive-plant", 2.05, 1.8, 0, "#e7dfce"),
    ],
  },
  {
    id: "dining", name: "Gathering room", description: "A welcoming 35 m² dining room with six seats and warm evening light.",
    room: room(6.4, 5.4, 2.9, "desert", "corner", [
      { id: "dining-artwork", design: "sunset", wall: "back", offset: -1.5, height: 1.7 },
      { id: "dining-artwork-side", design: "geometric", wall: "left", offset: 1.2, height: 1.7 },
    ]),
    objects: [
      object("dining-table", "gather-table", 0, 0),
      object("dining-chair-left", "reed-dining-chair", -1.2, 0, Math.PI / 2),
      object("dining-chair-right", "reed-dining-chair", 1.2, 0, -Math.PI / 2),
      object("dining-chair-back-left", "reed-dining-chair", -0.45, -0.95),
      object("dining-chair-back-right", "reed-dining-chair", 0.45, -0.95),
      object("dining-chair-front-left", "reed-dining-chair", -0.45, 0.95, Math.PI),
      object("dining-chair-front-right", "reed-dining-chair", 0.45, 0.95, Math.PI),
      object("dining-sideboard", "low-sideboard", -1.6, -2.1),
      object("dining-plant", "olive-plant", 2.55, -2.05),
    ],
  },
  {
    id: "lounge", name: "Evening lounge", description: "A cozy 34 m² lounge for conversation, reading, and winding down.",
    room: room(6.2, 5.5, 2.8, "midnight", "back-high", [
      { id: "lounge-artwork", design: "geometric", wall: "left", offset: -0.5, height: 1.65 },
      { id: "lounge-artwork-back", design: "sunset", wall: "back", offset: 0, height: 1.25 },
    ]),
    objects: [
      object("lounge-rug", "woven-rug", -0.6, -0.5, 0, "#69828c"),
      object("lounge-sofa", "nook-sofa", -0.7, -1.85, 0, "#e7dfce"),
      object("lounge-table", "orbit-table", -0.6, -0.55, 0, "#584336"),
      object("lounge-ottoman", "cloud-ottoman", -0.65, 0.5, 0, "#cc7656"),
      object("lounge-chair", "arc-chair", 1.35, -0.45, -0.5, "#446a87"),
      object("lounge-side-table", "pebble-side-table", 1.65, 0.6, 0, "#d8bc91"),
      object("lounge-bookcase", "stack-bookcase", 2.2, -2.25, 0, "#584336"),
      object("lounge-lamp", "stem-lamp", -2.2, -1.85, 0, "#c4a267"),
    ],
  },
  {
    id: "empty", name: "Blank canvas", description: "Start with an empty 31 m² apartment.",
    room: room(6, 5.2, 2.8, "gallery", "none", []),
    objects: [],
  },
];

export function createScene(id: string, preset: PresetId = "studio"): Scene {
  const definition = PRESETS.find((entry) => entry.id === preset);
  if (!definition) throw new Error(`Unknown room preset: ${preset}`);
  return SceneSchema.parse({ id, revision: 0, schemaVersion: 1, room: definition.room, objects: definition.objects, updatedAt: new Date().toISOString() });
}
