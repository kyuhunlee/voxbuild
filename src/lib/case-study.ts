export type CaseStudySectionId = "scenario" | "architecture" | "vercel" | "boundary" | "demo" | "rollout" | "outcomes" | "tradeoffs";

export type CaseStudyBlock = {
  title: string;
  body?: string;
  bullets?: string[];
  rows?: { label: string; value: string }[];
};

export type CaseStudySection = {
  id: CaseStudySectionId;
  label: string;
  title: string;
  intro: string;
  blocks: CaseStudyBlock[];
};

export const CASE_STUDY_SECTIONS: CaseStudySection[] = [
  {
    id: "scenario",
    label: "Customer & pain",
    title: "Help tenants picture a home",
    intro: "A realistic rental-platform scenario: listings and catalog services run on AWS, application documents live in MongoDB Atlas, and the customer already has an identity system and a web release pipeline.",
    blocks: [
      {
        title: "Where the experience slows down",
        body: "Photos and static plans leave tenants to imagine furniture arrangements and a home-office setup. Uncertainty can delay a tour decision and send repetitive suitability questions to leasing teams. The conversion impact is a hypothesis to measure, not a demonstrated gain.",
      },
      {
        title: "Where the architecture becomes hard to operate",
        bullets: [
          "Bespoke release and preview work slows experiments, so useful listing features take longer to reach tenants.",
          "Separate model integrations make provider changes and cost attribution harder, increasing maintenance work and obscuring cost per interaction.",
          "Generated edits, retries, and competing saves can corrupt a design without validation and concurrency controls, losing tenants’ work and trust.",
        ],
      },
    ],
  },
  {
    id: "architecture",
    label: "Where Vercel fits",
    title: "Augment the platform. Connect the data.",
    intro: "VoxBuild is the deployed planner slice of a larger rental-platform architecture. Vercel adds the application and text AI layer while the customer retains its systems of record.",
    blocks: [
      {
        title: "Two inputs, one accepted state",
        rows: [
          { label: "Text", value: "Browser → Vercel Function → AI SDK and AI Gateway → proposed operations." },
          { label: "Voice", value: "Browser ↔ OpenAI Realtime over WebRTC → completed tool calls returned through the browser." },
          { label: "Shared save path", value: "Server validation → atomic Atlas update → acknowledged scene → browser rendering." },
        ],
      },
      {
        title: "The deliberate boundary",
        body: "The model proposes bounded edits; it cannot write directly to the database or execute generated code. Three.js renders locally on the visitor’s device. Vercel Functions handle credentials, ownership, model requests, and saves. Accepted room state survives a deployment; an unfinished generation or voice connection does not.",
      },
    ],
  },
  {
    id: "vercel",
    label: "Vercel choices",
    title: "Four primitives with specific jobs",
    intro: "The assessment asks for three or more Vercel products or primitives, including an AI primitive. These choices support the working slice without adding unnecessary infrastructure.",
    blocks: [
      {
        title: "What we use and why",
        rows: [
          { label: "Next.js on Vercel Functions", value: "Delivers the web application and Node.js request handlers together. Database connections and model waits still need pooling, timeouts, and regional planning." },
          { label: "AI SDK", value: "Turns text requests into structured plans through a shared model interface. Valid JSON can still be wrong, so domain validation remains authoritative." },
          { label: "AI Gateway", value: "Centralizes text-model access, routing, configured fallback, and returned usage/cost metadata. Voice uses a separate direct provider path." },
          { label: "Git deployments and Preview Deployments", value: "Makes each change reviewable and deployable. Main deploys automatically; a gated Preview promotion and canary rollout remain proposed operating steps." },
        ],
      },
    ],
  },
  {
    id: "boundary",
    label: "What stays",
    title: "Preserve the customer’s existing world",
    intro: "This is an incremental addition to a rental platform, rather than a migration of its listings, data, and identity. The demo distinguishes the target integration from the systems it actually exercises.",
    blocks: [
      {
        title: "Outside Vercel",
        rows: [
          { label: "AWS listings, photos, and catalog", value: "Stay under the customer’s ownership. The demo uses a labeled catalog fixture; an optional HTTPS metadata adapter provides the integration seam. Fixture reads make no AWS request." },
          { label: "MongoDB Atlas", value: "Remains the durable scene store in the scenario. The demo uses a new Free/M0 cluster on AWS US_EAST_1 and has verified real writes and rereads." },
          { label: "Customer identity", value: "Stays with the existing identity provider in the target design. The public demo uses signed anonymous sessions, not customer SSO." },
        ],
      },
      {
        title: "Why Atlas fits",
        body: "A bounded room is loaded and saved as one document, including its revision and command receipts. PostgreSQL with JSONB could support the same pattern; retaining the customer’s database is the architectural rationale.",
      },
    ],
  },
  {
    id: "demo",
    label: "Demo & evidence",
    title: "A small slice with a complete save path",
    intro: "Explore six authored rooms, 14 furniture SKUs, six environment styles, and five painting designs. Use the canned prompts, type a request, speak after enabling the microphone, or edit through the controls.",
    blocks: [
      {
        title: "What the reviewer can prove",
        body: "Change a piece, inspect the operation in Architecture, then reload the saved room. The public Vercel URL and public GitHub repository make the implementation reviewable; incremental history and decision comments preserve its evolution.",
      },
      {
        title: "Recorded on October 19, 2026",
        bullets: [
          "52 deterministic domain, storage, schema, and voice-coordination tests passed.",
          "Production passed 10 storage checks, 14 room/artwork checks, and the final 14-case text regression with Atlas rereads.",
          "The user confirmed deployed voice edits, speech, interruption, and Stop releasing the microphone. Policy-routed fallback was tested; provider-outage recovery was not.",
        ],
      },
      {
        title: "Refined on November 12, 2026",
        body: "59 deterministic tests passed after fixes for stale text responses and interrupted voice turns. Local storage checks passed 10/10; a synthetic Realtime session validated painting edits and audio output without microphone access or Atlas writes. Desktop and mobile checks covered the guide and saved-edit reload.",
      },
    ],
  },
  {
    id: "rollout",
    label: "Rollout & recovery",
    title: "Expand only after the guardrails hold",
    intro: "GitHub main already triggers Production deployments. The sequence below is a proposed customer rollout; this demo has not exercised a canary or Preview-to-Production promotion.",
    blocks: [
      {
        title: "From preview to pilot",
        bullets: [
          "Preview: isolate database credentials and sessions; run build, type, domain, live API, and browser checks.",
          "Canary: start with internal users, then a small property or visitor cohort. Staged traffic controls are not implemented here.",
          "Cutover: expand when error, latency, semantic-success, and cost guardrails hold and product evidence supports the experience.",
        ],
      },
      {
        title: "Recover without losing accepted designs",
        body: "Disable the planner entry point or restore a compatible deployment. Code rollback does not undo database changes; retain readers for the newer optional scene fields. If a save times out, reload canonical state before retrying. Exact retained manual/voice commands are replayable; the full text-generation endpoint is not idempotent.",
      },
    ],
  },
  {
    id: "outcomes",
    label: "Success measures",
    title: "Separate engineering proof from business value",
    intro: "Agree baselines, pilot duration, sample size, and success thresholds with the customer. The recorded checks demonstrate a working slice; they do not establish a conversion improvement or a production reliability rate.",
    blocks: [
      {
        title: "Technical guardrails",
        body: "Initial targets: at least 90% semantic success on the command suite, rejection of invalid domain mutations, successful save/reload checks, and warm-pilot p95 text response below five seconds. Measure voice end-of-utterance to visible change separately.",
      },
      {
        title: "A measured improvement area",
        body: "The final October 19 text run passed 14/14, with median 1,403 ms and p95 9,800 ms. Returned Gateway cost was $0.0172744 across 14 requests. The latency tail exceeds the proposed target; this small sample excludes voice cost and is not total account spend.",
      },
      {
        title: "Business pilot",
        body: "Compare qualified tour-request conversion, planning engagement, abandonment, and suitability-related support questions. Include accessibility feedback and cost per successful interaction before expanding the pilot.",
      },
    ],
  },
  {
    id: "tradeoffs",
    label: "Scope & ownership",
    title: "Know what this proof does and does not cover",
    intro: "The assessment rewards architectural judgment and ownership. This slice prioritizes a working interaction, validation, and persistence over a broad feature list.",
    blocks: [
      {
        title: "Deliberate limits",
        bullets: [
          "Photo reconstruction, automatic measurement, Vercel Blob, and durable Workflows are deferred. Rooms are authored presets.",
          "This is a conceptual preview. Furniture collision, circulation clearance, and real-world fit need stronger verification.",
          "Direct Realtime voice adds separate provider dependence and accounting. Admission limits and a browser timer are not hard spending caps.",
        ],
      },
      {
        title: "Before a customer pilot",
        body: "Add customer authorization, provider budgets, restricted connectivity, and retention controls. The approved demo Atlas 0.0.0.0/0 access rule has no automatic expiry and must be removed after the demo. Cookie loss also means losing access to an anonymous design.",
      },
      {
        title: "Development ownership",
        body: "Built with Codex desktop and collaborating agents, TypeScript, tests, real-provider evaluations, and browser checks. The candidate owns explaining, defending, debugging, and changing the final implementation. The live discussion may change a constraint such as region, budget, or identity.",
      },
    ],
  },
];
