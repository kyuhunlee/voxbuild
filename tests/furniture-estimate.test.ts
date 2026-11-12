import assert from "node:assert/strict";
import test from "node:test";
import { estimateFurniture } from "../src/lib/furniture-estimate";

test("furniture estimates count duplicate scene instances and include zero-priced items", () => {
  const estimate = estimateFurniture(
    [{ sku: "sofa" }, { sku: "lamp" }, { sku: "lamp" }, { sku: "gift" }],
    [{ sku: "sofa", price: 1290 }, { sku: "lamp", price: 180 }, { sku: "gift", price: 0 }, { sku: "unused", price: 500 }],
  );
  assert.deepEqual(estimate, { currency: "USD", itemCount: 4, pricedItemCount: 4, missingItemCount: 0, knownSubtotal: 1650, total: 1650, missingSkus: [] });
});

test("missing or invalid prices produce an incomplete estimate instead of a misleading total", () => {
  const estimate = estimateFurniture(
    [{ sku: "lamp" }, { sku: "missing" }, { sku: "missing" }, { sku: "unpriced" }, { sku: "invalid" }],
    [{ sku: "lamp", price: 180 }, { sku: "unpriced" }, { sku: "invalid", price: NaN }],
  );
  assert.equal(estimate.total, null);
  assert.equal(estimate.knownSubtotal, 180);
  assert.equal(estimate.itemCount, 5);
  assert.equal(estimate.pricedItemCount, 1);
  assert.equal(estimate.missingItemCount, 4);
  assert.deepEqual(estimate.missingSkus, ["missing", "unpriced", "invalid"]);
});

test("an empty room has a complete zero-dollar estimate", () => {
  assert.deepEqual(estimateFurniture([], [{ sku: "sofa", price: 1290 }]), {
    currency: "USD", itemCount: 0, pricedItemCount: 0, missingItemCount: 0, knownSubtotal: 0, total: 0, missingSkus: [],
  });
});

test("fractional dollar prices sum in cents without floating-point residue", () => {
  assert.equal(estimateFurniture([{ sku: "a" }, { sku: "b" }, { sku: "a" }], [{ sku: "a", price: 0.1 }, { sku: "b", price: 0.2 }]).total, 0.4);
});
