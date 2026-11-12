export type VercelProductDecision = {
  id: string;
  label: string;
  kind: string;
  recommendation: string;
  alternative: string;
  build: string[];
  adopt: { title: string; body: string }[];
  benefit: string;
  proof: string;
  ownership: string;
  source: { label: string; href: string };
  example: {
    customer: string;
    summary: string;
    context: string;
    href: string;
    metrics: { value: string; label: string; kind: string }[];
    details: { label: string; body: string }[];
  };
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
      { title: "Change models through a shared API", body: "Use common generation calls across supported providers. Evaluate alternatives without rewriting the planner’s application interface, reducing repetitive integration work." },
      { title: "Generate plans against a schema", body: "Describe the room-operation structure once and use structured output instead of maintaining ad hoc response parsers. Our domain checks still decide which edits are safe to save." },
      { title: "Reuse request handling", body: "Work with common usage, result, and cancellation interfaces. Keep application behavior consistent as model choices change, while retaining responsibility for evaluations and dependency updates." },
    ],
    benefit: "Spend engineering time on room interactions and model quality instead of maintaining a separate integration for every provider. Measure hours to add or change a model before claiming savings.",
    proof: "Text primary and policy-routed fallback plans share one scene executor. The new voice transport uses AI SDK’s normalized realtime events and audio.",
    ownership: "Room rules, authorization, semantic validation, evaluations, and persistence remain ours. AI SDK is Apache-2.0, runs on other hosts, and can call providers directly. A working OpenAI SDK integration can stay: adopt AI SDK for a new feature when shared APIs or streaming UI reduce development work. Model usage, hosting, migration, and dependency maintenance still have costs.",
    source: { label: "AI SDK docs", href: "https://vercel.com/docs/ai-sdk" },
    example: {
      customer: "Gamma",
      summary: "AI SDK and shared middleware reduce repetitive work when adding image models.",
      context: "Published February 28, 2026. Reported image-pipeline results; not a forecast for VoxBuild’s text planner.",
      href: "https://vercel.com/customers/gamma-builds-design-first-agents-with-vercel",
      metrics: [
        { value: "~30 lines", label: "Configuration to add an image model", kind: "Integration effort" },
        { value: "Hours vs. weeks", label: "Reported new-model release turnaround", kind: "Delivery improvement" },
        { value: "60 / 20", label: "Image models / providers supported", kind: "Scale, not savings" },
      ],
      details: [
        { label: "The friction", body: "Frequent model launches and more sophisticated agents increased integration complexity." },
        { label: "What changed", body: "Common SDK interfaces and Gamma’s middleware handle tracing, cost tracking, and image preprocessing. Model configuration supplies its capabilities, sizes, and cost formula." },
        { label: "Why it matters here", body: "A shared integration layer can make model evaluation less invasive while the room schema and executor remain ours. Thirty lines describes configuration, not all testing or integration work. No dollar saving is published." },
      ],
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
      { title: "See shared AI spend in one dashboard", body: "Aggregate Gateway-routed usage and cost across team projects, with project views and model/provider request logs. Give engineering and finance a common place to investigate spend." },
      { title: "Configure text backup providers and models", body: "Route failed or unavailable text requests to approved fallbacks rather than operating our own failover proxy. Active realtime voice sessions need a separate recovery strategy; this demo does not switch them automatically." },
      { title: "Start with the SDK the team already uses", body: "Supported OpenAI SDK calls can use Gateway by changing the endpoint, credentials, and model identifier. Pilot routing and spend visibility on the existing host; verify API compatibility before expanding. AI SDK adoption is a separate choice." },
    ],
    benefit: "Avoid building and operating another model-routing service. Centralized usage records and approved text fallbacks reduce maintenance work while the team keeps its existing application and identity systems.",
    proof: "The recorded 14-request text run returned usage and cost, and policy-routed fallback passed. A Gateway voice probe connected, and the user confirmed voice works in the preview. Voice dollar cost and serving-provider attribution remain unmeasured.",
    ownership: "Approve models and data policies, configure text fallbacks, evaluate quality, set budgets, and reconcile spend. Gateway aggregates routed usage across team projects. Voice now uses Gateway too, but missing session/provider/cost fields remain unknown; the app does not invent per-response voice costs. No automatic in-session voice fallback is implemented. Routing does not guarantee a correct plan or durable save.",
    source: { label: "AI Gateway docs", href: "https://vercel.com/docs/ai-gateway" },
    example: {
      customer: "Tailscale",
      summary: "Moved provider calls behind Gateway while keeping Aperture’s existing endpoint and identity layer.",
      context: "Published September 11, 2026. A reported internal cutover, not an uptime SLA or a measured cost saving.",
      href: "https://vercel.com/customers/how-tailscale-built-a-customer-facing-model-router-on-ai-gateway",
      metrics: [
        { value: "Seconds", label: "Company-wide internal cutover", kind: "Migration result" },
        { value: "0 interruptions", label: "Reported during that cutover", kind: "Migration result" },
        { value: "Hundreds", label: "Models available through one API", kind: "Access scale" },
      ],
      details: [
        { label: "The friction", body: "Aperture’s single endpoint still relied on separate provider integrations behind the scenes." },
        { label: "What changed", body: "The team switched downstream requests to Gateway. Employees kept using the same endpoint; Gateway returned request costs without Tailscale maintaining provider price tables." },
        { label: "Why it matters here", body: "Retain customer identity and product behavior while adopting managed model operations. The story gives no exact seconds, engineering-hours saving, or dollar saving. Its wider product also uses Sandbox." },
      ],
    },
  },
  {
    id: "functions",
    label: "Next.js + Functions",
    kind: "Managed application runtime",
    recommendation: "Let the product team ship without another server fleet.",
    alternative: "Assemble a separate planner hosting stack",
    build: [
      "Package and release the planner and APIs.",
      "Operate capacity and framework configuration.",
      "Connect runtime diagnostics and regional placement.",
    ],
    adopt: [
      { title: "Give developers a direct path to release", body: "Deploy the Next.js planner and server routes together. A product engineer can take a change from code to a running application through the same workflow, with fewer infrastructure handoffs." },
      { title: "Offload runtime capacity management", body: "Vercel manages Function execution and scaling within platform limits. Avoid provisioning a dedicated planner server fleet and maintaining its scaling setup; use that engineering capacity for renter features." },
      { title: "Use a platform aligned with Next.js", body: "Vercel maintains Next.js and integrates its deployment, rendering, and caching features. That can reduce framework-specific setup and coordination work. Existing applications still need compatibility and migration testing." },
      { title: "Pay for active CPU during AI requests", body: "With Fluid Compute, CPU billing pauses while a Function waits on models or databases. Memory remains billable while requests are in flight, with invocation and model charges additional. Compare total costs against the current workload." },
    ],
    benefit: "Protect senior engineering time and shorten the path to a customer-facing release. Compare the total cost of managed delivery with building and operating the alternative, including delayed product work, migration, usage charges, and retained operations.",
    proof: "VoxBuild’s interface and Node.js APIs deploy together. Accepted edits reach external Atlas and survive reloads.",
    ownership: "Authorization, business logic, pooling, timeouts, regional choices, and data security remain application decisions. New listings should normally arrive through the existing listing API as data updates, without a code deployment. Faster deployments benefit new features and fixes; VoxBuild does not implement listing publication. Compare platform and usage charges with existing operating costs; no saving has been measured here.",
    source: { label: "Next.js on Vercel docs", href: "https://vercel.com/docs/frameworks/full-stack/nextjs" },
    example: {
      customer: "Coxwave",
      summary: "Adopted Next.js and Vercel to reduce release overhead for its GenAI applications.",
      context: "Published August 13, 2025. Results span the Vercel platform; they are not Functions-only gains or VoxBuild measurements.",
      href: "https://vercel.com/customers/how-coxwave-delivers-genai-value-faster-with-vercel",
      metrics: [
        { value: "85% less", label: "Deployment time", kind: "Reported improvement" },
        { value: "Weekly → 2/day", label: "Production release cadence", kind: "Reported improvement" },
        { value: "52% less", label: "Production recovery time", kind: "Reported improvement" },
      ],
      details: [
        { label: "The friction", body: "Its CloudFront/S3 setup added environment and deployment overhead for dynamic Next.js applications." },
        { label: "What changed", body: "The frontend team adopted Vercel’s deployment workflow, Previews, CDN, scaling, and Instant Rollback, taking ownership of the release lifecycle." },
        { label: "Why it matters here", body: "Frontend ownership of the release lifecycle shows how developer experience can remove handoffs and return time to product work. Recovery gains include Instant Rollback, which VoxBuild has not drilled. The story reports no staffing reduction, absolute deployment minutes, or dollar saving." },
      ],
    },
  },
  {
    id: "previews",
    label: "Git + Previews",
    kind: "Managed release workflow",
    recommendation: "Give every change a review URL, without a staging ticket.",
    alternative: "Custom per-branch staging in the existing pipeline",
    build: [
      "Provision per-change review environments.",
      "Connect builds, deployments, URLs, and configuration.",
      "Maintain review links and release integrations.",
    ],
    adopt: [
      { title: "Unblock review without provisioning staging", body: "Get an automatic URL for each non-production branch deployment. Product and design can try the actual planner while engineers continue working, reducing the queue for a shared staging environment." },
      { title: "Scope configuration to the environment", body: "Use Preview-specific settings and credentials for review builds. Reduce manual environment setup; the team still needs separate test data and appropriate access protection." },
      { title: "Connect releases to the Git workflow", body: "Trigger builds and deployments from commits, with main updating Production in this demo. Replace custom review-environment plumbing while keeping the customer’s CI checks and release policies." },
    ],
    benefit: "Reduce review waiting, manual environment setup, and pipeline maintenance. Recovered developer hours can go into listing experiences and AI quality; delivery teams still own checks and release decisions.",
    proof: "Main auto-deployment and CI work. Gated promotion, canary, and a rollback drill remain proposed customer steps.",
    ownership: "Protect preview access, isolate test data, and define approval and rollout gates. Preview URLs do not automatically isolate Atlas data, and rolling back code does not undo database changes.",
    source: { label: "Vercel environment docs", href: "https://vercel.com/docs/deployments/environments" },
    example: {
      customer: "justInCase",
      summary: "Recovered developer time by removing queued or failed previews from its release workflow.",
      context: "Published November 30, 2022. Customer-reported results; team and per-developer hours describe related savings and must not be added together.",
      href: "https://vercel.com/customers/how-vercel-helped-justincase-technologies-cut-their-build-time-in-half",
      metrics: [
        { value: "72 h/month", label: "Developer time saved across the team", kind: "Reported time saving" },
        { value: ">6 h/dev/month", label: "Frontend developer time saved", kind: "Reported time saving" },
        { value: "50% faster", label: "Builds, in the story’s wording", kind: "Reported improvement" },
      ],
      details: [
        { label: "The friction", body: "Frequent small changes needed stakeholder review, but previews queued or failed and multiple delivery pipelines required maintenance." },
        { label: "What changed", body: "Vercel Previews and the deployment workflow reduced that waiting and maintenance work, leaving more time for product development." },
        { label: "Why it matters here", body: "Working review URLs can shorten feedback loops for the planner. Baseline our own review delays and engineering hours before claiming savings. The story gives no absolute before/after build times or dollar saving." },
      ],
    },
  },
];
