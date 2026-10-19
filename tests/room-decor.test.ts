import assert from "node:assert/strict";
import test from "node:test";
import { createScene, PRESETS, PRESET_IDS, PresetIdSchema } from "../src/lib/presets";
import { SceneSchema, OperationsSchema } from "../src/lib/schema";
import { applyOperations, DomainError } from "../src/lib/scene-engine";
import { ARTWORK_HEIGHT, ARTWORK_WIDTH, findArtworkPlacement, getArtworkPlacementError, getRoomArtworks, getRoomWindows, type DecorRoom } from "../src/lib/room-decor";

const hasCode = (code: string) => (error: unknown) => error instanceof DomainError && error.code === code;

test("six selectable presets have distinct valid windows and artwork, without City loft", () => {
  assert.deepEqual([...PRESET_IDS], ["studio", "office", "bedroom", "dining", "lounge", "empty"]);
  assert.equal(PresetIdSchema.safeParse("loft").success, false);
  assert.equal(new Set(PRESETS.map((preset) => preset.room.windowLayout)).size, 6);
  for (const preset of PRESETS) {
    const { room } = createScene(`decor-${preset.id}`, preset.id);
    const windows = getRoomWindows(room);
    const artworks = getRoomArtworks(room);
    if (preset.id === "empty") { assert.deepEqual(windows, []); assert.deepEqual(artworks, []); }
    else assert.ok(artworks.length >= 1 && artworks.length <= 2);
    for (const window of windows) {
      const wallLength = window.wall === "back" ? room.width : room.depth;
      assert.ok(Math.abs(window.offset) + window.width / 2 < wallLength / 2);
      assert.ok(window.sill > 0 && window.sill + window.height < room.height);
    }
    for (const artwork of artworks) assert.equal(getArtworkPlacementError(room, artwork), null, `${preset.id}: ${artwork.id}`);
  }
});

test("legacy saved scenes and lofts parse unchanged with original visual defaults", () => {
  const legacy = { ...createScene("saved-loft"), room: { width: 7, depth: 6, height: 3.2, wallColor: "#e8e5df", floorColor: "#bda48a" } };
  const parsed = SceneSchema.parse(legacy);
  assert.deepEqual(parsed, legacy);
  assert.equal(parsed.schemaVersion, 1);
  assert.deepEqual(getRoomWindows(parsed.room), [{ wall: "back", offset: 7 * 0.12, sill: 3.2 * 0.29, width: 2.6, height: 3.2 * 0.59 }]);
  assert.deepEqual(getRoomArtworks(parsed.room), [{ id: "legacy-artwork", design: "abstract", wall: "left", offset: -6 * 0.04, height: 3.2 * 0.61 }]);
  const styled = applyOperations(parsed, [{ type: "set_environment", environmentId: "forest" }]);
  assert.equal("artworks" in styled.room, false);
  assert.equal("windowLayout" in styled.room, false);
  const moved = applyOperations(parsed, [{ type: "move_artwork", artworkId: "legacy-artwork", wall: "left", offset: 0.5, height: 1.7 }]);
  assert.equal(moved.room.artworks?.[0].offset, 0.5);
  assert.equal("windowLayout" in moved.room, false);
  assert.equal("artworks" in parsed.room, false);
  const derived = getRoomArtworks(moved.room);
  derived[0].offset = 99;
  assert.equal(moved.room.artworks?.[0].offset, 0.5);
});

test("wall moves and design edits preserve room dimensions, furniture, and other art", () => {
  const before = createScene("wall-edits", "office");
  const original = structuredClone(before);
  const after = applyOperations(before, [
    { type: "move_artwork", artworkId: "office-artwork", wall: "back", offset: 1.6, height: 1.75 },
    { type: "set_artwork", artworkId: "office-artwork", design: "coastal" },
  ]);
  assert.equal(after.revision, 1);
  assert.deepEqual(after.objects, before.objects);
  assert.deepEqual(after.room, { ...before.room, artworks: [
    { ...before.room.artworks![0], offset: 1.6, height: 1.75, design: "coastal" },
    before.room.artworks![1],
  ] });
  assert.deepEqual(before, original);
  const styled = applyOperations(after, [{ type: "set_environment", environmentId: "desert" }]);
  assert.deepEqual(styled.room.artworks, after.room.artworks);
  assert.equal(styled.room.windowLayout, after.room.windowLayout);
  assert.deepEqual(styled.objects, after.objects);
});

test("painting bounds include the complete frame and clear windows and other art", () => {
  const studio = createScene("painting-bounds");
  for (const move of [
    { wall: "left", offset: studio.room.depth / 2 - ARTWORK_WIDTH / 2, height: 1.7 },
    { wall: "left", offset: 0, height: ARTWORK_HEIGHT / 2 },
    { wall: "left", offset: 0, height: studio.room.height - ARTWORK_HEIGHT / 2 },
    { wall: "back", offset: 0.72, height: 1.6 },
  ] as const) {
    assert.throws(() => applyOperations(studio, [{ type: "move_artwork", artworkId: "studio-artwork", ...move }]), hasCode("INVALID_ARTWORK_PLACEMENT"));
  }
  const office = createScene("painting-overlap", "office");
  assert.throws(() => applyOperations(office, [{ type: "move_artwork", artworkId: "office-artwork-small", wall: "back", offset: 0.1, height: 1.65 }]), hasCode("INVALID_ARTWORK_PLACEMENT"));
  const moved = applyOperations(studio, [{ type: "move_artwork", artworkId: "studio-artwork", wall: "back", offset: -2, height: 1.7 }]);
  assert.equal(moved.room.artworks?.[0].wall, "back");
});

test("invalid artwork batches roll back furniture, style, and earlier artwork edits", () => {
  const before = createScene("atomic-art");
  const original = structuredClone(before);
  assert.throws(() => applyOperations(before, [
    { type: "set_environment", environmentId: "midnight" },
    { type: "set_artwork", artworkId: "studio-artwork", design: "botanical" },
    { type: "remove", objectId: "studio-table" },
    { type: "move_artwork", artworkId: "studio-artwork", wall: "back", offset: 0.72, height: 1.6 },
  ]), hasCode("INVALID_ARTWORK_PLACEMENT"));
  assert.deepEqual(before, original);
  assert.throws(() => applyOperations(before, [{ type: "set_artwork", artworkId: "invented", design: "coastal" }]), hasCode("ARTWORK_NOT_FOUND"));
  for (const invalid of [
    { type: "move_artwork", artworkId: "studio-artwork", wall: "right", offset: 0, height: 1.6 },
    { type: "move_artwork", artworkId: "studio-artwork", wall: "left", offset: Infinity, height: 1.6 },
    { type: "set_artwork", artworkId: "studio-artwork", design: "invented" },
    { type: "set_artwork", artworkId: "studio-artwork", design: "coastal", width: 0.1 },
  ]) assert.equal(OperationsSchema.safeParse([invalid]).success, false);
  const duplicate = structuredClone(before);
  duplicate.room.artworks!.push({ ...duplicate.room.artworks![0] });
  assert.equal(SceneSchema.safeParse(duplicate).success, false);
});

test("wall-switch placement helper finds valid space or returns no placement", () => {
  for (const preset of PRESETS) for (const artwork of getRoomArtworks(preset.room)) {
    const position = findArtworkPlacement(preset.room, artwork.id, artwork.wall);
    assert.deepEqual(position, { offset: artwork.offset, height: artwork.height });
    const wall = artwork.wall === "back" ? "left" : "back";
    const switched = findArtworkPlacement(preset.room, artwork.id, wall);
    if (switched) assert.equal(getArtworkPlacementError(preset.room, { ...artwork, ...switched, wall }), null);
  }
  const crowded: DecorRoom = { width: 2, depth: 2, height: 2, windowLayout: "none", artworks: [
    { id: "moving", design: "abstract", wall: "left", offset: 0, height: 1 },
    { id: "fixed", design: "botanical", wall: "back", offset: 0, height: 1 },
  ] };
  assert.equal(findArtworkPlacement(crowded, "moving", "back"), null);
  assert.equal(findArtworkPlacement(crowded, "unknown", "back"), null);
});
