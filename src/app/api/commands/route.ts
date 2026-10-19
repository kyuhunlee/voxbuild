import { NextResponse } from "next/server";
import { CommandBatchSchema } from "@/lib/schema";
import { applyCommand } from "@/lib/server/store";
import { enforceSameOrigin, requireSession } from "@/lib/server/session";
import { errorResponse, readJson } from "@/lib/server/errors";
import { enforceRateLimit } from "@/lib/server/rate-limit";
export const runtime = "nodejs";
export const maxDuration = 30;
export async function POST(request: Request) {
  const start = performance.now();
  try {
    enforceSameOrigin(request); const owner = await requireSession();
    const command = CommandBatchSchema.parse(await readJson(request));
    await enforceRateLimit(owner.id, "scene-command", 120, 60 * 1000);
    const databaseStart = performance.now();
    const result = await applyCommand(owner.id, command);
    return NextResponse.json({ ...result, telemetry: {
      requestId: command.commandId, source: "server-command", storage: "MongoDB Atlas",
      databaseMs: Math.round(performance.now() - databaseStart), totalMs: Math.round(performance.now() - start),
      revision: result.scene.revision, operations: command.operations, duplicate: result.duplicate,
    } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
