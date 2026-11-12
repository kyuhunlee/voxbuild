export type FurnitureEstimate = {
  currency: "USD";
  itemCount: number;
  pricedItemCount: number;
  missingItemCount: number;
  knownSubtotal: number;
  total: number | null;
  missingSkus: string[];
};

/** Catalog estimates count each scene instance; missing prices never become free items. */
export function estimateFurniture(
  objects: readonly { sku: string }[],
  catalog: readonly { sku: string; price?: number | null }[],
): FurnitureEstimate {
  const prices = new Map(catalog.map((item) => [item.sku, item.price]));
  const missingSkus = new Set<string>();
  let knownSubtotalCents = 0;
  let pricedItemCount = 0;

  for (const object of objects) {
    const price = prices.get(object.sku);
    // Prices are USD unit prices. Sum integer cents to avoid floating-point totals.
    const unitCents = typeof price === "number" ? Math.round((price + Number.EPSILON) * 100) : NaN;
    if (typeof price !== "number" || !Number.isFinite(price) || price < 0 || !Number.isSafeInteger(unitCents)) {
      missingSkus.add(object.sku);
      continue;
    }
    knownSubtotalCents += unitCents;
    pricedItemCount += 1;
  }

  const knownSubtotal = knownSubtotalCents / 100;
  return {
    currency: "USD",
    itemCount: objects.length,
    pricedItemCount,
    missingItemCount: objects.length - pricedItemCount,
    knownSubtotal,
    total: missingSkus.size ? null : knownSubtotal,
    missingSkus: [...missingSkus],
  };
}
