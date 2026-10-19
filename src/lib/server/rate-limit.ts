import { createHash } from "node:crypto";
import { HttpError } from "./errors";
import { getDatabase } from "./store";

let indexReady: Promise<unknown> | undefined;
export async function enforceRateLimit(ownerId: string, category: string, limit: number, windowMs: number) {
  const database = await getDatabase();
  const collection = database.collection<{ _id: string; count: number; expiresAt: Date }>("rate_limits");
  indexReady ??= collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch(error => { indexReady = undefined; throw error; });
  await indexReady;
  const window = Math.floor(Date.now() / windowMs);
  const hash = createHash("sha256").update(`${category}:${ownerId}:${window}`).digest("hex");
  // [SA DECISION]: Counters live in Atlas, so scaling or a deploy cannot reset the public demo's limits.
  const result = await collection.findOneAndUpdate({ _id: hash }, {
    $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((window + 2) * windowMs) },
  }, { upsert: true, returnDocument: "after" });
  if (!result || result.count > limit) throw new HttpError(429, "This demo has reached its request limit. Please try again later.", "RATE_LIMITED");
}
