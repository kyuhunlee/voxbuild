# VoxBuild

**Make room for you.** A voice-enabled 3D apartment planner for a rental platform, built as a focused Vercel Solutions Architect take-home.

Prospective tenants can explore a sample apartment, add catalog furniture, and request changes by text or voice. The model proposes a bounded edit; the server validates it and commits it to MongoDB Atlas before the browser accepts it.

**Submission links:** [hosted sample](https://voxbuild-nu.vercel.app) · [public source repository](https://github.com/kyuhunlee/voxbuild). The deployed app currently shows **Local sample**: rendering and local controls are available, but cloud persistence, free-form AI, and voice are not enabled in that mode. The live integrated assessment remains incomplete.

**Verified on October 19, 2026:** 34 unit tests, TypeScript checking, the production build, desktop/mobile sample rendering, and real Gateway primary-model and policy-driven fallback requests passed. Atlas save/reload and live microphone/audio behavior remain unverified. See the [evidence ledger](docs/assessment.md#verification-record) for the precise scope.

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

The furnishing catalog is a **labeled local fixture** representing an existing enterprise API. A server adapter can fetch known-SKU metadata from a configured HTTPS endpoint. Atlas is the intended real external boundary. There is no claim that fixture reads reach AWS.

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

The text-model IDs above were present in the [public Gateway catalog](https://ai-gateway.vercel.sh/v1/models), and real requests verified both the primary and the policy-selected fallback. Command accuracy across the live semantic suite remains unmeasured. An authenticated model-availability request for `gpt-realtime-2.1` returned HTTP 200; no live voice/audio session has been verified. `AI_GATEWAY_FALLBACK_MODEL` is optional. A Vercel OIDC token can authenticate Gateway on Vercel or in linked local development; do not expose it to the browser. OpenAI voice intentionally uses its own server-side key and direct media path.

Use a separate VoxBuild Atlas project and Free/M0 cluster for the demo, a database user limited to the application database, and an authorized network access rule for the application. A free cluster is separate from other application data but is not Atlas's paid **Dedicated** tier. For connector provisioning, an Organization Owner must first enable AI client access under **Organization Settings → App Connections**; this is an organization-wide setting. [Atlas instructions](https://www.mongodb.com/docs/mcp-server/remote-mcp/manage-ai-client-access/).

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
```

On October 19, 2026, all 34 unit tests, the type check, and the production build passed. Tests exercise domain bounds and colors, atomic batch rejection, owner isolation, revision races, duplicate receipts, provider-schema compatibility, and voice ordering/interruption. They do not replace a real Atlas or microphone test.

With the live application configured, run the semantic evaluation against a public deployment or local server:

```sh
BASE_URL=https://YOUR_DEMO.vercel.app npx tsx scripts/evaluate.ts
```

PowerShell:

```powershell
$env:BASE_URL = "https://YOUR_DEMO.vercel.app"
npx tsx scripts/evaluate.ts
```

This run uses billable inference. It creates a fresh anonymous session and **14 new studio fixtures**, checks intended changes plus unchanged objects, and rereads each scene from storage. It never loads or edits an existing visitor's design. It leaves its own fixtures for inspection; their IDs appear in the JSON report under `artifacts/`. `EVAL_REPORT_PATH` can select another report path. Cookies and credentials are not written to the report. Missing capabilities produce a blocked result and exit code 2; semantic failures return 1; a complete pass returns 0.

The report includes success rate, p50/p95 request latency, returned token usage, available routing metadata, and returned Gateway cost. Missing usage or failed-request costs remain unknown. Manually verify voice permissions, speech-to-edit behavior, interruption, microphone release, browser rendering, and mobile usability separately.

## Deployment and scope

Deploy this Next.js project to Vercel with environment variables scoped separately for Preview and Production: use distinct `SESSION_SECRET` values and `MONGODB_DB=voxbuild_preview` for Preview versus `MONGODB_DB=voxbuild` for Production. Validate the effective configuration and a Preview URL before promoting a verified deployment. The staged production rollout, private connectivity, and rollback process are described in [architecture.md](docs/architecture.md); an implemented app is not evidence that those operational steps have been exercised.

The first Vercel deployment automatically targeted Production and serves the sample at [voxbuild-nu.vercel.app](https://voxbuild-nu.vercel.app). Anonymous HTTP access returned 200, and the hosted sample rendered and applied a local edit without console errors. Its API rejected a cross-origin session request with 403 and an unauthenticated room read with 401. This initial deployment did not exercise Preview promotion or a canary rollout. `.vercelignore` excludes environment secrets, `.local`/`.claude` diagnostics, dependency/build directories, and test reports; the replacement deployment's manifest confirmed these exclusions. `.env.example` remains included.

The reference prioritizes a polished 4–6 hour slice: known-size room → text/manual command → validated Atlas save/reload → voice → inspectable evidence. It does not provide real property inventory, checkout, accounts, collision-free packing, accessibility clearance, or certified furniture fit. Anonymous designs belong to one browser cookie and are not recoverable after that cookie is lost.

## Development tooling and evidence

Built with Codex desktop and collaborating coding agents. The human submitter owns the final decisions and should be able to explain and debug the command schema, persistence race behavior, model routing, and voice trade-offs. Deliberate boundaries have `// [SA DECISION]:` comments. Preserve the actual incremental Git history; do not squash or invent a development narrative for submission.

The [assessment evidence table](docs/assessment.md) distinguishes the verified sample deployment and real Gateway routing requests from pending end-to-end verification. Atlas provisioning is awaiting organization AI-client access. The public repository preserves incremental development history. Atlas save/reload, the semantic suite, and live voice still need verification before this is a complete integrated demo.
