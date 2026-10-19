# VoxBuild: customer brief and submission evidence

## Proposal

A rental platform wants prospective tenants to see how a property could support their furniture and home-office needs before requesting a tour. Today, photos and static plans leave that work to the tenant. The business impact is a hypothesis to test: uncertainty may reduce qualified tour requests and create repetitive suitability questions for leasing teams.

The reference scenario assumes existing AWS listing/catalog services and MongoDB Atlas. Vercel augments the web experience and AI integration while those systems retain ownership of their data. The implemented slice is a known-size sample apartment with procedural catalog furniture, text and voice edits, and owner-scoped saved scenes. It deliberately targets roughly 4–6 focused implementation hours; it is not a comprehensive real-estate CAD product.

The central contract is simple: **the model proposes operations; the server validates and saves; the browser renders the acknowledged result.**

## Submission artifacts

| Assessment requirement | Artifact or evidence | Verification state |
| --- | --- | --- |
| Customer, pain, current stack, business consequence | This brief; [architecture](architecture.md) | Reference scenario and hypotheses documented |
| Current/target architecture and what stays | Mermaid diagrams in [architecture](architecture.md) | Design documented |
| Three or more Vercel primitives, including AI | Functions/Next.js, AI SDK, AI Gateway, Preview Deployments | Implementation/rationale documented; deployment behavior requires release evidence |
| Public Vercel demo URL | **Pending verified public URL** | Not asserted in this document |
| Public repository with full history | **Pending verified public repository URL** | Automatic approval review rejected creation; explicit source-publication consent is pending. Preserve actual incremental Git history |
| Real external boundary | Atlas owner-scoped scene write and subsequent read | Live proof pending recorded run |
| Meaningful AI | AI SDK structured plans through Gateway; direct Realtime voice tool calls | Real primary and policy-fallback Gateway requests passed; Atlas-backed semantic suite and live voice pending |
| Reviewer-ready inputs | Sample rooms, canned prompts, manual controls | Desktop/mobile sample UI checked; live integrated flow pending |
| Rollout/canary/cutover/rollback | [Operating plan](architecture.md#rollout-and-incident-plan--proposed) | Proposed process, not an exercised production rollout |
| Success measures | Engineering targets and business pilot measures in architecture | Targets, not measured outcomes |
| Risks and limitations | Architecture and README | Explicitly documented |
| Tooling and AI validation | Codex disclosure; tests; 14-case evaluation runner | Record final commands/results below |

## Verification record

This evidence ledger records checks completed on **October 19, 2026** and names the remaining gaps. Replace pending entries only after the corresponding verification. A build, mocked test, or configured environment variable does not establish live integration success.

| Check | Evidence to attach | Result |
| --- | --- | --- |
| Deterministic domain/store/voice tests | `npm test` | **Passed: 34 tests.** Includes provider-schema and strict validation checks; store tests do not prove live Atlas access |
| Type check | `npm run typecheck` | **Passed** |
| Production build | `npm run build` | **Passed** |
| Browser desktop/mobile | Local sample UI and manual bounds validation | **Passed:** no horizontal overflow or console errors observed. Cloud save/reload and live audio were not exercised |
| Gateway primary request | Real request using `openai/gpt-4.1-mini` | **Passed** |
| Gateway policy-driven fallback | Real request with `gateway.only: ['google']`; routing `canonicalSlug: google/gemini-2.5-flash`, `modelAttemptCount: 2` | **Passed:** deliberate provider-policy routing, not simulated outage recovery |
| Realtime model availability | Authenticated model GET for `gpt-realtime-2.1` | **HTTP 200:** availability only; no live audio/session claim |
| Semantic live evaluation | JSON report from `scripts/evaluate.ts` | **Pending:** requires live Atlas and the integrated application |
| Atlas durability | Command ID, scene ID, accepted revision, read after reload | **Pending:** organization AI-client access must be enabled before connector provisioning; no actual persistence proof |
| Live voice | Permission/start, edit, acknowledgement, interruption, stop/release | **Pending** |
| Public access | Public URL from a fresh unauthenticated browser | **Pending:** no deployment URL |
| Repository publication | Accessible public URL and preserved commits | **Pending:** automatic approval review rejected public repository creation; explicit source-publication consent required |

The Gateway routing test proved that a request excluded from the primary provider could execute on the configured fallback. It did not create a provider outage. The executed model is taken from `providerMetadata.gateway.routing.canonicalSlug`; `response.modelId` remained the requested primary and must not be presented as the executed-model result. These isolated real model requests do not establish Atlas commit behavior or the 14-case semantic success rate.

The automated evaluation creates a fresh anonymous session and 14 separate studio scenes. It covers recoloring, relative movement, rotation, adding/removing catalog items, multi-operation edits, unknown products, and impossible placement. Assertions inspect persisted semantic changes, preservation of unmentioned properties, and revisions. Timing and returned token/cost data are recorded. Missing capabilities are blocked, never counted as a pass. The small suite is a regression signal, not a statistical proof of general model quality.

## Decisions to defend

- **Keep Atlas:** it is the customer boundary and durable state owner. One-document atomic updates are sufficient for this scene model; optimistic concurrency avoids silent overwrites. Exact manual/voice command retries use retained receipts. A lost text response is recovered by reloading: `/api/scene-agent` checks revision before receipt lookup and returns `409 REVISION_CONFLICT` when the original edit already committed.
- **Constrain the model:** a fixed operation vocabulary and renderer catalog prevent executable output, arbitrary assets, and invented furniture dimensions from becoming accepted state. Provider-compatible `anyOf`/plain-field schemas are followed by strict domain validation before commit; schema portability must not weaken the authoritative checks.
- **Separate voice transport:** WebRTC reduces media relay work in Functions. The trade-off is a direct OpenAI dependency, separate usage accounting, and extra coordination around tool acknowledgements and interruption.
- **Be honest about evidence:** the catalog is a fixture; local sample mode is not AI or cloud persistence; the verified fallback is a policy-routing test, not an outage test; photo reconstruction is deferred.
- **Ship a narrow proof:** one polished experience and a clear save/reload contract provide a stronger discovery artifact than multiple partially functioning integrations.

## Tooling and ownership

Development used Codex desktop with collaborating coding agents, current official documentation, TypeScript, Node's test runner through `tsx`, and repository-level build/type checks. Agents assisted with implementation, research, and tests. The candidate remains responsible for explaining the code and validating the resulting behavior.

Preserve real incremental commits for the domain/persistence foundation, UI/integration work, and evaluation/documentation as they occur. Commit history should reflect actual changes; do not fabricate earlier work or flatten the submitted history. `[SA DECISION]` source comments call out deliberate boundaries. Attach real evaluation artifacts and explain any failures rather than selectively reporting successful examples.

## Before submission

Publish and verify the public demo and public repository, fill the evidence ledger, and include the two links in the recruiter-facing artifact. Provide no test password when the public anonymous-session path is available. Confirm the interview deadline with the recruiting team: the supplied assessment contains both two- and three-business-day submission language, so plan around the earlier three-business-day deadline until clarified. No email submission or publication is performed by this document.
