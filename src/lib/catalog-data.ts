import type { CatalogItem } from "./schema";

/** Explicit demo fixture standing in for the customer's furnishing catalog API. */
export const CATALOG: CatalogItem[] = [
  { sku: "nook-sofa", name: "Nook sofa", category: "sofa", dimensions: [2.25, 0.86, 0.94], price: 1290, defaultColor: "#cc7656", colors: ["#cc7656", "#e7dfce", "#687761", "#446a87", "#404448"], description: "A soft, compact three-seat sofa. Terracotta, cream, sage, blue, or charcoal upholstery." },
  { sku: "orbit-table", name: "Orbit coffee table", category: "table", dimensions: [1.05, 0.4, 0.65], price: 290, defaultColor: "#aa7953", colors: ["#aa7953", "#d8bc91", "#584336", "#e7dfce"], description: "Low rounded coffee table in oak, light oak, walnut, or cream." },
  { sku: "arc-chair", name: "Arc lounge chair", category: "chair", dimensions: [0.78, 0.8, 0.82], price: 490, defaultColor: "#687761", colors: ["#687761", "#e7dfce", "#cc7656", "#446a87", "#404448"], description: "An upholstered accent chair with a curved back and timber legs." },
  { sku: "stem-lamp", name: "Stem floor lamp", category: "lamp", dimensions: [0.44, 1.65, 0.44], price: 180, defaultColor: "#e7dfce", colors: ["#e7dfce", "#404448", "#c4a267"], description: "A slender floor lamp with a warm shade. Cream, charcoal, or brass." },
  { sku: "olive-plant", name: "Olive plant", category: "plant", dimensions: [0.65, 1.45, 0.65], price: 95, defaultColor: "#b87858", colors: ["#b87858", "#e7dfce", "#404448"], description: "A leafy indoor plant in a terracotta, cream, or charcoal pot. Color changes the pot." },
  { sku: "woven-rug", name: "Woven area rug", category: "rug", dimensions: [2.6, 0.025, 1.9], price: 220, defaultColor: "#e5d6ba", colors: ["#e5d6ba", "#929b82", "#b97861", "#69828c"], description: "A flatwoven rug in natural, sage, clay, or blue. Rugs may sit beneath furniture." },
  { sku: "line-desk", name: "Line writing desk", category: "desk", dimensions: [1.25, 0.76, 0.62], price: 340, defaultColor: "#d8bc91", colors: ["#d8bc91", "#584336", "#e7dfce", "#404448"], description: "A compact work-from-home desk in light oak, walnut, cream, or charcoal." },
];

const catalogBySku = new Map(CATALOG.map((item) => [item.sku, item]));
export function getCatalogItem(sku: string): CatalogItem | undefined {
  return catalogBySku.get(sku);
}

export const CATALOG_SOURCE = "demo-fixture" as const;
