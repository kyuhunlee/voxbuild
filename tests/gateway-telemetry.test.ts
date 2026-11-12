import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { describeGatewayOutcome, readGatewayTrace } from "../src/lib/gateway-telemetry";

const primary = "openai/gpt-4.1-mini";
const fallback = "google/gemini-2.5-flash";
const evidence = JSON.parse(readFileSync(new URL("../docs/evidence/gateway-production-expanded.json", import.meta.url), "utf8")) as {
  checks: { name: string; telemetry: Record<string, unknown> }[];
};

function telemetry(routing: unknown, overrides: Record<string, unknown> = {}) {
  return { source: "AI Gateway", requestedModel: primary, configuredFallbackModels: [fallback], gateway: { routing }, ...overrides };
}

test("recorded hosted primary and policy fallback use actual Gateway metadata, not the SDK model", () => {
  for (const check of evidence.checks) {
    const trace = readGatewayTrace({ ...check.telemetry, configuredFallbackModels: [fallback] })!;
    const isFallback = check.name === "provider-policy-fallback";
    assert.equal(check.telemetry.sdkReportedModel, primary);
    assert.equal(trace.executedModel, isFallback ? fallback : primary);
    assert.equal(trace.executedProvider, isFallback ? "google" : "openai");
    assert.equal(trace.modelFallbackUsed, isFallback);
    assert.equal(trace.routingTest, isFallback);
    assert.equal(trace.providerAttemptCount, 1);
    assert.equal(trace.failedProviderAttemptCount, 0);
  }
});

test("a policy exclusion with zero primary provider requests is a routing test, not a reported provider failure", () => {
  const check = evidence.checks.find((check) => check.name === "provider-policy-fallback")!;
  const trace = readGatewayTrace({ ...check.telemetry, configuredFallbackModels: [fallback] })!;
  assert.deepEqual(trace.modelAttempts?.[0].providers, []);
  assert.equal(describeGatewayOutcome(trace).title, "Live routing test");
  assert.match(describeGatewayOutcome(trace).note, /does not create or prove a provider outage/);
});

test("provider retry preserves the model and uses the final serving provider", () => {
  const trace = readGatewayTrace(telemetry({
    canonicalSlug: primary, resolvedProvider: "azure", finalProvider: "openai", totalProviderAttemptCount: 2,
    modelAttempts: [{ canonicalSlug: primary, success: true, providerAttempts: [
      { provider: "azure", success: false, statusCode: 503 },
      { provider: "openai", success: true, statusCode: 200 },
    ] }],
  }))!;
  assert.equal(trace.executedProvider, "openai");
  assert.equal(trace.modelFallbackUsed, false);
  assert.equal(trace.failedProviderAttemptCount, 1);
  assert.equal(describeGatewayOutcome(trace).title, "Provider retry reported");
});

test("model fallback with a reported failed provider is distinct from an intentional policy test", () => {
  const trace = readGatewayTrace(telemetry({
    canonicalSlug: fallback, finalProvider: "google",
    modelAttempts: [
      { canonicalSlug: primary, success: false, providerAttempts: [{ provider: "openai", success: false, statusCode: 429 }] },
      { canonicalSlug: fallback, success: true, providerAttempts: [{ provider: "google", success: true, statusCode: 200 }] },
    ],
  }))!;
  assert.equal(trace.routingTest, false);
  assert.equal(trace.modelFallbackUsed, true);
  assert.equal(trace.providerAttemptCount, 2);
  assert.equal(describeGatewayOutcome(trace).title, "Fallback model served the response");
  assert.match(describeGatewayOutcome(trace).note, /do not establish a provider-wide outage/);
});

test("missing routing never borrows execution identity from requested, SDK, or resolved-provider fields", () => {
  const trace = readGatewayTrace(telemetry({ resolvedProvider: "azure" }, { sdkReportedModel: primary, model: primary }))!;
  assert.equal(trace.executedModel, null);
  assert.equal(trace.executedProvider, null);
  assert.equal(trace.providerAttemptCount, null);
  assert.equal(trace.failedProviderAttemptCount, null);
  assert.equal(trace.modelFallbackUsed, null);
  assert.equal(describeGatewayOutcome(trace).title, "Routing outcome not confirmed");
});

test("successful attempt metadata can identify execution when top-level routing fields are absent", () => {
  const trace = readGatewayTrace(telemetry({ modelAttempts: [{ canonicalSlug: fallback, success: true, providerAttempts: [{ provider: "vertex", success: true }] }] }))!;
  assert.equal(trace.executedModel, fallback);
  assert.equal(trace.executedProvider, "vertex", "the model vendor must not be substituted for its serving provider");
});

test("malformed or partial metadata retains unknown states without inventing successes or zero failures", () => {
  const trace = readGatewayTrace(telemetry({ canonicalSlug: [], finalProvider: 123, totalProviderAttemptCount: -1, modelAttempts: [null, { providerAttempts: [42, { provider: "google", success: "true", statusCode: 900 }] }] }))!;
  assert.equal(trace.executedModel, null);
  assert.equal(trace.executedProvider, null);
  assert.equal(trace.providerAttemptCount, null);
  assert.equal(trace.failedProviderAttemptCount, null);
  assert.equal(trace.modelAttempts?.[1].providers?.[1].success, null);
  assert.equal(trace.modelAttempts?.[1].providers?.[1].statusCode, null);
  assert.equal(readGatewayTrace(null), null);
  assert.equal(readGatewayTrace({ source: "MongoDB Atlas" }), null);
});

test("older responses distinguish unreported backup configuration from no backup", () => {
  const older = { ...evidence.checks[0].telemetry };
  assert.equal(readGatewayTrace(older)?.configuredFallbackModels, null);
  assert.deepEqual(readGatewayTrace({ ...older, configuredFallbackModels: [] })?.configuredFallbackModels, []);
});
