export type CaseStudySectionId = "scenario" | "architecture" | "vercel" | "developer-roi" | "voice" | "demo" | "outcomes" | "rollout" | "tradeoffs" | "tooling";
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
    intro: "Help renters decide whether to tour—and help the product team test that experience without building another delivery and AI operations stack.",
    cards: [
      { title: "The customer", body: "A fictional long-term rental marketplace in the category of Apartments.com or StreetEasy. Assume a self-hosted Next.js listing app, an existing OpenAI SDK feature, AWS listing/catalog/photo services, Atlas, and customer identity.", tone: "retained", tag: "Assumed starting point" },
      { title: "The business case", body: "Photos cannot show a renter’s own furniture layout. Uncertainty can delay tours and create leasing questions. More qualified tours and fewer questions are hypotheses.", tone: "risk", tag: "Business friction" },
      { title: "The technical friction", body: "Assume review environments and releases require infrastructure handoffs. Adding another model integration and hosting stack would consume senior engineering time, delaying the renter experiment. AI edits also need validation before they touch saved designs.", tone: "risk", tag: "Engineering friction" },
      { title: "The proposed pilot", body: "Launch VoxBuild alongside the listing app. Test whether a saved, interactive room preview helps renters decide on a tour, while measuring whether managed delivery and model access reduce the effort to ship and operate it.", tone: "target", tag: "One bounded investment" },
    ],
    details: [
      { title: "Scenario assumptions", body: "The current stack and release friction are discovery assumptions, not claims about either reference brand. Confirm them with the customer before sizing a pilot. The planner is a new feature; the existing OpenAI SDK integration keeps running. Conversion gains, support savings, and recovered engineering capacity are hypotheses to test." },
      { title: "Discovery that changes the recommendation", body: "Ask where renters abandon the journey, how long a change waits for review and release, who maintains model integrations, and whether approved room dimensions and catalog data exist. If the current platform already solves delivery well, evaluate Gateway on the existing host before proposing a hosting change." },
    ],
  },
  {
    id: "architecture",
    label: "Architecture",
    title: "Add Vercel. Keep the customer’s core.",
    intro: "Augment the marketplace with a Vercel-hosted planner. Connect its data through existing APIs; keep the core listing application running where it is.",
    cards: [
      { title: "What stays, and why", body: "The self-hosted Next.js app, its OpenAI SDK feature, AWS services, Atlas, and identity remain. Preserve existing product behavior, data ownership, and access policies; integrate the planner at a controlled boundary.", tone: "retained", tag: "Customer systems" },
      { title: "What Vercel takes on", body: "Next.js/Functions and Previews deliver the new planner. AI SDK and Gateway handle its model integration and access. This replaces work the team would otherwise add for this feature, without replacing the marketplace.", tone: "target", tag: "Augment + connect" },
      { title: "The demo boundary", body: "Authored rooms and a catalog fixture stand in for approved property data. Writes to a dedicated demo Atlas cluster are real. Listing launch, customer SSO, and the return to a tour inquiry are proposed integrations.", tone: "retained", tag: "Implemented vs proposed" },
    ],
    details: [
      { title: "Why keep Atlas?", body: "A bounded scene, its revision, and command receipts fit one document. Atomic updates and revision checks protect accepted state. PostgreSQL with JSONB could also support this pattern; retaining the customer’s database is the rationale." },
      { title: "Transport and durability", body: "Text uses Vercel Functions → AI SDK → AI Gateway. Voice uses AI SDK’s normalized realtime transport over a Gateway WebSocket relay to OpenAI. A server Function issues a 60-second client token. Text calls the shared executor internally; completed voice tools return through the browser to the command API. Accepted state survives deployments; an active voice session does not." },
      { title: "Connectivity", body: "The demo Atlas Free/M0 cluster is on AWS US_EAST_1. Scoped database users connect over TLS. The optional HTTPS catalog adapter is an integration seam; fixture reads make no AWS request." },
    ],
  },
  {
    id: "vercel",
    label: "Vercel choices",
    title: "Why adopt Vercel instead of building it?",
    intro: "For this pilot, combine four choices: ship the planner with Next.js/Functions and Previews, and manage its AI with AI SDK and Gateway.",
    cards: [],
    details: [
      { title: "The recommendation", body: "Pilot the new planner on Vercel alongside existing listings. Previews address review waiting; Functions reduce planner runtime upkeep; AI SDK provides a shared integration; Gateway handles model access and routing. Preserve the current listing app, its OpenAI SDK feature, AWS systems, Atlas, and identity. Expand only when the pilot earns its migration and operating cost." },
      { title: "If they already use the OpenAI SDK", body: "There is no requirement to rewrite the existing feature. Supported OpenAI SDK calls can adopt Gateway through endpoint, credential, and model changes, subject to compatibility testing. If delivery is already effective, Gateway on the existing host may be enough. Adopt AI SDK feature by feature when shared tools, structured output, and provider integration justify that work." },
      { title: "How to make the business case", body: "Compare implementation hours, ongoing maintenance and on-call effort, platform/model charges, and release or failure costs for each option. Use the customer’s own baselines; do not turn another company’s case-study results into a savings forecast. SDK adoption has no library fee, but model usage, hosting, upgrades, and managed services still have costs." },
      { title: "When another option can fit", body: "A direct provider SDK may be enough for a stable single-model feature. An existing internal gateway or release platform may already meet the requirements. Validate the extra value of Vercel against those capabilities, network/data policies, and total cost before expanding the pilot." },
    ],
  },
  {
    id: "developer-roi",
    label: "Developer ROI",
    title: "Ship more. Own less infrastructure.",
    intro: "Senior engineering time is part of the platform cost. Reduce delivery overhead so the team can launch, learn from renters, and improve the product sooner.",
    cards: [
      { title: "Protect senior engineering time", body: "Custom preview environments, cache coordination, and rollout tooling consume experienced engineers’ time. Managed delivery can reduce that upkeep and the need to staff a separate platform effort around the planner.", tone: "target", tag: "Build versus buy" },
      { title: "Get to renter feedback sooner", body: "Every release delayed by infrastructure also delays learning. Preview links and a shared Git workflow help the team put room-planning improvements in front of reviewers and renters sooner.", tone: "target", tag: "Speed to market" },
      { title: "Match CPU spend to active work", body: "With Fluid Compute, CPU billing pauses during model or database waits. Memory remains billable while requests are in flight; invocation and model charges still apply. Benchmark the full workload before forecasting savings.", tone: "retained", tag: "Compute economics", source: { label: "Fluid Compute pricing explained", href: "https://vercel.com/docs/functions/usage-and-pricing" } },
      { title: "Scale with a focused product team", body: "Vercel’s Factory story describes scaling its Next.js backend, internal tooling, and security without a dedicated infrastructure team. It illustrates an operating model; it does not establish VoxBuild’s capacity or staffing needs.", tone: "retained", tag: "Factory customer story", source: { label: "Read the Factory customer story", href: "https://vercel.com/customers/how-factory-scaled-its-cloud-backend-to-one-billion-monthly-requests-on-vercel" } },
      { title: "Published customer evidence", value: "72 h / month", body: "justInCase Technologies reports saving 72 hours of developer time per month across its team with Vercel. This is another customer’s result, not measured VoxBuild savings or a forecast for this marketplace.", tone: "retained", tag: "justInCase team result", source: { label: "Read the justInCase customer story", href: "https://vercel.com/customers/how-vercel-helped-justincase-technologies-cut-their-build-time-in-half" } },
      { title: "Put a value on the capacity", body: "Value recovered engineering hours, then deduct incremental platform, usage, migration, and remaining operations costs. Count realized cash savings only when spending actually falls or a planned hire is avoided.", tone: "target", tag: "Customer baseline needed" },
    ],
    details: [
      { title: "Price the work behind the cloud bill", body: "Compare platform charges with the engineering time to build, maintain, and troubleshoot the alternative. Use the customer’s loaded labor cost and measured effort, including reviews, cache coordination, release tooling, and on-call work. Record delayed product experiments as opportunity cost; do not assume every week saved becomes revenue." },
      { title: "Where these benefits apply in VoxBuild", body: "Git deployments, previews, and Functions are part of this demo. Canary rollout and rollback drills remain proposed; custom cache coordination is an example of work to assess in the customer’s existing platform. Fluid economics concern Function execution, including text requests that wait on models or Atlas. The continuous voice connection runs through Gateway’s relay, not a long-running application Function. No Fluid cost comparison has been measured." },
      { title: "What the team still owns", body: "Managed services can reduce the need to build a DevOps team around this planner; they do not eliminate operations. The customer still owns IAM and security, SSO integration, data governance, incident response, and model evaluations, plus application and dependency maintenance. Confirm accountable owners before a pilot." },
      { title: "A transparent annual model", body: "Annual capacity value = recovered engineering hours per month × loaded hourly cost × 12. Deduct incremental platform and model-usage costs, migration effort, and remaining operations costs not already reflected in recovered hours. Use the customer’s measured baseline and compare like-for-like workloads; no customer dollar savings are measured here." },
      { title: "Capacity is not automatically cash", body: "Time redirected to renter features is recovered capacity. A reduced contractor bill or a documented avoided future hire can become cash savings. Do not count the same hours again as both capacity value and staffing savings, and do not subtract remaining operations twice. Track any conversion benefit separately until a pilot establishes it." },
      { title: "Prove the developer experience", body: "Baseline review wait time, approved change to validated preview/production, release and rollback effort, maintenance hours, and on-call load. Compare the planner pilot with the current workflow and ask developers whether they can review and ship without waiting for environment support. Expand the adopted services only where those benefits justify their cost; Gateway alone remains an alternative if delivery is not the bottleneck." },
    ],
  },
  {
    id: "voice",
    label: "Why voice",
    title: "Keep your eyes on the room",
    intro: "Voice is an experiment in easier room exploration: keep the renter’s eyes on the layout while they make changes. Compare it with text and direct controls.",
    cards: [
      { title: "A useful job for voice", body: "Say “Make the sofa sage” while orbiting the room, then interrupt to refine it. The hypothesis: fewer interface steps help renters explore a layout and decide whether to tour.", tone: "target", tag: "Customer hypothesis" },
      { title: "Voice interaction has traction", value: "46%", body: "Of U.S. AI users report using voice at least sometimes: 19% primarily speak, and 27% mix speech and typing. Includes dictation and spoken prompts, not just live voice agents.", tone: "retained", tag: "2026 survey", source: { label: "Menlo Ventures / Morning Consult", href: "https://menlovc.com/perspective/2026-the-state-of-consumer-ai/" } },
      { title: "One Gateway for text and voice", body: "AI SDK carries realtime events and audio through Gateway’s WebSocket relay to OpenAI. A server Function issues a 60-second client token; the long-lived Gateway API key stays on the server.", tone: "retained", tag: "Architecture choice", source: { label: "Official Gateway realtime guide", href: "https://vercel.com/docs/ai-gateway/modalities/realtime" } },
      { title: "One scene contract. Clear limits.", body: "Voice and text share validated room operations. A new voice provider still needs audio and tool evaluation. Active voice sessions do not automatically switch to a fallback model.", tone: "target", tag: "Evaluate before expanding" },
    ],
    details: [
      { title: "What the adoption figures establish", body: "Menlo Ventures and Morning Consult surveyed 5,067 U.S. adults in July 2026 with national weighting. The voice question was new, so it does not establish year-over-year voice growth or rental demand. The same report shows daily overall AI use rising from 19% of U.S. adults in 2025 to 25% in 2026; that is not a voice-specific growth rate." },
      { title: "Why this provider and transport", body: "OpenAI Realtime handles speech interaction and tool use. AI SDK normalizes events and audio; Gateway relays the browser WebSocket session. The /api/realtime-token Function authenticates the visitor, loads their owned scene, applies admission limits, and requests a client token with a 60-second expiry using a server-only Gateway API key. The save API remains the authoritative authorization and domain boundary. Realtime interfaces are beta: evaluate upgrades, quality, availability, data policies, and cost before a customer pilot." },
      { title: "How to earn the next investment", body: "Compare opt-in voice and text task completion, time to an accepted edit, corrections, latency, and cost. Track saved designs and qualified tour inquiries. Keep visible microphone consent, an obvious Stop action, and text controls for quiet or shared spaces. Do not call the feature future-proof or claim conversion lift before measuring it." },
      { title: "A clear Vercel boundary", body: "Both text and voice now use AI Gateway. Gateway supports observability and spending controls for routed realtime sessions, but this app must not infer serving provider or per-response cost from the model name. Missing voice cost is unknown. Text fallback policy is separate from voice: there is no automatic in-session voice failover." },
    ],
  },
  {
    id: "demo",
    label: "Demo",
    title: "Turn a conversation into a room",
    intro: "Show one renter task, inspect how it was handled, then prove the design was saved. Each step tests part of the recommendation.",
    cards: [
      { title: "1. Help a renter explore", body: "In Sunlit studio: “Change the style of the room to midnight.” Then: “Add another lamp next to the sofa.” Show a targeted change while the rest of the design stays intact.", tone: "proof", tag: "Customer experience" },
      { title: "2. Ground an answer in data", body: "“How much does all the furniture in the room cost?” Compare the answer with Furniture estimate. The model receives a calculated total from the illustrative catalog; this is not a retailer quote.", tone: "proof", tag: "Bounded AI behavior" },
      { title: "3. Inspect the model route", body: "Architecture → Activity → Test Gateway fallback. Type “Make the sofa sage.” Inspect executed google/gemini-2.5-flash, provider Google, and returned usage/cost. This tests a Google-only policy, not an outage.", tone: "proof", tag: "Managed model operations" },
      { title: "4. Show what survives", body: "Reload the saved room and check the accepted changes. Then show a branch Preview URL to explain the review workflow. Atlas persistence and review environments support the pilot; neither establishes conversion uplift.", tone: "proof", tag: "Data + delivery boundary" },
      { title: "Optional: add and personalize", body: "In Blank canvas: “Add a sofa.” Then: “Change the color of the sofa to sage.” Try the same edit by voice, interrupt a reply, and use Stop. Reconnect voice after closing this guide.", tone: "target", tag: "Explore the interaction" },
      { title: "Optional: try another layout", body: "In Quiet bedroom: “Move the bed half a meter to the right.” In Work from home: “Rearrange the room for better feng shui. Keep a clear path through the room.” Review the result; this is not certified fit or circulation analysis.", tone: "target", tag: "Exploratory prompt" },
    ],
    details: [
      { title: "A short presentation flow", body: "Start with Sunlit studio: midnight style → another lamp → furniture cost → Google-only Gateway test with sage sofa → inspect and reload → branch Preview URL. This links renter exploration, grounded AI, managed routing, retained data, and developer review. Prepare an accessible Preview before presenting; automatic previews do not prove a gated promotion. Opening this guide stops voice; close it and reconnect before speaking." },
      { title: "What these prompts demonstrate", body: "Room styles, additions, recolors, moves, and rotations use bounded scene operations. Budget answers use a calculated catalog estimate supplied to the model; compare the answer with Furniture estimate. Broad layout requests may need clarification. Feng shui is an exploratory design request, not a validated assessment; the demo has no complete circulation or collision solver." },
      { title: "Demonstrate Gateway routing", body: "With a sofa in the room, open Architecture → Activity and enable Test Gateway fallback. Type “Make the sofa sage.” The Google-only test policy excludes the configured primary openai/gpt-4.1-mini; inspect the returned executed model google/gemini-2.5-flash and provider Google in Observed activity. The switch resets after this submission. This is genuine Gateway text routing, not an outage simulation or voice failover. Reload the saved room to verify the accepted edit persisted." },
      { title: "Recorded checks", body: "85 deterministic tests passed, covering schema/domain rules, storage, voice coordination, Gateway telemetry, furniture estimates, admission policy, and the new Gateway realtime adapter and server configuration. The production build also passed. Earlier deployed storage, room/artwork, and text-command reports passed 38/38 checks; those reports do not validate the new browser voice path or every suggested presentation prompt." },
      { title: "Evidence scope", body: "The November 12 production reports contain 10 storage, 14 room/artwork, and 14 semantic text checks, with persisted rereads. These are recorded checks, not a live health monitor or a production reliability estimate." },
      { title: "Voice evidence", body: "A live Gateway WebSocket probe connected successfully and reported the configured openai/gpt-realtime-2.1 session model. Normalized token usage was available; serving-provider identity and dollar cost were not. The user confirmed microphone edits, spoken replies, interruption, and Stop on Gateway voice Preview 1587666. This is user-reported browser behavior, not instrumented timing or cleanup proof. Earlier microphone checks used the previous transport. Browser voice latency and per-response voice cost remain unmeasured." },
      { title: "Reviewable implementation", body: "The public repository preserves incremental history and decision comments. The demo includes six authored rooms, 14 furniture SKUs, six environment styles, and five painting designs." },
    ],
  },
  {
    id: "outcomes",
    label: "Success metrics",
    title: "Measure delivery, cost, and renter value",
    intro: "Measure the four assessment outcomes against the customer’s baseline, then test whether the planner earns its place in the renter journey.",
    cards: [
      { title: "Faster delivery", body: "Compare review wait, release effort, maintenance hours, and on-call load with the customer’s current workflow. Measure capacity returned to renter features; delivery and staffing savings are not yet measured.", tone: "target", tag: "Customer baseline needed" },
      { title: "Less provider-specific code", body: "OpenAI and Google share one text executor. Voice shares Gateway access and the scene contract; maintenance savings still need a baseline.", tone: "proof", tag: "Shared text path proven" },
      { title: "Cost per model / run", value: "$0.0177", body: "Total for 14 text requests; each returned usage and cost. Excludes voice and unpriced failures.", tone: "proof", tag: "Recorded sample" },
      { title: "Resilience & fallback", value: "14 / 14", body: "Text checks; p95 2.76 s. Pilot: ≥90% success, warm p95 <5 s. Real outage untested.", tone: "proof", tag: "Recorded sample" },
      { title: "Tenant and business value", body: "Compare tour requests per eligible visitor. Track saved designs, support contacts, and cost per accepted edit. No conversion lift claimed.", tone: "target", tag: "Pilot needed" },
    ],
    details: [
      { title: "How to judge the pilot", rows: [
        { label: "Faster path from prototype to production", value: "Baseline the customer’s review wait, approved change → validated preview/production time, release/rollback effort, maintenance hours, and on-call load. Track recovered product capacity and any documented avoided staffing separately; agree the improvement threshold after measuring the current workflow." },
        { label: "Less provider-specific application code", value: "Count provider-specific integrations, files changed, and time to switch approved text models. Keep the scene schema, executor, and persistence contract unchanged; qualify each model on the same semantic suite." },
        { label: "Per-model or per-run cost visibility", value: "Attribute executed model/provider, tokens, cost, latency, and outcome by request. Mark missing prices as unknown. Reconcile provider spend and priced failures; account for Gateway realtime sessions separately from the recorded text sample." },
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
    intro: "Keep the existing listing journey available. Expand the planner only when delivery effort, total cost, and renter outcomes support the decision.",
    cards: [
      { title: "Preview + validation", body: "Confirm approved room data, SSO, owners, and baselines. Isolate Preview credentials and run domain, AI, persistence, and browser checks. Agree on the pilot budget and expansion gates before launch.", tone: "target", tag: "Before launch" },
      { title: "Canary + cutover", body: "Start internally, then a small eligible cohort. Expand if review/release effort improves, total cost per accepted interaction stays within budget, and agreed tour-conversion and support guardrails hold alongside technical checks.", tone: "target", tag: "Controlled rollout" },
      { title: "Rollback", body: "Disable the planner entry point to retain the existing listing-to-tour journey, or restore compatible code. Preserve saved designs: code rollback does not reverse database changes.", tone: "target", tag: "Recovery plan" },
    ],
    details: [
      { title: "What remains to exercise", body: "Main deploys automatically in the demo; CI runs alongside deployment. Preview-to-Production promotion, a canary, and a timed rollback have not been exercised. Add release gates and rehearse recovery before a customer pilot. Readers must remain compatible with newer optional scene fields." },
      { title: "What belongs in the cost gate", body: "Count model usage, priced failures and retries, Function/runtime usage, Atlas, and allocated operating effort. Measure text and voice separately before combining them. The recorded $0.0177 text sample is returned model cost for 14 requests, not the total cost per accepted interaction." },
    ],
  },
  {
    id: "tradeoffs",
    label: "Risks & limits",
    title: "Be explicit before customer kickoff",
    intro: "This is a working concept preview with limits to resolve before a pilot.",
    cards: [
      { title: "Access and privacy", body: "Add customer authorization, retention rules, and restricted database access. Losing the anonymous-session cookie loses access to its design.", tone: "risk", tag: "Before a pilot" },
      { title: "Cost and recovery", body: "Reconcile Gateway realtime spend and set budgets. Voice has no automatic in-session fallback. After a save timeout, reload saved state before retrying.", tone: "risk", tag: "Operating risk" },
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
    intro: "Codex desktop and specialized agents supported the build, review, and validation.",
    cards: [
      { title: "Development tooling", body: "TypeScript, Next.js, and Codex desktop. Across the project, I spawned dozens of subagents with specific roles in UI, visual design, accessibility, architecture, voice reliability, security review, and documentation.", tone: "proof", tag: "Disclosed" },
      { title: "Validation", body: "85 deterministic tests, build/type checks, recorded semantic and live integration checks, Atlas rereads, desktop/mobile walkthroughs, and user-confirmed Gateway microphone behavior.", tone: "proof", tag: "Reviewed behavior" },
      { title: "Candidate ownership", body: "Explain boundaries, defend trade-offs, debug failures, and adapt when the interviewer changes a constraint.", tone: "target", tag: "Live discussion" },
    ],
    details: [
      { title: "How the agents collaborated", body: "Scoped changes and independent reviews covered design, system and data flows, voice behavior, and security boundaries. I coordinated the work and checked the integrated result." },
      { title: "AI behavior review", body: "The semantic suite checks requested state changes, unmentioned-state preservation, revisions, and persisted rereads. Invalid plans are rejected before commit. Small evaluations do not establish general model accuracy, business uplift, or an availability SLA." },
    ],
  },
];
