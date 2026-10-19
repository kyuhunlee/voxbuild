import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";
import { afterEach, beforeEach, test } from "node:test";
import { hasGatewayCredentials } from "../src/lib/server/gateway-auth";
import { capabilities } from "../src/lib/server/session";

const environmentKeys = ["AI_GATEWAY_API_KEY", "VERCEL_OIDC_TOKEN", "AI_GATEWAY_MODEL", "MONGODB_URI", "SESSION_SECRET"] as const;
const contextSymbol = Symbol.for("@vercel/request-context");
const contexts = new AsyncLocalStorage<{ headers?: Record<string, string> }>();
const runtime = globalThis as unknown as Record<symbol, unknown>;
let previousContext: unknown;
let previousEnvironment: Record<string, string | undefined>;

beforeEach(() => {
  previousContext = runtime[contextSymbol];
  previousEnvironment = Object.fromEntries(environmentKeys.map((key) => [key, process.env[key]]));
  for (const key of environmentKeys) delete process.env[key];
  process.env.AI_GATEWAY_MODEL = "openai/test-model";
  process.env.MONGODB_URI = "mongodb://test.invalid/voxbuild";
  process.env.SESSION_SECRET = "test-session-secret-with-at-least-32-characters";
  runtime[contextSymbol] = { get: () => contexts.getStore() };
});

afterEach(() => {
  for (const key of environmentKeys) {
    const previous = previousEnvironment[key];
    if (previous === undefined) delete process.env[key];
    else process.env[key] = previous;
  }
  if (previousContext === undefined) delete runtime[contextSymbol];
  else runtime[contextSymbol] = previousContext;
});

test("hosted request-context OIDC enables Gateway without an environment token", () => {
  contexts.run({ headers: { "x-vercel-oidc-token": "test-request-token" } }, () => {
    assert.equal(process.env.VERCEL_OIDC_TOKEN, undefined);
    assert.equal(hasGatewayCredentials(), true);
    assert.equal(capabilities().gateway, true);
    assert.equal(JSON.stringify(capabilities()).includes("test-request-token"), false);
  });
  assert.equal(hasGatewayCredentials(), false, "a request token must not be cached outside its context");
  assert.equal(capabilities().gateway, false);
});

test("local OIDC environment and explicit API key each enable Gateway", () => {
  process.env.VERCEL_OIDC_TOKEN = "test-local-token";
  assert.equal(hasGatewayCredentials(), true);
  assert.equal(capabilities().gateway, true);
  delete process.env.VERCEL_OIDC_TOKEN;
  process.env.AI_GATEWAY_API_KEY = "test-api-key";
  assert.equal(hasGatewayCredentials(), true);
  assert.equal(capabilities().gateway, true);
});

test("missing credentials fail closed without throwing", () => {
  assert.equal(hasGatewayCredentials(), false);
  assert.equal(capabilities().gateway, false);
});

test("Gateway capability still requires model and persistence configuration", () => {
  process.env.AI_GATEWAY_API_KEY = "test-api-key";
  delete process.env.AI_GATEWAY_MODEL;
  assert.equal(capabilities().gateway, false);
  process.env.AI_GATEWAY_MODEL = "openai/test-model";
  delete process.env.MONGODB_URI;
  assert.equal(capabilities().gateway, false);
});

test("concurrent request contexts do not share OIDC credentials", async () => {
  const available = await Promise.all([
    contexts.run({ headers: { "x-vercel-oidc-token": "test-request-token" } }, async () => {
      await Promise.resolve();
      return hasGatewayCredentials();
    }),
    contexts.run({ headers: {} }, async () => {
      await Promise.resolve();
      return hasGatewayCredentials();
    }),
  ]);
  assert.deepEqual(available, [true, false]);
});
