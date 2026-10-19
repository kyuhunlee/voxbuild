import { z } from "zod";

/** All lengths are meters. Object positions identify the floor-centered base. */
export const IdSchema = z.string().min(1).max(80).regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/, "Use letters, digits, underscores, and hyphens for IDs.");
export const ColorSchema = z.string().regex(/^#[0-9a-f]{6}$/, "Use a lowercase six-digit hex color from the catalog.");
const CoordinateSchema = z.number().finite().min(-100).max(100);
// A homogeneous JSON array is compatible with model tool schemas; length(3)
// establishes the tuple contract without a non-serializable Zod transform.
export const PositionSchema = z.array(CoordinateSchema).length(3) as unknown as z.ZodType<[number, number, number]>;
const RotationSchema = z.number().finite().min(-Math.PI * 2).max(Math.PI * 2);

export const RoomSchema = z.object({
  width: z.number().finite().min(2).max(30),
  depth: z.number().finite().min(2).max(30),
  height: z.number().finite().min(2).max(8),
  wallColor: ColorSchema,
  floorColor: ColorSchema,
}).strict();

export const SceneObjectSchema = z.object({
  id: IdSchema,
  sku: IdSchema,
  position: PositionSchema,
  rotation: RotationSchema,
  color: ColorSchema,
}).strict();

export const SceneSchema = z.object({
  id: IdSchema,
  revision: z.number().int().nonnegative(),
  schemaVersion: z.literal(1),
  room: RoomSchema,
  objects: z.array(SceneObjectSchema).max(60),
  updatedAt: z.string().datetime(),
}).strict().superRefine((scene, context) => {
  const ids = new Set<string>();
  scene.objects.forEach((object, index) => {
    if (ids.has(object.id)) context.addIssue({ code: "custom", message: "Object IDs must be unique.", path: ["objects", index, "id"] });
    ids.add(object.id);
  });
});

export const OperationSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("add"), sku: IdSchema, position: PositionSchema, rotation: RotationSchema, color: ColorSchema }).strict(),
  z.object({ type: z.literal("move"), objectId: IdSchema, position: PositionSchema }).strict(),
  z.object({ type: z.literal("recolor"), objectId: IdSchema, color: ColorSchema }).strict(),
  z.object({ type: z.literal("rotate"), objectId: IdSchema, rotation: RotationSchema }).strict(),
  z.object({ type: z.literal("remove"), objectId: IdSchema }).strict(),
]);

export const OperationsSchema = z.array(OperationSchema).min(1).max(12);
export const CommandBatchSchema = z.object({
  sceneId: IdSchema,
  commandId: IdSchema,
  expectedRevision: z.number().int().nonnegative(),
  operations: OperationsSchema,
}).strict();

export type Room = z.infer<typeof RoomSchema>;
export type SceneObject = z.infer<typeof SceneObjectSchema>;
export type Scene = z.infer<typeof SceneSchema>;
export type Operation = z.infer<typeof OperationSchema>;
export type CommandBatch = z.infer<typeof CommandBatchSchema>;
export type CatalogItem = {
  sku: string;
  name: string;
  category: "sofa" | "table" | "chair" | "lamp" | "plant" | "rug" | "desk";
  dimensions: [number, number, number];
  price: number;
  defaultColor: string;
  colors: string[];
  description: string;
};
