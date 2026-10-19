# VoxBuild

**Make room for you.** A voice-enabled 3D apartment planner for a rental platform, built as a focused Vercel Solutions Architect take-home.

Prospective tenants can explore a sample apartment, add catalog furniture, and request changes by text or voice. The model proposes a bounded edit; the server validates it and commits it to MongoDB Atlas before the browser accepts it.

**Submission links:** [hosted app](https://voxbuild-nu.vercel.app) · [public source repository](https://github.com/kyuhunlee/voxbuild). Production passed **10/10 Atlas storage checks** and **14/14 semantic text-command checks**, plus primary-model and policy-fallback smoke tests. The user confirmed deployed voice edits, spoken feedback, interruption, and microphone release on Stop.

**Verified on October 19, 2026:** **39 unit tests**, TypeScript checking, the production build, desktop/mobile sample rendering, **10/10 production storage checks**, and **14/14 production semantic checks with real Gateway and Atlas** passed. The [production evaluation](docs/evidence/semantic-production.json) measured p50 **1,192 ms**, p95 **2,049 ms**, and **$0.0095565** in returned Gateway cost across 14 requests. These are a small recorded API regression run, not a performance guarantee or browser voice latency. Hosted primary and policy-fallback requests also passed. Deployed microphone edits, spoken acknowledgement, interruption, and Stop releasing the microphone were user-confirmed, not agent-instrumented. A separate agent browser check reloaded the final voice-edited room and retained the blue sofa and cloud-saved revision 6. See the [evidence ledger](docs/assessment.md#verification-record) for scope and remaining checks.

- [Customer brief and assessment map](docs/assessment.md)
- [Architecture and operating decisions](docs/architecture.md)
- [Interview demo script](docs/demo-script.md)

## What is implemented

- A client-rendered React Three Fiber apartment with procedural furniture, orbit/top views, dimensions, selection, and manual controls.
- Three furnished presets and an empty room; seven supported furniture SKUs.
- Canned prompts and typed commands through AI SDK structured output and Vercel AI Gateway when configured.
- Direct OpenAI WebRTC voice, started only by a microphone click. Completed tool calls use the same server command path as manual edits.
- Signed anonymous visitor sessions, owner-scoped scenes, revision checks, and atomic command receipts in Atlas.
- An Architecture drawer with request events, operation JSON, timings, returned model usage, and available Gateway routing metadata.
- Explicit local sample mode when storage is not configured. Sample controls and canned previews run locally; free-form AI and voice do not pretend to be connected, and changes are not saved across reloads.

The furnishing catalog is a **labeled local fixture** representing an existing enterprise API. A server adapter can fetch known-SKU metadata from a configured HTTPS endpoint. Atlas is the verified real external boundary. There is no claim that fixture reads reach AWS.

Text, manual, and voice changes share the strict domain validator and atomic store executor, with different API retry behavior. Manual/voice requests to `/api/commands` can replay an identical command payload through its retained receipt. `/api/scene-agent` checks the expected revision before generating or looking up a command receipt: if a text edit saved but its response was lost, retrying the original request returns `409 REVISION_CONFLICT`. Reload the saved room to recover the accepted state before deciding whether another edit is needed; the complete text-generation endpoint is not idempotent.

Photo upload/reconstruction, Vercel Blob, automatic room measurement, and a simulated provider-failure toggle are outside this core slice. A real Gateway routing test excluded OpenAI with `gateway.only: ['google']` and selected the configured Google fallback. This verifies policy-driven fallback routing, not recovery from a provider outage.

## Run locally

Use Node.js 24.x and npm, matching the runtime pinned in `package.json`.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

On PowerShell, use `Copy-Item .env.example .env.local` instead of `cp`. Open [localhost:3000](http://localhost:3000). The application can render the explicit local sample without credentials.

For the live path, configure these values in `.env.local` and the appropriate Vercel environment. Keep real values out of source control and chat.

```dotenv
MONGODB_URI=mongodb+srv://APP_USER:APP_PASSWORD@CLUSTER_HOST/?retryWrites=true&w=majority
MONGODB_DB=voxbuild
SESSION_SECRET=REPLACE_WITH_A_RANDOM_SECRET_OF_AT_LEAST_32_CHARACTERS
AI_GATEWAY_API_KEY=YOUR_GATEWAY_KEY_FOR_LOCAL_DEVELOPMENT
AI_GATEWAY_MODEL=openai/gpt-4.1-mini
AI_GATEWAY_FALLBACK_MODEL=google/gemini-2.5-flash
OPENAI_API_KEY=YOUR_SERVER_SIDE_OPENAI_KEY
OPENAI_REALTIME_MODEL=gpt-realtime-2.1
```

The text-model IDs above were present in the [public Gateway catalog](https://ai-gateway.vercel.sh/v1/models), and real requests verified both the primary and the policy-selected fallback. The [local live semantic report](docs/evidence/semantic-local-live.json) passed all 14 cases with real models and persisted Atlas rereads; returned routing records show the executed model/provider per request. Two short server WebSocket sessions verified `gpt-realtime-2.1` configuration and tool/audio compatibility using synthetic input. The user subsequently confirmed a deployed microphone request changed the sofa and produced spoken feedback. The user also confirmed interruption with a new spoken edit and microphone release on Stop; those manual checks are separate from the provider reports. Browser voice timing and unmount cleanup remain unverified. `AI_GATEWAY_FALLBACK_MODEL` is optional. A Vercel OIDC token can authenticate Gateway on Vercel or in linked local development; do not expose it to the browser. OpenAI voice intentionally uses its own server-side key and direct media path.

The demo uses a new VoxBuild Atlas project with a Free/M0 cluster on AWS `US_EAST_1`. Production uses `voxbuild`; Preview uses `voxbuild_preview`, with separate session secrets and database users granted `readWrite` on their application database and scoped to this cluster. Provisioning created the `owner_updated` scene index (`ownerId: 1, updatedAt: -1`) and the rate-counter TTL index (`expiresAt: 1`, `expireAfterSeconds: 0`). This is a free cluster, not Atlas's paid **Dedicated** tier.

The user explicitly approved the Atlas `0.0.0.0/0` access-list rule for the demo's dynamic Vercel egress. It has **no automatic expiry**. Database authentication and TLS remain required; this broad network rule is a demo trade-off. **After the demo, remove the rule explicitly** or replace it with a verified restricted-egress configuration before continued operation.

Optional catalog integration:

```dotenv
CATALOG_API_URL=https://YOUR_EXISTING_API.example/furniture
CATALOG_API_TOKEN=YOUR_SERVER_SIDE_CATALOG_TOKEN
```

That endpoint returns an array of `{sku,name,price,description}`. Only metadata for the finite known SKU set is accepted into the catalog adapter; geometry, dimensions, and allowed finishes remain the versioned application contract. The UI uses the bundled demo catalog. Extending the SKU set requires a renderer and validation update, not just a new remote URL.

## Validate

```sh
npm test
npm run typecheck
npm run build
npx tsx scripts/evaluate.ts --list
npx tsx scripts/verify-storage.ts --help
```

On October 19, 2026, all **39 unit tests** and the type check passed, including five regressions for Gateway runtime OIDC detection. The authentication-fix production build passed and deployment reached Ready. Tests also exercise domain bounds and colors, atomic batch rejection, owner isolation, revision races, duplicate receipts, provider-schema compatibility, and voice ordering/interruption. They do not replace the separately recorded live Atlas or user microphone checks.

Before model evaluation, run `npx tsx scripts/verify-storage.ts` with `BASE_URL` set to the deployment. This makes no AI calls. Ten live HTTP checks use two fresh visitor sessions and one new studio to verify ownership, atomic rejection, duplicate receipts, competing writes, and canonical rereads. Reports go to ignored `.local/evidence/`; sample mode exits 2 as blocked without creating a fixture. The [October 19 production run](docs/evidence/storage-production.json) passed **10/10**, including one atomic commit for identical concurrent requests, a single winner for conflicting writes, and the final canonical revision 2. It did not test model calls or browser voice.

The sanitized [Realtime text report](docs/evidence/realtime-text-compatibility.json) records a synthetic text request producing a completed tool call and audio continuation. The [Realtime audio report](docs/evidence/realtime-audio-compatibility.json) records a three-second TTS fixture triggering actual voice activity detection, transcription, a completed tool call, and audio continuation. Both used the route's session configuration over server WebSocket, validated the full emitted edit locally, and made **zero Atlas writes**. The audio sample's tool completed 670 ms after the service's speech-stopped event; this is one sample, not p95 or browser end-to-end latency. A later user check confirmed deployed speech, a visible sofa edit, and spoken feedback. The user also confirmed interruption and microphone release on Stop. Browser timing and unmount cleanup remain unverified. Reports contain synthetic data and returned usage, without credentials, SDP, or audio files. The private diagnostic script remains ignored under `.local`.

With the live application configured, run the semantic evaluation against a public deployment or local server:

```sh
BASE_URL=https://YOUR_DEMO.vercel.app EVAL_REPORT_PATH=.local/evidence/eval-live.json npx tsx scripts/evaluate.ts
```

PowerShell:

```powershell
$env:BASE_URL = "https://YOUR_DEMO.vercel.app"
$env:EVAL_REPORT_PATH = ".local/evidence/eval-live.json"
npx tsx scripts/evaluate.ts
```

This run uses billable inference. It creates a fresh anonymous session and **14 new studio fixtures**, checks intended changes plus unchanged objects, and rereads each scene from storage. It never loads or edits an existing visitor's design. It leaves its own fixtures for inspection; their IDs appear in the JSON report. Set `EVAL_REPORT_PATH` to ignored `.local/evidence/` as shown; the runner's unoverridden default is `artifacts/`. Both the [production report](docs/evidence/semantic-production.json) and earlier [local live report](docs/evidence/semantic-local-live.json) passed **14/14**. Cookies and credentials are not written by the runner; the public copy additionally removes Gateway client-session identifiers and unnecessary provider metadata. Missing capabilities produce a blocked result and exit code 2; semantic failures return 1; a complete pass returns 0.

The report includes success rate, p50/p95 request latency, returned token usage, available routing metadata, and returned Gateway cost. Missing usage or failed-request costs remain unknown. Manually verify voice permissions, speech-to-edit behavior, interruption, microphone release, browser rendering, and mobile usability separately.

## Deployment and scope

The GitHub repository is connected to the Vercel project, with `main` configured as the Production branch. Branch and pull-request deployments use Preview configuration. Production and Preview have separate session secrets, database names, and scoped Atlas credentials.

Deploy this Next.js project to Vercel with environment variables scoped separately for Preview and Production: use distinct `SESSION_SECRET` values and `MONGODB_DB=voxbuild_preview` for Preview versus `MONGODB_DB=voxbuild` for Production. Validate the effective configuration and a Preview URL before promoting a verified deployment. The staged production rollout, private connectivity, and rollback process are described in [architecture.md](docs/architecture.md); an implemented app is not evidence that those operational steps have been exercised.

Production deployment `dpl_4dLZC69TyNAENQj7vDGJ5zUAZx2M` (commit `f58708f`) reached Ready on the public alias after correcting Gateway authentication detection for Vercel's runtime token header. All three capabilities reported true. [Hosted primary and policy-fallback requests](docs/evidence/gateway-production.json) each persisted a revision-1 edit, followed by the full **14/14 production semantic evaluation**. Five regression tests cover runtime OIDC detection. The earlier production storage report records its own configuration checkpoint; its `gateway: false` value predates the fix.

The earlier hosted sample passed anonymous HTTP access and a local browser edit without console errors; cross-origin session POST returned 403 and unauthenticated scene GET returned 401. Neither that initial deployment nor the storage report proves Preview promotion or a canary rollout. `.vercelignore` excludes environment secrets, `.local`/`.claude` diagnostics, dependency/build directories, and test reports while retaining `.env.example`.

The reference prioritizes a polished 4–6 hour slice: known-size room → text/manual command → validated Atlas save/reload → voice → inspectable evidence. It does not provide real property inventory, checkout, accounts, collision-free packing, accessibility clearance, or certified furniture fit. Anonymous designs belong to one browser cookie and are not recoverable after that cookie is lost.

## Development tooling and evidence

Built with Codex desktop and collaborating coding agents. The human submitter owns the final decisions and should be able to explain and debug the command schema, persistence race behavior, model routing, and voice trade-offs. Deliberate boundaries have `// [SA DECISION]:` comments. Preserve the actual incremental Git history; do not squash or invent a development narrative for submission.

The [assessment evidence table](docs/assessment.md) distinguishes production storage and semantic proof, the earlier local suite and sample UI checks, isolated Realtime provider compatibility, and user-confirmed deployed voice behavior. The public repository preserves incremental development history. Browser voice latency and unmount cleanup remain unverified. The broad Atlas network rule must be removed explicitly after the demo.
