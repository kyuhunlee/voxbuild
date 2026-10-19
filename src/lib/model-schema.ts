import { z } from "zod";

// Provider-facing schemas intentionally describe the wire shape only. Always
// parse operations with OperationsSchema before calling the scene executor.
// Keeping business constraints in the domain schema avoids provider-specific
// structured-output limitations without relaxing execution-time validation.
const ModelPositionSchema = z.array(z.number()).describe("Exactly three coordinates [x, y, z] in meters. The room is centered on X/Z, Y points up, and floor-level furniture uses y=0.");
const ModelRotationSchema = z.number().describe("Yaw rotation in radians between -6.283185307 and 6.283185307. At zero, furniture faces +Z.");
const ModelColorSchema = z.string().describe("A lowercase six-digit hex color, copied exactly from this item's catalog colors.");
const ModelObjectIdSchema = z.string().describe("The exact ID of an existing object in the current scene. Preserve object identity when editing it.");

export const ModelOperationSchema = z.union([
  z.object({
    type: z.literal("add"),
    sku: z.string().describe("An exact SKU from the supplied furniture catalog."),
    position: ModelPositionSchema,
    rotation: ModelRotationSchema,
    color: ModelColorSchema,
  }).strict(),
  z.object({
    type: z.literal("move"),
    objectId: ModelObjectIdSchema,
    position: ModelPositionSchema,
  }).strict(),
  z.object({
    type: z.literal("recolor"),
    objectId: ModelObjectIdSchema,
    color: ModelColorSchema,
  }).strict(),
  z.object({
    type: z.literal("rotate"),
    objectId: ModelObjectIdSchema,
    rotation: ModelRotationSchema,
  }).strict(),
  z.object({
    type: z.literal("remove"),
    objectId: ModelObjectIdSchema,
  }).strict(),
  z.object({
    type: z.literal("set_environment"),
    environmentId: z.string().describe("An exact environment ID from the supplied environments: sunlit, gallery, forest, desert, coastal, or midnight. Changes the room palette and lighting without moving or replacing furniture."),
  }).strict(),
  z.object({
    type: z.literal("move_artwork"),
    artworkId: z.string().describe("The exact ID of an existing painting from the supplied artwork data."),
    wall: z.string().describe("The wall: back or left. Paintings stay mounted on one of these walls."),
    offset: z.number().describe("Horizontal wall position in meters: world X on the back wall, world Z on the left wall."),
    height: z.number().describe("Height of the painting center above the floor in meters. The whole 0.9 by 1.1 meter painting must fit on the wall, clear of windows and other paintings."),
  }).strict(),
  z.object({
    type: z.literal("set_artwork"),
    artworkId: z.string().describe("The exact ID of an existing painting from the supplied artwork data."),
    design: z.string().describe("Artwork design: abstract, botanical, coastal, geometric, or sunset. Changes the picture without moving its frame."),
  }).strict(),
]);

const ModelOperationsSchema = z.array(ModelOperationSchema).describe("One to twelve furniture, environment, or artwork operations, executed atomically after server validation. Use only supplied catalog items, existing object/artwork IDs, and environment IDs.");

export const ModelPlanSchema = z.object({
  message: z.string().describe("A brief user-facing description of the proposed edit. Do not claim it has been saved before the server accepts it."),
  operations: ModelOperationsSchema,
}).strict();

export const ModelToolSchema = z.object({ operations: ModelOperationsSchema }).strict();

export type ModelPlan = z.infer<typeof ModelPlanSchema>;
export type ModelOperation = z.infer<typeof ModelOperationSchema>;
