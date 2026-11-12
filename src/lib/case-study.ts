export type CaseStudySectionId = "scenario" | "architecture" | "vercel" | "voice" | "demo" | "outcomes" | "rollout" | "tradeoffs" | "tooling";
export type CaseStudyTone = "proof" | "target" | "retained" | "risk";

export type CaseStudyCard = {
  title: string;
  body: string;
  tone: CaseStudyTone;
  tag: string;
  value?: string;
  source?: { label: string; href: string };
};

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
  cards: CaseStudyCard[];
  details?: CaseStudyBlock[];
};

export const CASE_STUDY_SECTIONS: CaseStudySection[] = [
  {
    id: "scenario",
    label: "Customer scenario",
    title: "Help renters picture their next home",
    intro: "A fictional long-term rental marketplace wants renters to explore furniture layouts before deciding whether to tour.",
    cards: [
      { title: "The customer", body: "A rental marketplace like Apartments.com or StreetEasy. Its users are prospective tenants; its existing listings, data, identity, and release pipeline form our assumed starting point.", tone: "retained", tag: "Scenario" },
      { title: "The business case", body: "Photos cannot show a renter’s own furniture layout. Uncertainty can delay tours and create leasing questions. More qualified tours and fewer questions are hypotheses.", tone: "risk", tag: "Business friction" },
      { title: "The technical friction", body: "Custom releases and separate model integrations slow feature iterations and increase maintenance. Unvalidated AI edits risk losing tenants’ designs.", tone: "risk", tag: "Engineering friction" },
    ],
    details: [
      { title: "Scenario assumptions", body: "AWS listing/catalog/photo services, MongoDB Atlas, an existing identity provider, and a web release pipeline are assumptions for this fictional customer. They are not claims about either reference brand’s actual architecture. Conversion gains and support savings are hypotheses to test." },
    ],
  },
  {
    id: "architecture",
    label: "Architecture",
    title: "Add Vercel. Keep the customer’s core.",
    intro: "Augment the application and connect existing data; avoid a platform migration.",
    cards: [
      { title: "What stays, and why", body: "AWS services, Atlas data, and customer identity stay in place to preserve existing APIs, data ownership, and access policies.", tone: "retained", tag: "Customer systems" },
      { title: "The demo boundary", body: "Atlas writes are real. The AWS catalog is a labeled fixture. Customer SSO is proposed; the demo uses signed anonymous sessions.", tone: "retained", tag: "Explicit boundary" },
    ],
    details: [
      { title: "Why keep Atlas?", body: "A bounded scene, its revision, and command receipts fit one document. Atomic updates and revision checks protect accepted state. PostgreSQL with JSONB could also support this pattern; retaining the customer’s database is the rationale." },
      { title: "Transport and durability", body: "Text uses Vercel Functions → AI SDK → AI Gateway. Voice media connects directly from the browser to OpenAI Realtime over WebRTC. Both use the validated save API. Accepted state survives deploys; unfinished generation and voice connections do not." },
      { title: "Connectivity", body: "The demo Atlas Free/M0 cluster is on AWS US_EAST_1. Scoped database users connect over TLS. The optional HTTPS catalog adapter is an integration seam; fixture reads make no AWS request." },
    ],
  },
  {
    id: "vercel",
    label: "Vercel choices",
    title: "Why adopt Vercel instead of building it?",
    intro: "Build the renter experience. Adopt the integration and delivery layers that support it.",
    cards: [],
    details: [
      { title: "The recommendation", body: "Adopt the open-source AI SDK for application integration and managed AI Gateway for model operations. Use Next.js/Functions and Git previews for the planner’s release path. Keep AWS systems, Atlas, and customer identity. The expected return is engineering capacity for renter features, earlier feedback, and measurable AI operating costs." },
      { title: "How to make the business case", body: "Compare implementation hours, ongoing maintenance and on-call effort, platform/model charges, and release or failure costs for each option. Use the customer’s own baselines; do not turn another company’s case-study results into a savings forecast. SDK adoption has no library fee, but model usage, hosting, upgrades, and managed services still have costs." },
      { title: "When another option can fit", body: "A direct provider SDK may be enough for a stable single-model feature. An existing internal gateway or release platform may already meet the requirements. Validate the extra value of Vercel against those capabilities, network/data policies, and total cost before expanding the pilot." },
    ],
  },
  {
    id: "voice",
    label: "Why voice",
    title: "Keep your eyes on the room",
    intro: "Test a natural way to edit a visual space, with text and direct controls always available.",
    cards: [
      { title: "A useful job for voice", body: "Say “Make the sofa sage” while orbiting the room, then interrupt to refine it. The hypothesis: fewer interface steps help renters explore a layout and decide whether to tour.", tone: "target", tag: "Customer hypothesis" },
      { title: "Voice interaction has traction", value: "46%", body: "Of U.S. AI users report using voice at least sometimes: 19% primarily speak, and 27% mix speech and typing. Includes dictation and spoken prompts, not just live voice agents.", tone: "retained", tag: "2026 survey", source: { label: "Menlo Ventures / Morning Consult", href: "https://menlovc.com/perspective/2026-the-state-of-consumer-ai/" } },
      { title: "Why OpenAI Realtime + WebRTC", body: "Realtime combines speech, interruptions, and tool calls. OpenAI recommends WebRTC for consistent browser performance. VoxBuild keeps the API key on the server and sends live media directly between the browser and OpenAI.", tone: "proof", tag: "Implemented choice", source: { label: "Official OpenAI WebRTC guide", href: "https://developers.openai.com/api/docs/guides/voice-webrtc" } },
      { title: "Learn now. Keep options open.", body: "Pilot voice beside text. Both use the same scene operations and validated save path, so a future voice provider can reuse that contract. A replacement still needs transport work and evaluation.", tone: "target", tag: "Adaptable architecture" },
    ],
    details: [
      { title: "What the adoption figures establish", body: "Menlo Ventures and Morning Consult surveyed 5,067 U.S. adults in July 2026 with national weighting. The voice question was new, so it does not establish year-over-year voice growth or rental demand. The same report shows daily overall AI use rising from 19% of U.S. adults in 2025 to 25% in 2026; that is not a voice-specific growth rate." },
      { title: "Why this provider and transport", body: "OpenAI Realtime offers integrated speech interaction and tool use, avoiding a separate transcription → language model → speech synthesis pipeline for this demo. The unified WebRTC setup negotiates SDP through a Vercel Function with server-side credentials; live audio then bypasses Functions. The user confirmed edits, spoken replies, interruption, and microphone release. Evaluate provider quality, availability commitments, data policies, and cost for a customer pilot; brand reputation alone is insufficient." },
      { title: "How to earn the next investment", body: "Compare opt-in voice and text task completion, time to an accepted edit, corrections, latency, and cost. Track saved designs and qualified tour inquiries. Keep visible microphone consent, an obvious Stop action, and text controls for quiet or shared spaces. Do not call the feature future-proof or claim conversion lift before measuring it." },
      { title: "A clear Vercel boundary", body: "Vercel handles the application, session setup, and validated save API. Text generation uses AI SDK and AI Gateway; this direct OpenAI voice session does not. Voice needs separate spend tracking and its own provider-recovery strategy." },
    ],
  },
  {
    id: "demo",
    label: "Demo",
    title: "Turn a conversation into a room",
    intro: "Type or speak one prompt at a time. Show the visual change, ask a question, then reload to check the saved result.",
    cards: [
      { title: "Change the atmosphere", body: "“Change the style of the room to midnight.” Show the new palette and lighting while the furniture stays in place.", tone: "proof", tag: "Room style" },
      { title: "Add and personalize", body: "In Blank canvas: “Add a sofa.” Then: “Change the color of the sofa to sage.” Show a new catalog item and a precise follow-up edit.", tone: "proof", tag: "Furniture" },
      { title: "Layer the lighting", body: "In Sunlit studio: “Add another lamp next to the sofa.” Show that a second lamp is added while existing furniture is preserved.", tone: "proof", tag: "Context-aware edit" },
      { title: "Ask about the budget", body: "“How much does all the furniture in the room cost?” Compare the answer with Furniture estimate. Prices are illustrative catalog values.", tone: "proof", tag: "Read-only question" },
      { title: "Explore a different layout", body: "Choose Quiet bedroom. “Move the bed half a meter to the right.” Or: “Rearrange the room for better feng shui. Keep a clear path through the room.” Review the proposed layout.", tone: "target", tag: "Exploratory prompt" },
      { title: "Show that it persists", body: "Open Architecture for returned operations and request metadata. Reload the saved room to confirm accepted changes crossed the Atlas boundary.", tone: "proof", tag: "Inspect and reload" },
    ],
    details: [
      { title: "A short presentation flow", body: "Start with Sunlit studio: midnight style → sage sofa → another lamp → furniture cost → inspect and reload. Use Blank canvas to demonstrate adding a sofa, and Quiet bedroom for moving a bed. Opening this guide stops voice; close it and reconnect the microphone before speaking." },
      { title: "What these prompts demonstrate", body: "Room styles, additions, recolors, moves, and rotations use bounded scene operations. Budget answers use a calculated catalog estimate supplied to the model; compare the answer with Furniture estimate. Broad layout requests may need clarification. Feng shui is an exploratory design request, not a validated assessment; the demo has no complete circulation or collision solver." },
      { title: "Demonstrate Gateway routing", body: "The configured text primary is OpenAI gpt-4.1-mini; the backup is Google gemini-2.5-flash. Turn on Test Gateway fallback in Architecture, then submit a text prompt. Observed activity shows the requested route and Gateway’s executed model/provider. The switch restricts routing to Google, excluding the primary before execution; it is a real Gateway policy test, not an induced provider outage. Voice uses a separate OpenAI Realtime connection." },
      { title: "Recorded checks", body: "76 deterministic schema, domain, storage, voice-coordination, Gateway-telemetry, furniture-estimate, and admission-policy tests passed. The deployed storage, room/artwork, and text-command reports passed 38/38 checks. These suggested presentation prompts are not all individually covered by that evaluation." },
      { title: "Evidence scope", body: "The November 12 production reports contain 10 storage, 14 room/artwork, and 14 semantic text checks, with persisted rereads. These are recorded checks, not a live health monitor or a production reliability estimate." },
      { title: "Voice evidence", body: "The user confirmed deployed voice edits, speech, interruption, and Stop releasing the microphone. A synthetic Realtime session separately checked current tool/audio compatibility without a browser microphone or Atlas writes. Browser voice latency remains unmeasured." },
      { title: "Reviewable implementation", body: "The public repository preserves incremental history and decision comments. The demo includes six authored rooms, 14 furniture SKUs, six environment styles, and five painting designs." },
    ],
  },
  {
    id: "outcomes",
    label: "Success metrics",
    title: "Measure delivery, cost, and renter value",
    intro: "Four assessment outcomes, plus renter value.",
    cards: [
      { title: "Faster delivery", body: "Track release time and engineer hours against the current pipeline. Savings are not yet measured.", tone: "target", tag: "Baseline needed" },
      { title: "Less provider-specific code", body: "OpenAI and Google share one text executor. Voice is separate; maintenance savings are unmeasured.", tone: "proof", tag: "Shared path proven" },
      { title: "Cost per model / run", value: "$0.0177", body: "Total for 14 text requests; each returned usage and cost. Excludes voice and unpriced failures.", tone: "proof", tag: "Recorded sample" },
      { title: "Resilience & fallback", value: "14 / 14", body: "Text checks; p95 2.76 s. Pilot: ≥90% success, warm p95 <5 s. Real outage untested.", tone: "proof", tag: "Recorded sample" },
      { title: "Tenant and business value", body: "Compare tour requests per eligible visitor. Track saved designs, support contacts, and cost per accepted edit. No conversion lift claimed.", tone: "target", tag: "Pilot needed" },
    ],
    details: [
      { title: "How to judge the pilot", rows: [
        { label: "Faster path from prototype to production", value: "Measure approved change → validated preview/production time, engineer hours, and rollback time. Set the improvement threshold after baselining the existing pipeline." },
        { label: "Less provider-specific application code", value: "Count provider-specific integrations, files changed, and time to switch approved text models. Keep the scene schema, executor, and persistence contract unchanged; qualify each model on the same semantic suite." },
        { label: "Per-model or per-run cost visibility", value: "Attribute executed model/provider, tokens, cost, latency, and outcome by request. Mark missing prices as unknown. Reconcile provider spend, priced failures, and separate voice accounting before setting customer budgets." },
        { label: "Improved resilience through model flexibility and failover", value: "Measure semantic success, p95 latency, invalid-write rejection, and save/reload recovery by model route. Exercise a real provider outage and rollback. Benchmark voice separately." },
        { label: "Business outcomes", value: "Compare eligible planner and control cohorts. Pre-agree pilot duration, sample size, minimum worthwhile tour-conversion lift, support guardrails, and cost limits. Track suitability-support contacts per 1,000 eligible visitors." },
      ] },
      { title: "Read the results accurately", body: "November 12: text passed 14/14 with p50 1,802 ms, p95 2,762 ms, and $0.0176794 returned cost. An earlier October run had a 9,800 ms p95. Small regression samples are not performance guarantees. Policy-driven fallback is proven; provider-outage recovery is not. The assessment supplies no numeric pass marks; ≥90% and <5 seconds are our proposed pilot gates." },
    ],
  },
  {
    id: "rollout",
    label: "Rollout",
    title: "Expand after the pilot earns it",
    intro: "Main deploys automatically; the customer rollout below is proposed.",
    cards: [
      { title: "Preview + validation", body: "Isolate credentials. Run build, domain, AI, persistence, and browser checks before exposing the change.", tone: "target", tag: "Before launch" },
      { title: "Canary + cutover", body: "Start internally, then a small cohort. Expand when technical guardrails and agreed business outcomes hold.", tone: "target", tag: "Controlled rollout" },
      { title: "Rollback", body: "Disable the planner or restore compatible code. Preserve designs: code rollback does not reverse database changes.", tone: "target", tag: "Recovery plan" },
    ],
    details: [
      { title: "What remains to exercise", body: "The demo has not exercised Preview-to-Production promotion, a canary, or a timed rollback. Add release gates and rehearse recovery before a customer pilot. Readers must remain compatible with newer optional scene fields." },
    ],
  },
  {
    id: "tradeoffs",
    label: "Risks & limits",
    title: "Be explicit before customer kickoff",
    intro: "This is a working concept preview with limits to resolve before a pilot.",
    cards: [
      { title: "Access and privacy", body: "Add customer authorization, retention rules, and restricted database access. Losing the anonymous-session cookie loses access to its design.", tone: "risk", tag: "Before a pilot" },
      { title: "Cost and recovery", body: "Voice needs separate accounting and spending controls. After a save timeout, reload saved state before retrying.", tone: "risk", tag: "Operating risk" },
      { title: "Concept, not certified fit", body: "Rooms are authored presets. Photo reconstruction, automatic measurement, and stronger collision/circulation checks are outside this slice.", tone: "risk", tag: "Product scope" },
    ],
    details: [
      { title: "Network access", body: "The approved Atlas 0.0.0.0/0 demo access rule has no automatic expiry. Remove it after the demo; restricted connectivity is required before a customer pilot. TLS and scoped database users remain in place." },
      { title: "Retry and durability limits", body: "Retained exact manual/voice commands can be replayed through command receipts. The full text-generation endpoint is not idempotent. A timeout may follow a committed save, so reload canonical state before retrying. Accepted state survives deployments; unfinished generation and voice connections do not." },
      { title: "Deferred infrastructure", body: "Vercel Blob and durable Workflows are not used. Browser timers and admission limits are not hard provider spending caps." },
    ],
  },
  {
    id: "tooling",
    label: "Tools & ownership",
    title: "AI assisted the build. I own the result.",
    intro: "Codex desktop and collaborating agents supported implementation, review, and validation.",
    cards: [
      { title: "Development tooling", body: "TypeScript, Next.js, Codex desktop, and collaborating agents. Incremental commits and decision comments preserve how the work evolved.", tone: "proof", tag: "Disclosed" },
      { title: "Validation", body: "Build/type checks, deterministic tests, a 14-case semantic evaluation, real-provider checks, Atlas rereads, and desktop/mobile walkthroughs.", tone: "proof", tag: "Reviewed behavior" },
      { title: "Candidate ownership", body: "Explain boundaries, defend trade-offs, debug failures, and adapt when the interviewer changes a constraint.", tone: "target", tag: "Live discussion" },
    ],
    details: [
      { title: "AI behavior review", body: "The semantic suite checks requested state changes, unmentioned-state preservation, revisions, and persisted rereads. Invalid plans are rejected before commit. Small evaluations do not establish general model accuracy, business uplift, or an availability SLA." },
    ],
  },
];
