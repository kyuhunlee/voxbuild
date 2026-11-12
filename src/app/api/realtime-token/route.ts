import { createGateway } from "@ai-sdk/gateway";
import { NextResponse } from "next/server";
import { getDemoLimits } from "@/lib/demo-limits";
import { errorResponse, HttpError, readJson } from "@/lib/server/errors";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { createGatewayVoiceConfig, GatewayVoiceInputSchema, isGatewayVoiceModel } from "@/lib/server/realtime-config";
import { enforceSameOrigin, requireSession } from "@/lib/server/session";
import { getScene } from "@/lib/server/store";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Mint a model-scoped, single-use Gateway secret; long-lived credentials stay server-side. */
export async function POST(request: Request) {
  try {
    enforceSameOrigin(request);
    const owner = await requireSession();
    const input = GatewayVoiceInputSchema.safeParse(await readJson(request, 2_000));
    if (!input.success) throw new HttpError(400, "Voice setup requires a scene ID.", "INVALID_REQUEST");
    // The realtime mint endpoint currently requires an API key even when
    // ordinary Gateway text requests can authenticate through Vercel OIDC.
    if (!process.env.AI_GATEWAY_API_KEY?.trim()) throw new HttpError(503, "AI Gateway voice requires a server API key on this deployment.", "VOICE_NOT_CONFIGURED");

    const model = process.env.AI_GATEWAY_REALTIME_MODEL || "openai/gpt-realtime-2.1";
    if (!isGatewayVoiceModel(model)) throw new HttpError(503, "The configured Gateway voice model is not supported by this demo.", "VOICE_MODEL_UNSUPPORTED");
    const scene = await getScene(owner.id, input.data.sceneId);
    if (!scene) throw new HttpError(404, "This scene is no longer available. Reload before starting voice.", "SCENE_NOT_FOUND");
    const limits = getDemoLimits().voice;
    await enforceRateLimit(owner.id, "voice-session", limits.perVisitorHour, 60 * 60 * 1000, `This visitor has reached the ${limits.perVisitorHour} voice starts per hour allowance.`);
    await enforceRateLimit("global", "voice-session", limits.globalDay, 24 * 60 * 60 * 1000, `The demo has reached its ${limits.globalDay} voice starts per day allowance.`);

    const gateway = createGateway({ fetch: (url, init) => fetch(url, {
      ...init, signal: AbortSignal.any([request.signal, AbortSignal.timeout(20_000)]),
    }) });
    let secret: Awaited<ReturnType<typeof gateway.experimental_realtime.getToken>>;
    try {
      secret = await gateway.experimental_realtime.getToken({ model, expiresAfterSeconds: 60 });
    } catch (error) {
      // Gateway errors can contain request/auth internals. Log only a class name.
      console.warn("Gateway voice token creation failed", { name: error instanceof Error ? error.name : "UnknownError" });
      throw new HttpError(503, "The Gateway voice service is temporarily unavailable. Try again shortly.", "VOICE_UNAVAILABLE");
    }
    const url = new URL(secret.url);
    if (!secret.token || url.protocol !== "wss:" || url.hostname !== "ai-gateway.vercel.sh") {
      throw new HttpError(503, "The Gateway voice service returned an invalid connection.", "VOICE_UNAVAILABLE");
    }
    const sessionConfig = createGatewayVoiceConfig(scene);
    // Gateway binds the token to its model, not to these client-applied instructions.
    // All model-proposed edits still cross the owned, validated command API.
    return NextResponse.json({
      token: secret.token, url: secret.url,
      ...(secret.expiresAt != null && { expiresAt: secret.expiresAt }),
      model, sessionConfig, tools: sessionConfig.tools,
      sceneId: scene.id, revision: scene.revision,
      route: "AI Gateway", transport: "WebSocket",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
