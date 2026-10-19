import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { DomainError } from "../scene-engine";

export class HttpError extends Error {
  constructor(public readonly status: number, message: string, public readonly code = "REQUEST_FAILED") {
    super(message); this.name = "HttpError";
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof HttpError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status, headers: { "Cache-Control": "no-store" } });
  if (error instanceof DomainError) return NextResponse.json({ error: error.message, code: error.code }, { status: 422 });
  if (error instanceof ZodError) return NextResponse.json({ error: "The request did not match the supported command format.", code: "INVALID_REQUEST" }, { status: 400 });
  console.error("VoxBuild request failed", { name: error instanceof Error ? error.name : "UnknownError" });
  return NextResponse.json({ error: "We could not confirm this request. Your last accepted room is safe. Reload to check its status before retrying.", code: "SERVICE_UNAVAILABLE" }, { status: 503, headers: { "Cache-Control": "no-store" } });
}

export async function readJson(request: Request, maxBytes = 32_000): Promise<unknown> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new HttpError(415, "Send an application/json request.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Request body is required.");
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      length += value.byteLength;
      if (length > maxBytes) { await reader.cancel(); throw new HttpError(413, "This request is too large."); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const data = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(data)); }
  catch { throw new HttpError(400, "The request body is not valid JSON."); }
}
