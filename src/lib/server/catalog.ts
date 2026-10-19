import { z } from "zod";
import { CATALOG } from "../catalog-data";

const MetadataSchema = z.array(z.object({ sku: z.string(), name: z.string().max(80), price: z.number().nonnegative(), description: z.string().max(500) }));

export async function readCatalog() {
  const url = process.env.CATALOG_API_URL;
  // [SA DECISION]: The fixture represents the existing catalog; Atlas is the demo's real external boundary.
  if (!url) return { items: CATALOG, source: "fixture" as const };
  if (new URL(url).protocol !== "https:") throw new Error("Catalog API must use HTTPS");
  const response = await fetch(url, {
    headers: process.env.CATALOG_API_TOKEN ? { Authorization: `Bearer ${process.env.CATALOG_API_TOKEN}` } : {},
    next: { revalidate: 300, tags: ["furniture-catalog"] }, signal: AbortSignal.timeout(4000),
  });
  if (!response.ok) throw new Error("Catalog unavailable");
  const metadata = MetadataSchema.parse(await response.json());
  // This demo supports a finite renderable SKU set; unknown external assets cannot enter the scene.
  return { items: CATALOG.map(item => ({ ...item, ...metadata.find(row => row.sku === item.sku) })), source: "external-api" as const };
}
