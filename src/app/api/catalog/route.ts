import { NextResponse } from "next/server";
import { readCatalog } from "@/lib/server/catalog";
import { errorResponse } from "@/lib/server/errors";
export const runtime = "nodejs";
export async function GET() {
  try { return NextResponse.json(await readCatalog(), { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }); }
  catch (error) { return errorResponse(error); }
}
