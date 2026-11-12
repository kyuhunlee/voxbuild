export type VercelProductDecision = {
  id: string;
  label: string;
  kind: string;
  recommendation: string;
  alternative: string;
  build: string[];
  adopt: string[];
  benefit: string;
  proof: string;
  ownership: string;
  source: { label: string; href: string };
  example: { customer: string; summary: string; context: string; href: string };
};

// Official product documentation and Vercel-published customer stories reviewed November 12, 2026.
// Customer outcomes illustrate the decision; they are not forecasts or VoxBuild measurements.
export const VERCEL_PRODUCT_DECISIONS: VercelProductDecision[] = [
  {
    id: "sdk",
    label: "AI SDK",
    kind: "Free, open-source library",
    recommendation: "Adopt a shared AI integration layer.",
    alternative: "Direct provider SDKs + an internal wrapper",
    build: [
      "Normalize provider calls, results, and errors.",
      "Translate output schemas and parse plans.",
      "Maintain common usage and cancellation handling.",
    ],
    adopt: [
      "One generation API across supported models.",
      "Schema-based structured output.",
      "Common results and controls in application code.",
    ],
    benefit: "Reduce integration work when evaluating models, so engineers can focus on the renter experience.",
    proof: "VoxBuild uses AI SDK for primary and policy-routed fallback plans, feeding the same scene executor.",
    ownership: "Room rules, authorization, semantic validation, evaluations, and persistence remain ours. AI SDK is Apache-2.0, runs on other hosts, and can call providers directly. Model usage, hosting, and dependency maintenance still have costs.",
    source: { label: "AI SDK docs", href: "https://vercel.com/docs/ai-sdk" },
    example: {
      customer: "Gamma",
      summary: "Uses AI SDK instead of custom orchestration to evolve agent behavior without rebuilding its backend.",
      context: "Published February 28, 2026. An architecture example, not a forecast of our engineering savings.",
      href: "https://vercel.com/customers/gamma-builds-design-first-agents-with-vercel",
    },
  },
  {
    id: "gateway",
    label: "AI Gateway",
    kind: "Managed model access service",
    recommendation: "Use model operations without running a routing service.",
    alternative: "Direct access or a self-hosted model proxy",
    build: [
      "Operate shared access and provider credentials.",
      "Implement selection and fallback sequencing.",
      "Combine routing, usage, latency, and cost records.",
    ],
    adopt: [
      "Managed endpoint and centralized authentication.",
      "Configurable provider and model fallbacks.",
      "Request logs, cost, usage, and routing metadata.",
    ],
    benefit: "Keep model choice and feature-cost visibility while reducing the model infrastructure the team must operate.",
    proof: "Policy-routed fallback passed. All 14 recorded text requests returned usage and cost; a real outage remains untested.",
    ownership: "Approve models and data policies, evaluate quality, set budgets, and reconcile spend. Gateway adds a service dependency and does not make room saves durable. VoxBuild voice still uses OpenAI directly with separate accounting.",
    source: { label: "AI Gateway docs", href: "https://vercel.com/docs/ai-gateway" },
    example: {
      customer: "Tailscale",
      summary: "Chose AI Gateway over in-house routing. Returned request costs let Aperture show spend without maintaining provider price tables.",
      context: "Published September 11, 2026. Tailscale keeps its own identity/connectivity layer; its wider product also uses Sandbox.",
      href: "https://vercel.com/customers/how-tailscale-built-a-customer-facing-model-router-on-ai-gateway",
    },
  },
  {
    id: "functions",
    label: "Next.js + Functions",
    kind: "Managed application runtime",
    recommendation: "Launch the planner alongside the existing platform.",
    alternative: "Assemble a separate planner hosting stack",
    build: [
      "Package and release the planner and APIs.",
      "Operate capacity and framework configuration.",
      "Connect runtime diagnostics and regional placement.",
    ],
    adopt: [
      "Framework-aware app and API deployments.",
      "Managed request-driven compute that scales.",
      "Function logs and configurable regions.",
    ],
    benefit: "Spend less team capacity on a new application platform while preserving the customer’s AWS services and Atlas data.",
    proof: "VoxBuild’s interface and Node.js APIs deploy together. Accepted edits reach external Atlas and survive reloads.",
    ownership: "Authorization, business logic, pooling, timeouts, regional choices, and data security remain application decisions. Compare platform and usage charges with the customer’s existing operating costs; no cost saving has been measured here.",
    source: { label: "Vercel Functions docs", href: "https://vercel.com/docs/functions" },
    example: {
      customer: "Coxwave",
      summary: "Reported an 85% reduction in deployment time after adopting Next.js and Vercel for faster iteration.",
      context: "Published August 13, 2025. This reflects its wider Vercel setup, not a Functions-only benchmark or our expected result.",
      href: "https://vercel.com/customers/how-coxwave-delivers-genai-value-faster-with-vercel",
    },
  },
  {
    id: "previews",
    label: "Git + Previews",
    kind: "Managed release workflow",
    recommendation: "Make each change easy for stakeholders to review.",
    alternative: "Custom per-branch staging in the existing pipeline",
    build: [
      "Provision per-change review environments.",
      "Connect builds, deployments, URLs, and configuration.",
      "Maintain review links and release integrations.",
    ],
    adopt: [
      "Automatic URLs for non-production branch builds.",
      "Preview-scoped environment configuration.",
      "Git-triggered production releases.",
    ],
    benefit: "Get product feedback on a working change earlier, with less preview-environment plumbing to maintain.",
    proof: "Main auto-deployment and CI work. Gated promotion, canary, and a rollback drill remain proposed customer steps.",
    ownership: "Protect preview access, isolate test data, and define approval and rollout gates. Preview URLs do not automatically isolate Atlas data, and rolling back code does not undo database changes.",
    source: { label: "Vercel environment docs", href: "https://vercel.com/docs/deployments/environments" },
    example: {
      customer: "Coxwave",
      summary: "Used previews for parallel LLM experiments; reported production releases increasing from weekly to twice daily.",
      context: "Published August 13, 2025. A customer-reported outcome across several platform features, not proof of a causal Preview-only effect.",
      href: "https://vercel.com/customers/how-coxwave-delivers-genai-value-faster-with-vercel",
    },
  },
];
