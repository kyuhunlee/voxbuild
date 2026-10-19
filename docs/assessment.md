# VoxBuild: customer brief and submission evidence

## Proposal

A rental platform wants prospective tenants to see how a property could support their furniture and home-office needs before requesting a tour. Today, photos and static plans leave that work to the tenant. The business impact is a hypothesis to test: uncertainty may reduce qualified tour requests and create repetitive suitability questions for leasing teams.

The reference scenario assumes existing AWS listing/catalog services and MongoDB Atlas. Vercel augments the web experience and AI integration while those systems retain ownership of their data. The implemented slice is a known-size sample apartment with procedural catalog furniture, text and voice edits, and owner-scoped saved scenes. It deliberately targets roughly 4–6 focused implementation hours; it is not a comprehensive real-estate CAD product.

The central contract is simple: **the model proposes operations; the server validates and saves; the browser renders the acknowledged result.**

The current experience has **14 furniture SKUs**, **six presets**, and six environment styles: **Sunlit, Gallery, Forest, Desert, Coastal, and Midnight**. Presets now have distinct window arrangements, lighting, and artwork; City loft is removed from new-room choices. Five painting designs can move along either visible wall, with placement validation and atomic persistence. Styles preserve furniture and artwork while changing finishes and lighting. Category filtering and search help browse the catalog; the perspective camera is approximately 18% closer. The earlier catalog expansion at `d5951a9` has its own production evidence below.

## Submission artifacts

| Assessment requirement | Artifact or evidence | Verification state |
| --- | --- | --- |
| Customer, pain, current stack, business consequence | This brief; [architecture](architecture.md) | Reference scenario and hypotheses documented |
| Current/target architecture and what stays | Mermaid diagrams in [architecture](architecture.md) | Design documented |
| Three or more Vercel primitives, including AI | Functions/Next.js, AI SDK, AI Gateway, Preview Deployments | Functions and hosted Gateway requests verified; Preview promotion remains proposed |
| Public Vercel demo URL | [voxbuild-nu.vercel.app](https://voxbuild-nu.vercel.app) | Live Atlas/text flow verified; deployed voice manually confirmed by the user |
| Public repository with full history | [github.com/kyuhunlee/voxbuild](https://github.com/kyuhunlee/voxbuild) | Created and pushed after explicit publication approval; incremental history preserved |
| Real external boundary | Atlas owner-scoped scene write and subsequent read | **10/10 production storage checks passed:** [report](evidence/storage-production.json) |
| Meaningful AI | AI SDK structured plans through Gateway; direct Realtime voice tool calls | **14/14 production semantic checks** and hosted primary/policy-fallback passed; deployed voice edits/playback/interruption/Stop user-confirmed |
| Reviewer-ready inputs | Sample rooms, canned prompts, manual controls | Desktop/mobile sample UI checked; production API/storage flow verified; deployed voice manually confirmed |
| Rollout/canary/cutover/rollback | [Operating plan](architecture.md#rollout-and-incident-plan--proposed) | Proposed process, not an exercised production rollout |
| Success measures | Engineering targets and business pilot measures in architecture | Recorded API latency/cost and semantic results below; business pilot measures remain targets |
| Risks and limitations | Architecture and README | Explicitly documented |
| Tooling and AI validation | Codex disclosure; tests; 14-case evaluation runner | Record final commands/results below |

## Verification record

This evidence ledger records checks completed on **October 19, 2026** and names the remaining gaps. Replace pending entries only after the corresponding verification. A build, mocked test, or configured environment variable does not establish live integration success.

| Check | Evidence to attach | Result |
| --- | --- | --- |
| Deterministic domain/store/voice tests | `npm test` | **Passed: 52 tests.** Includes OIDC regressions, provider-schema checks, legacy scene compatibility, artwork bounds/window conflicts, and atomic validation; separate live reports establish Atlas access |
| Type check | `npm run typecheck` | **Passed** |
| Room/artwork local API | [14-case report](evidence/decor-local.json) | **Passed: 14/14:** six distinct presets, removed-loft rejection, saved painting edits, window conflicts, atomic rejection, style preservation, and real primary/policy-fallback requests |
| Room/artwork desktop/mobile | Local live browser at desktop and 390×844 | **Passed:** painting selection, design changes, vertical movement, wall switching, and persisted reload; distinct office, bedroom, dining, and lounge windows/lighting inspected. No console errors after the completed code was reloaded |
| Realtime artwork compatibility | [Synthetic artwork report](evidence/realtime-artwork-compatibility.json) | **Passed:** completed design-and-move tool call and spoken continuation; server WebSocket, local validation, zero Atlas writes, no browser microphone |
| Room/artwork production API and UI | [14-case report](evidence/decor-production.json), commit `a67230e` | **Passed: 14/14.** Deployment `dpl_FEqJ8qpfafHfPNLxXtbbxHwM4d2r` Ready; refreshed hosted UI retained an older 42 m² room at revision 0 as Saved room, exposed its painting controls, and produced no console errors |
| Initial post-artwork semantic evaluation | [Retained initial report](evidence/semantic-production-decor-initial.json), commit `a67230e` | **13/14:** plant-pot returned HTTP 400 for invalid generated command format; the canonical scene remained unchanged. Failed-request model usage/cost was unavailable; this result is retained separately from subsequent checks |
| Color-format diagnosis | [Before/after model report](evidence/plant-color-format-diagnostic.json) | Before guidance correction: **0/3** generated plans validated because `e7dfce` lacked `#`. After requiring the complete catalog string: **3/3** passed strict validation and produced the expected pot color in memory. Six bounded real Gateway calls; zero Atlas writes; not a general reliability estimate |
| Final post-artwork semantic evaluation | [Production report](evidence/semantic-production-decor-fixed.json), commit `66a7499` | **Passed: 14/14**, with canonical Atlas rereads. p50 1,403 ms, p95 9,800 ms; 48,543 input / 1,295 output tokens; returned Gateway cost $0.0172744. The two-edit request took 9.8 seconds; this small run is not a latency guarantee |
| Final application build | Vercel deployment for `66a7499` | **Ready:** `dpl_WmtEV566Ez2bVYVBfSkqiT1eVBWP`. Typecheck and 52 unit tests also passed after the color guidance correction |
| Production build | `npm run build` for expansion `d5951a9` | **Passed; hosted deployment Ready:** `dpl_9CGJeKT97ghCwkzcBjeWBe6JNrxh` |
| Browser desktop/mobile | Local sample UI and manual bounds validation | **Passed:** no horizontal overflow or console errors observed. Cloud save/reload and live audio were not exercised in this earlier sample UI check |
| Gateway primary request | Real request using `openai/gpt-4.1-mini` | **Passed** |
| Gateway policy-driven fallback | Real request with `gateway.only: ['google']`; routing `canonicalSlug: google/gemini-2.5-flash`, `modelAttemptCount: 2` | **Passed:** deliberate provider-policy routing, not simulated outage recovery |
| Realtime model availability | Authenticated model GET for `gpt-realtime-2.1` | **HTTP 200:** availability only; real compatibility checks recorded below |
| Realtime synthetic text compatibility | [Sanitized provider report](evidence/realtime-text-compatibility.json) | **Passed:** current session config accepted over server WebSocket; completed tool call validated locally; audio continuation completed. Zero Atlas writes |
| Realtime synthetic audio compatibility | [Sanitized provider report](evidence/realtime-audio-compatibility.json) | **Passed:** three-second TTS fixture → server VAD/transcription → validated completed tool call → audio continuation over server WebSocket. Zero microphone access or Atlas writes |
| Expanded local API | [18-case report](evidence/expanded-local.json) | **Passed: 18/18:** seven new SKUs, three new presets, six environment styles, and real model requests for new furniture and a style change |
| Expanded local live UI | Default desktop, 1280×800, and 390×844 browser checks | **Passed:** bedroom/dining/lounge geometry, night readability, style save/reload, category filter, mobile add, and top-view fit; no console errors, with upstream Three.js deprecation warnings |
| Realtime environment compatibility | [Synthetic environment report](evidence/realtime-environment-compatibility.json) | **Passed:** completed `set_environment: midnight` tool call preserved furniture and produced audio; server WebSocket, local validation, zero Atlas writes, no browser microphone |
| Expanded production API | [18-case report](evidence/expanded-production.json), commit `d5951a9` | **Passed: 18/18.** Refreshed hosted UI showed 14 catalog items and six styles, retained the existing room at revision 14, and produced no console errors |
| Post-expansion semantic evaluation | [Production report](evidence/semantic-production-expanded.json) | **Passed: 14/14.** p50 1,352 ms, p95 1,976 ms; 39,279 input / 1,524 output tokens; returned Gateway cost $0.0139261 |
| Post-expansion routing | [Production routing report](evidence/gateway-production-expanded.json) | **Passed:** primary and policy-selected fallback each persisted a revision-1 edit; not an outage test |
| Baseline semantic live evaluation | [Production report](evidence/semantic-production.json); [local report](evidence/semantic-local-live.json) | **Passed: 14/14 in each.** Earlier production p50 1,192 ms, p95 2,049 ms; returned Gateway cost $0.0095565 across 14 requests |
| Atlas persistence | [Production storage report](evidence/storage-production.json) | **Passed:** fresh owned fixture, accepted revisions, canonical rereads, and preservation of unmentioned state |
| Deployed browser voice | User's actual microphone test | **User-confirmed:** speech changes the sofa and speaks back; interruption with a new spoken edit and Stop releasing the microphone also work. Not agent-instrumented; browser timing/unmount cleanup unverified |
| Voice-edited scene reload | Agent browser inspection after voice stopped, then full page reload | **Passed:** blue sofa, position x=0/z=-2.13, rotation 0, and Cloud saved revision 6 survived reload |
| Live storage invariants | `scripts/verify-storage.ts`, 10 semantic API checks | **Passed: 10/10 in production**, including duplicate races, conflicting revisions, ownership, and atomic rejection; two fresh sessions, one new fixture |
| Git deployment integration | Vercel project link metadata | GitHub `kyuhunlee/voxbuild` connected; Production branch `main` |
| Hosted live deployment | [Production URL](https://voxbuild-nu.vercel.app); [routing smoke report](evidence/gateway-production.json) | **Ready:** `dpl_4dLZC69TyNAENQj7vDGJ5zUAZx2M`, commit `f58708f`; all capabilities true; primary and policy-fallback edits each persisted at revision 1 |
| Anonymous public access | Anonymous page/session requests; hosted browser edit | **Passed in the earlier sample check:** page and sample capabilities returned 200; local edit reached revision 1 with no console errors. Cross-origin session POST returned 403; unauthenticated scene GET returned 401 |
| Repository publication | [Public repository](https://github.com/kyuhunlee/voxbuild), initial commits `dd96e77`, `3535ecd`, `f712dc4` | **Published:** GitHub reports PUBLIC visibility and main as the default branch; incremental history preserved |

The initial Vercel deployment automatically targeted Production. The initial sample and subsequent live production verification do not establish an exercised Preview-to-Production promotion, canary rollout, or completed customer integration. The project pins Node.js 24.x. `.vercelignore` excludes local diagnostic directories, secrets, build/dependency directories, and test reports from uploads while retaining `.env.example`.

The Gateway routing test proved that a request excluded from the primary provider could execute on the configured fallback. It did not create a provider outage. The executed model is taken from `providerMetadata.gateway.routing.canonicalSlug`; `response.modelId` remained the requested primary and must not be presented as the executed-model result. The later [hosted routing report](evidence/gateway-production.json) additionally verified both edits persisted. The separate 14-case production suite establishes its recorded semantic results and rereads.

The Realtime checks used two bounded real `gpt-realtime-2.1` WebSocket sessions and one `gpt-4o-mini-tts` request to synthesize input. Both emitted the expected completed function-call shape, recolored only `studio-sofa` to `#687761`, and passed strict domain and scene-engine validation. Each received an explicit synthetic in-memory result with `persistence: none`; the spoken continuations acknowledged that nothing was saved. The audio check's tool completed **670 ms after `input_audio_buffer.speech_stopped`**, followed by a 2,394 ms audio-response generation. These are single-sample observations, not p95, audible playback duration, or browser end-to-end latency. The audio check's WebSocket session lasted 7,953 ms. The reports preserve synthetic data, event counts, timings, and returned usage; no key, SDP, authorization headers, raw errors, or audio files are included. The private diagnostic script uses Next.js's bundled WebSocket implementation and remains ignored under `.local` rather than becoming an application dependency.

The user subsequently confirmed that the deployed microphone changes the sofa and speaks back, then confirmed interruption with a new spoken edit and Stop releasing the microphone. These are user observations, separate from the instrumented server WebSocket reports. Browser voice latency and unmount cleanup remain unverified.

The automated evaluation creates a fresh anonymous session and 14 separate studio scenes. It covers recoloring, relative movement, rotation, adding/removing catalog items, multi-operation edits, unknown products, and impossible placement. Assertions inspect persisted semantic changes, preservation of unmentioned properties, and revisions. Timing and returned token/cost data are recorded. Missing capabilities are blocked, never counted as a pass. The **baseline production run, before the expansion**, passed all 14 cases with p50 1,192 ms, p95 2,049 ms, 24,391 input tokens, 915 output tokens, and $0.0095565 returned Gateway cost (usage/cost coverage 14/14). The earlier local run also passed 14/14, with p50 1,323 ms, p95 3,072 ms, and $0.0102419 returned cost. Public copies omit client-session identifiers and unnecessary provider metadata. The separate expanded local report records its 18 checks without claiming those baseline latency/cost values. The small suites are regression signals, not statistical proof of general model quality or total account spend.

Atlas is a new VoxBuild Free/M0 cluster on AWS `US_EAST_1`, with separate `voxbuild` and `voxbuild_preview` databases, scoped `readWrite` users, and session secrets. The owner/update and rate-counter TTL indexes are created. The user approved `0.0.0.0/0` for dynamic Vercel demo egress; it has **no expiry and must be explicitly removed after the demo**.

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

Rehearse the live presentation, retain the baseline and expanded production evidence reports, and include the existing demo/repository links in the recruiter-facing artifact. Keep user-confirmed voice behavior distinct from instrumented API results; do not claim unmeasured browser latency or unmount cleanup. Remove the broad Atlas access-list rule after the demo. Provide no test password when the public anonymous-session path is available. Confirm the interview deadline with the recruiting team: the supplied assessment contains both two- and three-business-day submission language, so plan around the earlier three-business-day deadline until clarified. No email submission is performed by this document.
