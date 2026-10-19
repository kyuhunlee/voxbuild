import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { HttpError } from "./errors";

const COOKIE_NAME = "voxbuild-session";
const MAX_AGE = 60 * 60 * 24 * 7;

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new HttpError(503, "Visitor sessions are not configured.", "SESSION_NOT_CONFIGURED");
  return value;
}
function signature(payload: string) { return createHmac("sha256", secret()).update(payload).digest("base64url"); }
function decode(value?: string): { id: string } | null {
  if (!value || value.length > 300) return null;
  const [id, expires, supplied, extra] = value.split(".");
  if (extra || !id || !/^[a-f0-9-]{36}$/.test(id) || !expires || !supplied || Number(expires) < Date.now()) return null;
  const expected = signature(`${id}.${expires}`);
  const a = Buffer.from(supplied); const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b) ? { id } : null;
}

export async function requireSession() {
  const session = decode((await cookies()).get(COOKIE_NAME)?.value);
  if (!session) throw new HttpError(401, "Your visitor session expired. Reload to start a new room.", "SESSION_EXPIRED");
  return session;
}

export async function ensureSession() {
  const jar = await cookies(); const existing = decode(jar.get(COOKIE_NAME)?.value);
  if (existing) return existing;
  const id = randomUUID(); const payload = `${id}.${Date.now() + MAX_AGE * 1000}`;
  // [SA DECISION]: A signed HttpOnly anonymous session isolates reviewer designs without a login wall.
  jar.set(COOKIE_NAME, `${payload}.${signature(payload)}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: MAX_AGE });
  return { id };
}

export function enforceSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const requestUrl = new URL(request.url);
  // Next's development adapter may normalize request.url to localhost; Host retains the browser's actual target.
  const targetOrigin = `${requestUrl.protocol}//${request.headers.get("host") || requestUrl.host}`;
  if (!origin || origin !== targetOrigin || request.headers.get("sec-fetch-site") === "cross-site") {
    throw new HttpError(403, "This request must originate from VoxBuild.", "ORIGIN_REJECTED");
  }
}

export function capabilities() {
  const database = Boolean(process.env.MONGODB_URI && process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32);
  return {
    database,
    gateway: database && Boolean(process.env.AI_GATEWAY_MODEL && (process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN)),
    voice: database && Boolean(process.env.OPENAI_API_KEY),
  };
}
