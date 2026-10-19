# Customer demo script

Use a verified public Vercel deployment in a browser that supports WebGL. Allow five minutes for the demo within a 10–15 minute customer presentation. Start with a fresh visitor session if you want a reproducible room.

**Current readiness, October 19, 2026:** desktop/mobile sample rendering and real Gateway primary/policy-fallback requests have been checked. Atlas persistence, live audio, and a public deployment remain pending. The sequence below is a presentation runbook to rehearse after those dependencies are verified; it is not a record of a completed end-to-end demo.

## Before presenting

Confirm the deployment actually reports live storage and Gateway capabilities. Test one text edit and reload, then microphone connection. Keep a second browser tab with the architecture document and the actual evaluation report. Check the provider budget. Do not begin by asserting that a catalog fixture is an AWS integration or that sample mode proves cloud persistence.

## Five-minute path

**0:00 — Establish the customer problem.** “A listing photo tells a tenant what the apartment looks like. It leaves them to imagine whether it can support their furniture and workday. This planner adds that exploration beside the existing listing flow.” Explain that the apartment dimensions are a sample, not measured from a photograph.

**0:30 — Orient the reviewer.** Open Sunlit studio. Orbit the room, switch to the top view, and show dimensions. Select the sofa and change a finish manually. Point out that furniture geometry is procedural and maps to known catalog SKUs; no fragile external model downloads are needed.

**1:15 — Demonstrate the AI boundary.** Click **Make the sofa sage**, or type it. The existing sofa changes color and keeps its ID. Open **Architecture** and inspect the operations, revision, measured durations, requested/executed model, and usage. The executed model comes from Gateway routing metadata, not the SDK's requested model label. The model proposed the edit; the server accepted and saved it.

**2:00 — Prove persistence.** Use **Reload saved room**, then refresh the page. Show the same accepted revision and furnishing change after the Atlas read. Explain that the signed visitor cookie scopes ownership. A new private browser session receives its own design.

**2:30 — Add voice.** Click the microphone. Say: “Make the sofa blue.” Then: “Move the lounge chair half a meter left.” Wait for the visible change and spoken acknowledgement. Explain that audio travels directly to OpenAI, while completed tool calls still pass through the Vercel validation and Atlas commit path. Interrupt the assistant once, then stop voice and show that microphone capture ends.

**3:30 — Show a boundary failure.** Type: “Move the sofa to x=100, y=0, z=0 exactly. If invalid, leave the room unchanged.” A clarification/refusal or a rejected command is acceptable; the important invariant is that the scene stays unchanged. Use the deterministic tests to explain stale revisions and duplicate command protection rather than manufacturing a provider outage.

**4:15 — Close with the migration path.** The existing catalog, listings, and Atlas data stay. Vercel supplies the web experience, server execution, AI abstraction/routing, and preview delivery. State the proposed pilot metrics and the next experiment: whether planning increases qualified tour requests.

## If a live dependency fails

- **Microphone blocked:** continue with the identical text command, acknowledge that voice was not verified in this session, and inspect browser permissions after the presentation.
- **Gateway unavailable:** demonstrate manual validated controls and the last real report. Do not present canned local previews as live model responses.
- **Atlas unavailable:** show the recoverable error and the last accepted state. Sample mode is a separately labeled local walkthrough, not a persistence fallback.
- **Text response lost:** reload the saved room to determine whether the edit committed. Retrying a text request with the old revision returns `409 REVISION_CONFLICT` after a successful commit; receipt-based replay applies to identical manual/voice operation requests, not the whole text-generation endpoint.
- **Discussing fallback:** show the recorded policy-driven routing test: excluding OpenAI with `gateway.only: ['google']` selected `google/gemini-2.5-flash` with `modelAttemptCount: 2`. Explain that this is a real routing request, not an outage simulation. Do not claim outage recovery from this test.

## Technical discussion prompts

- **“No data leaves our region.”** Functions and Atlas placement do not constrain direct voice or model routing. Start by defining data classes and allowed providers/regions; disable voice until the permitted media path is established.
- **“The budget is halved.”** Preserve manual controls and the saved-scene contract; measure text models on the same semantic suite, shorten voice sessions, and use account/project spend limits. Do not remove validation or silently weaken ownership.
- **“Can this prove that my furniture fits?”** It can show catalog dimensions in a known sample room. Real fit needs trusted room measurements, exact assets, collision and circulation validation, and clear product language.
- **“Why no Workflow?”** The core edit is short and atomically committed. Long-running photo reconstruction or human approval would change the durability requirements and justify a workflow.

End by showing evidence and limitations, not an unverified claim about adoption or production readiness.
