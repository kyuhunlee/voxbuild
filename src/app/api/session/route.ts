import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { capabilities, enforceSameOrigin, ensureSession } from "@/lib/server/session";
import { errorResponse } from "@/lib/server/errors";
import { enforceRateLimit } from "@/lib/server/rate-limit";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    enforceSameOrigin(request);
    const available = capabilities();
    if (!available.database) return NextResponse.json({ capabilities: available, sessionId: null }, { headers: { "Cache-Control": "no-store" } });
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
    const key = createHash("sha256").update(`${process.env.SESSION_SECRET}:${ip}`).digest("hex");
    await enforceRateLimit(key, "session-initialization", 60, 60 * 60 * 1000);
    const session = await ensureSession();
    return NextResponse.json({ capabilities: available, sessionId: session.id }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
