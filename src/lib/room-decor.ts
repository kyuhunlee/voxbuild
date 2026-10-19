import { z } from "zod";

export const WINDOW_LAYOUT_IDS = ["back-wide", "left-pair", "left-tall", "corner", "back-high", "none"] as const;
export const WindowLayoutIdSchema = z.enum(WINDOW_LAYOUT_IDS);
export const ARTWORK_DESIGNS = ["abstract", "botanical", "coastal", "geometric", "sunset"] as const;
export const ArtworkDesignSchema = z.enum(ARTWORK_DESIGNS);
export const WallSchema = z.enum(["back", "left"]);
export const ArtworkSchema = z.object({
  id: z.string().min(1).max(80).regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/),
  design: ArtworkDesignSchema,
  wall: WallSchema,
  offset: z.number().finite().min(-100).max(100),
  height: z.number().finite().min(0).max(8),
}).strict();
export type WindowLayoutId = z.infer<typeof WindowLayoutIdSchema>;
export type ArtworkDesign = z.infer<typeof ArtworkDesignSchema>;
export type Wall = z.infer<typeof WallSchema>;
export type Artwork = z.infer<typeof ArtworkSchema>;
export type WindowOpening = { wall: Wall; offset: number; sill: number; width: number; height: number };
export type DecorRoom = { width: number; depth: number; height: number; windowLayout?: WindowLayoutId; artworks?: Artwork[] };
export const ARTWORK_WIDTH = 0.9;
export const ARTWORK_HEIGHT = 1.1;
const WALL_MARGIN = 0.08;
const WINDOW_MARGIN = 0.12;
const EPSILON = 1e-7;

/** Missing metadata reproduces the original room, including already-saved lofts. */
export function getRoomWindows(room: DecorRoom): WindowOpening[] {
  const { width: w, depth: d, height: h } = room;
  switch (room.windowLayout ?? "back-wide") {
    case "back-wide": return [{ wall: "back", offset: w * 0.12, sill: h * 0.29, width: Math.min(w * 0.43, 2.6), height: h * 0.59 }];
    case "left-pair": return [-1, 1].map((side) => ({ wall: "left", offset: side * d * 0.26, sill: h * 0.32, width: Math.min(d * 0.23, 0.95), height: h * 0.54 }));
    case "left-tall": return [{ wall: "left", offset: -d * 0.24, sill: h * 0.16, width: Math.min(d * 0.25, 1.25), height: h * 0.72 }];
    case "corner": return [
      { wall: "back", offset: w * 0.21, sill: h * 0.33, width: Math.min(w * 0.27, 1.65), height: h * 0.52 },
      { wall: "left", offset: -d * 0.22, sill: h * 0.33, width: Math.min(d * 0.29, 1.5), height: h * 0.52 },
    ];
    case "back-high": return [{ wall: "back", offset: 0, sill: h * 0.71, width: Math.min(w * 0.65, 3.8), height: h * 0.19 }];
    case "none": return [];
  }
}

/** Return detached values so legacy defaults are materialized only by an art edit. */
export function getRoomArtworks(room: DecorRoom): Artwork[] {
  return room.artworks?.map((artwork) => ({ ...artwork })) ?? [
    { id: "legacy-artwork", design: "abstract", wall: "left", offset: -room.depth * 0.04, height: room.height * 0.61 },
  ];
}

export function getArtworkPlacementError(room: DecorRoom, artwork: Artwork, ignoreId = artwork.id): string | null {
  if (!ArtworkSchema.safeParse(artwork).success) return "Choose a valid artwork, wall, and position.";
  const wallLength = artwork.wall === "back" ? room.width : room.depth;
  if (Math.abs(artwork.offset) + ARTWORK_WIDTH / 2 + WALL_MARGIN > wallLength / 2 + EPSILON ||
      artwork.height - ARTWORK_HEIGHT / 2 < WALL_MARGIN - EPSILON ||
      artwork.height + ARTWORK_HEIGHT / 2 + WALL_MARGIN > room.height + EPSILON) {
    return "Keep the whole painting on the wall, clear of the floor, ceiling, and corners.";
  }
  for (const window of getRoomWindows(room)) {
    if (window.wall === artwork.wall &&
        Math.abs(artwork.offset - window.offset) < (ARTWORK_WIDTH + window.width) / 2 + WINDOW_MARGIN - EPSILON &&
        Math.abs(artwork.height - (window.sill + window.height / 2)) < (ARTWORK_HEIGHT + window.height) / 2 + WINDOW_MARGIN - EPSILON) {
      return "Move the painting clear of the window and its frame.";
    }
  }
  for (const other of getRoomArtworks(room)) {
    if (other.id !== ignoreId && other.wall === artwork.wall &&
        Math.abs(artwork.offset - other.offset) < ARTWORK_WIDTH + WALL_MARGIN - EPSILON &&
        Math.abs(artwork.height - other.height) < ARTWORK_HEIGHT + WALL_MARGIN - EPSILON) {
      return "Leave some space between this painting and the other artwork.";
    }
  }
  return null;
}

/** Find a valid wall-switch destination, preferring the current center and height. */
export function findArtworkPlacement(room: DecorRoom, artworkId: string, wall: Wall): { offset: number; height: number } | null {
  const artwork = getRoomArtworks(room).find((entry) => entry.id === artworkId);
  if (!artwork) return null;
  const candidates = [{ offset: artwork.offset, height: artwork.height }];
  const halfSpan = (wall === "back" ? room.width : room.depth) / 2 - ARTWORK_WIDTH / 2 - WALL_MARGIN;
  for (let offset = -halfSpan; offset <= halfSpan + EPSILON; offset += 0.1) {
    for (let height = ARTWORK_HEIGHT / 2 + WALL_MARGIN; height <= room.height - ARTWORK_HEIGHT / 2 - WALL_MARGIN + EPSILON; height += 0.1) {
      candidates.push({ offset: Math.round(offset * 1000) / 1000, height: Math.round(height * 1000) / 1000 });
    }
  }
  candidates.sort((a, b) => Math.hypot(a.offset - artwork.offset, a.height - artwork.height) - Math.hypot(b.offset - artwork.offset, b.height - artwork.height));
  return candidates.find((position) => !getArtworkPlacementError(room, { ...artwork, ...position, wall })) ?? null;
}
