"use client";

import { useId, useState } from "react";
import { AudioLines, ChevronDown, Database, MessageSquare, Monitor, ShieldCheck, Sparkles } from "lucide-react";
import "./prompt-flow-explainer.css";

type InputMode = "text" | "voice";
type FlowStep = { title: string; body: string; place: string; icon: typeof MessageSquare };

const SHARED_STEPS: FlowStep[] = [
  { title: "Validate the edit", body: "Our server checks ownership, supported operations, object IDs, placement rules, and the expected room revision.", place: "Vercel Function", icon: ShieldCheck },
  { title: "Save the accepted state", body: "Atlas updates the scene, new revision, and command receipt together in one atomic document write.", place: "MongoDB Atlas", icon: Database },
];

const STEPS: Record<InputMode, FlowStep[]> = {
  text: [
    { title: "Send your request", body: "The browser sends the prompt and room revision. A Function checks the visitor and loads the saved room and catalog context.", place: "Browser to Function", icon: MessageSquare },
    { title: "Plan through AI Gateway", body: "AI SDK in the Function sends the prompt and room context to Gateway. Gateway routes to a text model, which proposes a structured edit.", place: "Function to Gateway to model", icon: Sparkles },
    ...SHARED_STEPS,
    { title: "Update the room", body: "The browser receives the accepted scene. React and Three.js update the sofa’s material and show the response.", place: "Browser renders", icon: Monitor },
  ],
  voice: [
    { title: "Stream your voice", body: "Browser audio travels over Gateway’s WebSocket relay to OpenAI Realtime, which interprets the speech using the room context.", place: "Browser to Gateway", icon: AudioLines },
    { title: "Receive a tool call", body: "The completed edit proposal returns to the browser through AI SDK. The browser submits those operations to our command API.", place: "Realtime to browser to Function", icon: Sparkles },
    ...SHARED_STEPS,
    { title: "Update, then confirm", body: "The browser renders the accepted scene and returns the tool result to Realtime. The app then requests spoken confirmation.", place: "Browser + Realtime", icon: Monitor },
  ],
};

const ROLES = [
  { name: "AI SDK", role: "The integration library", body: "Structures text output and normalizes realtime audio and events. It runs in our code." },
  { name: "AI Gateway", role: "The model access service", body: "Routes model requests and relays voice. OpenAI Realtime remains the voice model behind it." },
  { name: "Vercel Functions", role: "The trusted application server", body: "Protect credentials, verify room ownership, load data, and enforce the rules before saving." },
  { name: "MongoDB Atlas", role: "The saved source of truth", body: "Stores room documents and revisions. The browser receives authorized data through our API." },
];

export default function PromptFlowExplainer() {
  const [mode, setMode] = useState<InputMode>("text");
  const headingId = useId();
  const pathId = useId();
  const voice = mode === "voice";

  return <section className="prompt-flow" data-mode={mode} aria-labelledby={headingId}>
    <header className="prompt-flow-intro">
      <div><h3 id={headingId}>From a request to a changed room</h3><p>Text and voice both use AI Gateway. Follow an edit from model proposal to validated save and a live 3D update.</p></div>
      <div className="prompt-flow-inputs" role="group" aria-label="Choose a prompt input">
        <button type="button" aria-pressed={!voice} aria-controls={pathId} onClick={() => setMode("text")}><MessageSquare size={17} aria-hidden="true" />Type</button>
        <button type="button" aria-pressed={voice} aria-controls={pathId} onClick={() => setMode("voice")}><AudioLines size={17} aria-hidden="true" />Speak</button>
      </div>
    </header>

    <div className="prompt-flow-example"><span>{voice ? "You say" : "You type"}</span><p>“Make the sofa sage.”</p><span className="prompt-flow-example-note">Illustrated flow, no request is sent</span></div>

    {voice && <aside className="prompt-flow-setup"><ShieldCheck size={18} aria-hidden="true" /><div><strong>First, connect the microphone</strong><p>A Function verifies the room, loads its context, and requests a single-use Gateway token with a 60-second connection expiry. Audio then flows directly between the browser and Gateway; the long-lived key stays on the server.</p></div></aside>}

    <div id={pathId} className="prompt-flow-path" aria-label={voice ? "Spoken prompt flow" : "Typed prompt flow"}>
      <ol className="prompt-flow-steps">
        {STEPS[mode].map((step, index) => {
          const Icon = step.icon;
          return <li key={step.title} className={index === 4 ? "prompt-flow-step prompt-flow-result" : "prompt-flow-step"}>
            <span className="prompt-flow-number" aria-hidden="true">{index + 1}</span>
            <div className="prompt-flow-step-copy"><span className="prompt-flow-place"><Icon size={14} aria-hidden="true" />{step.place}</span><h4>{step.title}</h4><p>{step.body}</p></div>
          </li>;
        })}
      </ol>
      {voice && <aside className="prompt-flow-caption"><strong>Captions take a separate path.</strong><p><span>gpt-4o-mini-transcribe</span> produces English captions for display. OpenAI Realtime understands the audio directly; those captions are not submitted to the typed-prompt model.</p></aside>}
      <p className="prompt-flow-question"><strong>Just asking a question?</strong> A furniture-cost question uses the supplied catalog estimate and returns an answer without editing or saving the scene.</p>
    </div>

    <section className="prompt-flow-roles" aria-label="What each system does"><h4>Each piece has a different job</h4><dl>{ROLES.map((entry) => <div key={entry.name}><dt>{entry.name}<span>{entry.role}</span></dt><dd>{entry.body}</dd></div>)}</dl></section>

    <details className="prompt-flow-details"><summary>Technical details and boundaries<ChevronDown size={16} aria-hidden="true" /></summary><div>
      <p><strong>Typed requests:</strong> <code>/api/scene-agent</code> reads the canonical scene, calls AI SDK with structured output through Gateway, and invokes the shared scene executor in-process. It returns the complete accepted result; partial model output never changes the room.</p>
      <p><strong>Voice setup and edits:</strong> <code>/api/realtime-token</code> issues connection credentials. A completed <code>apply_scene_operations</code> tool call returns through the browser to <code>/api/commands</code>, which invokes that same executor. The continuous audio session does not run inside a Vercel Function.</p>
      <p><strong>Saving:</strong> the MongoDB update checks owner, expected revision, and command ID. Invalid or conflicting edits are rejected. Atomicity covers the scene document; model generation and admission counters are separate operations.</p>
      <p><strong>Recovery:</strong> accepted state survives a reload. Active voice sessions have no automatic model failover or resume. Interrupting speech does not undo a save that already started. Token expiry is a connection limit, not a hard session spending cap.</p>
      <p><strong>Model roles:</strong> typed prompts use a text model, spoken prompts use OpenAI Realtime, and captions use a separate transcription model. Atlas stores accepted scenes and admission counters, not conversation audio or transcripts.</p>
    </div></details>
  </section>;
}
