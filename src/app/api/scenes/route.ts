import { NextResponse } from "next/server";
import { z } from "zod";
import { IdSchema } from "@/lib/schema";
import { PresetIdSchema } from "@/lib/presets";
import { createStoredScene, getScene, listScenes } from "@/lib/server/store";
import { enforceSameOrigin, requireSession } from "@/lib/server/session";
import { errorResponse, HttpError, readJson } from "@/lib/server/errors";
import { enforceRateLimit } from "@/lib/server/rate-limit";
export const runtime = "nodejs";
export const maxDuration = 30;
const CreateSchema = z.object({ preset: PresetIdSchema.default("studio") }).strict();

export async function GET(request: Request) {
  try {
    const owner = await requireSession();
    const id = new URL(request.url).searchParams.get("id");
    if (id) {
      const scene = await getScene(owner.id, IdSchema.parse(id));
      if (!scene) throw new HttpError(404, "This room was not found.");
      return NextResponse.json({ scene }, { headers: { "Cache-Control": "private, no-store" } });
    }
    return NextResponse.json({ scenes: await listScenes(owner.id) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    enforceSameOrigin(request); const owner = await requireSession();
    const { preset } = CreateSchema.parse(await readJson(request));
    await enforceRateLimit(owner.id, "new-scene", 20, 60 * 60 * 1000);
    const scene = await createStoredScene(owner.id, preset);
    return NextResponse.json({ scene }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
