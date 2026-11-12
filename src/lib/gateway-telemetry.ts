type JsonObject = Record<string, unknown>;

export type GatewayProviderAttempt = {
  provider: string | null;
  success: boolean | null;
  statusCode: number | null;
};

export type GatewayModelAttempt = {
  model: string | null;
  success: boolean | null;
  providers: GatewayProviderAttempt[] | null;
};

export type GatewayTrace = {
  requestedModel: string | null;
  configuredFallbackModels: string[] | null;
  routingTest: boolean;
  executedModel: string | null;
  executedProvider: string | null;
  modelFallbackUsed: boolean | null;
  modelAttempts: GatewayModelAttempt[] | null;
  providerAttemptCount: number | null;
  failedProviderAttemptCount: number | null;
};

function object(value: unknown): JsonObject | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : null;
}

function label(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function success(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function count(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

// Only Gateway routing metadata identifies the executed model/provider. The SDK
// response model can retain the requested model even after a Gateway fallback.
export function readGatewayTrace(telemetry: unknown): GatewayTrace | null {
  const data = object(telemetry);
  if (!data || data.source !== "AI Gateway") return null;
  const gateway = object(data.gateway);
  const routing = object(gateway?.routing);
  const requestedModel = label(data.requestedModel);
  const configuredFallbackModels = Array.isArray(data.configuredFallbackModels)
    ? data.configuredFallbackModels.flatMap((value) => label(value) ?? []) : null;
  const modelAttempts = Array.isArray(routing?.modelAttempts)
    ? routing.modelAttempts.map((value): GatewayModelAttempt => {
      const attempt = object(value);
      if (!attempt) return { model: null, success: null, providers: null };
      return {
        model: label(attempt.canonicalSlug), success: success(attempt.success),
        providers: Array.isArray(attempt.providerAttempts)
          ? attempt.providerAttempts.map((value): GatewayProviderAttempt => {
            const provider = object(value);
            if (!provider) return { provider: null, success: null, statusCode: null };
            const statusCode = count(provider.statusCode);
            return { provider: label(provider.provider), success: success(provider.success), statusCode: statusCode !== null && statusCode >= 100 && statusCode <= 599 ? statusCode : null };
          }) : null,
      };
    }) : null;
  const successfulModel = modelAttempts?.findLast((attempt) => attempt.success === true);
  const successfulProvider = successfulModel?.providers?.findLast((attempt) => attempt.success === true);
  const executedModel = label(routing?.canonicalSlug) ?? successfulModel?.model ?? null;
  const executedProvider = label(routing?.finalProvider) ?? successfulProvider?.provider ?? null;
  const providers = modelAttempts?.flatMap((attempt) => attempt.providers ?? []) ?? [];
  const completeProviderAttempts = modelAttempts !== null && modelAttempts.every((attempt) => attempt.providers !== null && attempt.providers.every((provider) => provider.success !== null));
  const modelFallbackUsed = executedModel && requestedModel
    ? executedModel === requestedModel ? false
      : configuredFallbackModels?.includes(executedModel) || modelAttempts?.some((attempt) => attempt.model === requestedModel && attempt.success === false) ? true : null
    : null;
  return {
    requestedModel, configuredFallbackModels,
    routingTest: data.routingTest === "primary-excluded-by-provider-policy",
    executedModel, executedProvider, modelFallbackUsed, modelAttempts,
    providerAttemptCount: count(routing?.totalProviderAttemptCount) ?? (completeProviderAttempts ? providers.length : null),
    failedProviderAttemptCount: completeProviderAttempts ? providers.filter((attempt) => attempt.success === false).length : null,
  };
}

export function describeGatewayOutcome(trace: GatewayTrace): { title: string; note: string } {
  if (trace.routingTest) return {
    title: "Live routing test",
    note: "This real Gateway request allowed only Google as a provider, excluding the primary model. It tests routing; it does not create or prove a provider outage.",
  };
  if (trace.modelFallbackUsed) return {
    title: "Fallback model served the response",
    note: trace.failedProviderAttemptCount
      ? "Gateway reported failed provider attempts before completion. Request errors do not establish a provider-wide outage."
      : "Gateway returned a different configured model. A provider outage is not established by a model change alone.",
  };
  if (trace.failedProviderAttemptCount) return {
    title: "Provider retry reported",
    note: "Gateway reported failed provider attempts before completion. Inspect the returned attempt sequence below.",
  };
  if (trace.modelFallbackUsed === false) return {
    title: "Primary model served the response",
    note: trace.failedProviderAttemptCount === 0 ? "No failed provider attempts were reported." : "Provider failure details were not returned.",
  };
  return { title: "Routing outcome not confirmed", note: "Executed model or routing details were not returned. The requested model is not evidence of which model ran." };
}
