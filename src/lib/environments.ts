import { z } from "zod";

export const ENVIRONMENT_IDS = ["sunlit", "gallery", "forest", "desert", "coastal", "midnight"] as const;
export const EnvironmentIdSchema = z.enum(ENVIRONMENT_IDS);
export type EnvironmentId = z.infer<typeof EnvironmentIdSchema>;
export type Environment = {
  id: EnvironmentId;
  name: string;
  description: string;
  wallColor: string;
  floorColor: string;
  lighting: "day" | "overcast" | "morning" | "coastal" | "sunset" | "night";
};

// The first three palettes match existing saved presets. Lighting is derived,
// so rooms retain their original schema without a migration or a new field.
export const ENVIRONMENTS: Environment[] = [
  { id: "sunlit", name: "Sunlit", description: "Warm ivory walls, honey oak floors, and clear daylight.", wallColor: "#f1ede4", floorColor: "#d9bd95", lighting: "day" },
  { id: "gallery", name: "Gallery", description: "Soft stone walls, muted oak, and diffuse overcast light.", wallColor: "#e8e5df", floorColor: "#bda48a", lighting: "overcast" },
  { id: "forest", name: "Forest", description: "Pale sage walls, natural timber, and low morning sunlight.", wallColor: "#edf0e8", floorColor: "#d7c4a4", lighting: "morning" },
  { id: "desert", name: "Desert", description: "Sandstone walls and warm clay oak at golden sunset.", wallColor: "#ebd8c2", floorColor: "#c79069", lighting: "sunset" },
  { id: "coastal", name: "Coastal", description: "Sea-mist walls, pale driftwood floors, and bright cool afternoon light.", wallColor: "#e5eff0", floorColor: "#cbbf9d", lighting: "coastal" },
  { id: "midnight", name: "Midnight", description: "Deep blue walls and dark walnut floors in an evening glow.", wallColor: "#323c50", floorColor: "#756353", lighting: "night" },
];

export function getEnvironmentForRoom(room: { wallColor: string; floorColor: string }): Environment {
  return ENVIRONMENTS.find((environment) => environment.wallColor === room.wallColor && environment.floorColor === room.floorColor) ?? ENVIRONMENTS[0];
}
