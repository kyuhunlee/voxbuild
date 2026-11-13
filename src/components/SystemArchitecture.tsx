"use client";

import { useId, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, AudioLines, Box, Code2, Database, Maximize2, MessageSquare, ZoomIn, X } from "lucide-react";
import PromptFlowExplainer from "./PromptFlowExplainer";
import "./system-architecture.css";

type MapNodeProps = { x: number; y: number; width: number; height: number; title: string; lines: string[]; tag?: string; tone?: "app" | "provider" | "retained" | "fixture" | "proposed"; compact?: boolean };

function MapNode({ x, y, width, height, title, lines, tag, tone = "app", compact = false }: MapNodeProps) {
  return <g className={"system-map-node system-map-node-" + tone} transform={"translate(" + x + " " + y + ")"}>
    <rect width={width} height={height} rx="10" />
    {tag && !compact && <text className="system-map-node-tag" x="15" y="18">{tag}</text>}
    <text className="system-map-node-title" x="15" y={compact ? 24 : 39}>{title}</text>
    <text className="system-map-node-copy" x="15" y={compact ? 44 : 59}>{lines.map((line, index) => <tspan key={line} x="15" dy={index === 0 ? 0 : 17}>{line}</tspan>)}</text>
  </g>;
}

function ArchitectureGraph() {
  const unique = useId().replace(/:/g, "");
  const runtimeArrow = unique + "runtime";
  const mediaArrow = unique + "media";
  const deliveryArrow = unique + "delivery";
  const proposedArrow = unique + "proposed";
  return <svg className="system-map-svg" viewBox="0 0 1200 752" preserveAspectRatio="xMidYMin meet" role="img" aria-labelledby={unique + "title " + unique + "desc"}>
    <title id={unique + "title"}>VoxBuild complete system architecture</title>
    <desc id={unique + "desc"}>GitHub triggers Vercel builds and deployments; CI runs alongside them. Vercel serves the browser application and static assets. React and Three.js render accepted scene JSON locally. Browser requests and API responses connect to Node.js Functions for signed sessions, owned scenes, voice tokens, text planning, and validated commands. Both the text and token Functions load the owned scene from Atlas. AI SDK sends typed prompts through AI Gateway to a text model. A Function mints a single-use voice connection token with a 60-second expiry. Browser audio and tools travel over Gateway's WebSocket relay to OpenAI Realtime, bypassing application Functions. Separate gpt-4o-mini-transcribe captions return within that voice session for display; captions do not feed the typed-prompt model. Completed voice tools return through the browser to the command API. Text calls the shared executor in-process. Atlas atomically saves scene, revision, and receipt together, then the API returns accepted state to the browser. Admission counters are separate writes. UI, voice, and validation use a bundled 14-SKU catalog; the optional HTTPS metadata adapter feeds text context and the catalog API. Customer identity and AWS connections are proposed. Active voice fallback is not implemented.</desc>
    <defs>
      <marker id={runtimeArrow} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto-start-reverse"><path d="M1 1L7 4L1 7" /></marker>
      <marker id={mediaArrow} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto-start-reverse"><path d="M1 1L7 4L1 7" /></marker>
      <marker id={deliveryArrow} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M1 1L7 4L1 7" /></marker>
      <marker id={proposedArrow} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M1 1L7 4L1 7" /></marker>
    </defs>

    <rect className="system-map-delivery-boundary" x="15" y="8" width="1170" height="112" rx="12" />
    <text className="system-map-lane-label" x="35" y="29">Delivery path · separate from a live room edit</text>
    <rect className="system-map-vercel-boundary" x="305" y="172" width="510" height="428" rx="14" />
    <text className="system-map-boundary-label" x="325" y="194">Vercel application + managed AI Gateway</text>
    <text className="system-map-outside-label" x="890" y="169">External providers and retained data</text>

    <g className="system-map-edges">
      <path className="system-map-edge-delivery" d="M230 73H340" markerEnd={"url(#" + deliveryArrow + ")"} />
      <path className="system-map-edge-delivery" d="M570 73H660" markerEnd={"url(#" + deliveryArrow + ")"} />
      <path className="system-map-edge-delivery" d="M775 100V130H60V245" markerEnd={"url(#" + deliveryArrow + ")"} />
      <path className="system-map-edge-media" d="M152 245V145H690V210" markerStart={"url(#" + mediaArrow + ")"} markerEnd={"url(#" + mediaArrow + ")"} />
      <path className="system-map-edge-runtime" d="M265 320H288" markerStart={"url(#" + runtimeArrow + ")"} />
      <path className="system-map-edge-runtime" d="M288 255V522M288 255H325M288 382H325M288 522H325" />
      <path className="system-map-edge-runtime" d="M310 255H325M310 382H325M310 522H325" markerEnd={"url(#" + runtimeArrow + ")"} />
      <path className="system-map-edge-media" d="M150 370V407" markerEnd={"url(#" + mediaArrow + ")"} />
      <path className="system-map-edge-setup" d="M535 287H565V270H585" markerStart={"url(#" + runtimeArrow + ")"} markerEnd={"url(#" + runtimeArrow + ")"} />
      <path className="system-map-edge-media" d="M795 255H842V242H890" markerStart={"url(#" + mediaArrow + ")"} markerEnd={"url(#" + mediaArrow + ")"} />
      <path className="system-map-edge-runtime" d="M535 382H585" markerStart={"url(#" + runtimeArrow + ")"} markerEnd={"url(#" + runtimeArrow + ")"} />
      <path className="system-map-edge-runtime" d="M795 382H890" markerStart={"url(#" + runtimeArrow + ")"} markerEnd={"url(#" + runtimeArrow + ")"} />
      <path className="system-map-edge-runtime" d="M430 435V470" markerEnd={"url(#" + runtimeArrow + ")"} />
      <path className="system-map-edge-runtime" d="M535 255H548V593H860V545H890" markerStart={"url(#" + runtimeArrow + ")"} markerEnd={"url(#" + runtimeArrow + ")"} />
      <path className="system-map-edge-runtime" d="M535 410H548" markerStart={"url(#" + runtimeArrow + ")"} />
      <path className="system-map-edge-runtime" d="M610 470V450H485V435" markerEnd={"url(#" + runtimeArrow + ")"} />
      <path className="system-map-edge-runtime" d="M430 575V615H1025V599" markerStart={"url(#" + runtimeArrow + ")"} markerEnd={"url(#" + runtimeArrow + ")"} />
      <path className="system-map-edge-proposed" d="M690 575V665H890" markerEnd={"url(#" + proposedArrow + ")"} />
      <path className="system-map-edge-proposed" d="M265 665H299V236H325" markerEnd={"url(#" + proposedArrow + ")"} />
    </g>

    <MapNode x={40} y={46} width={190} height={54} title="GitHub repository" lines={["Commit history + CI checks"]} compact />
    <MapNode x={340} y={46} width={230} height={54} title="Vercel build + deployments" lines={["Main production · branch previews"]} compact />
    <MapNode x={660} y={46} width={230} height={54} title="Vercel CDN / app delivery" lines={["Next.js app, JS, CSS, fonts"]} compact />
    <text className="system-map-delivery-note" x="920" y="66">CI checks run in parallel.</text>
    <text className="system-map-delivery-note" x="920" y="85">They do not gate promotion.</text>

    <MapNode x={35} y={245} width={230} height={125} title="Visitor’s browser" tag="Local rendering + audio" lines={["React + Three.js / R3F", "AI SDK microphone + playback", "Accepted JSON updates the room", "HTTPS requests + API responses"]} />
    <MapNode x={35} y={407} width={230} height={105} title="English captions" tag="Transcription output · browser display" lines={["gpt-4o-mini-transcribe (en)", "Separate from audio reasoning", "Never feeds the typed-prompt path"]} />
    <MapNode x={325} y={210} width={210} height={105} title="Session + token APIs" tag="Server credentials remain private" lines={["/api/session · /api/scenes", "/api/realtime-token", "Returns token + room/tool config"]} />
    <MapNode x={585} y={210} width={210} height={90} title="Gateway realtime relay" tag="Managed voice · WSS" lines={["Normalized audio + tool events", "No in-session voice fallback"]} />
    <MapNode x={325} y={330} width={210} height={105} title="Text planning + AI SDK" tag="Function · /api/scene-agent" lines={["Read canonical scene + catalog", "generateText → structured plan", "Calls same executor in-process"]} />
    <MapNode x={585} y={330} width={210} height={105} title="AI Gateway" tag="Managed service · text routing" lines={["Primary / fallback selection", "Actual model + provider trace", "Usage, cost, request timings"]} />
    <MapNode x={325} y={470} width={210} height={105} title="Shared scene executor" tag="Manual / voice: /api/commands" lines={["Strict schema + domain rules", "Owner + expected revision", "Atomic scene + revision + receipt"]} />
    <MapNode x={585} y={470} width={210} height={105} title="Catalog + adapter" tag="Fixture default · server metadata" tone="fixture" lines={["UI / voice: bundled 14 SKUs", "Text + /api/catalog: adapter", "Validation uses bundled bounds"]} />

    <MapNode x={890} y={194} width={270} height={112} title="OpenAI Realtime" tag="Voice reasoning · through Gateway" tone="provider" lines={["openai/gpt-realtime-2.1", "Audio understanding + edit tools", "Spoken reply after tool result"]} />
    <MapNode x={890} y={330} width={270} height={125} title="Configured text models" tag="Execution is confirmed per request" tone="provider" lines={["Primary: openai/gpt-4.1-mini", "Fallback: google/gemini-2.5-flash", "Policy routing tested; outage untested"]} />
    <MapNode x={890} y={495} width={270} height={104} title="MongoDB Atlas" tag="Real demo cluster · retain in target" tone="retained" lines={["Owned room + artwork + furniture", "Revisions + command receipts", "Admission counters with TTL"]} />
    <MapNode x={35} y={630} width={230} height={80} title="Customer identity" tag="Proposed customer integration" tone="proposed" lines={["Demo: signed anonymous cookie"]} />
    <MapNode x={890} y={630} width={270} height={80} title="Existing AWS catalog API" tag="Optional / proposed integration seam" tone="proposed" lines={["HTTPS known-SKU metadata adapter"]} />

    <text className="system-map-media-label" x="340" y="136">Realtime WebSocket audio + tool data via Gateway</text>
    <text className="system-map-edge-label" x="555" y="281">Mint</text>
    <text className="system-map-media-label" x="162" y="392">Caption events</text>
    <text className="system-map-edge-label" x="817" y="233">WSS relay</text>
    <text className="system-map-edge-label" x="440" y="458">Plan</text>
    <text className="system-map-edge-label" x="515" y="444">Catalog data</text>
    <text className="system-map-edge-label" x="555" y="608">Atomic save + acknowledged scene</text>
    <text className="system-map-edge-label" x="615" y="585">Owned reads: token + text APIs</text>
    <text className="system-map-proposed-label" x="704" y="655">Optional metadata</text>
    <text className="system-map-bottom-note" x="325" y="735">Voice tool call → browser → validated command → save acknowledgement → spoken confirmation.</text>
  </svg>;
}

export default function SystemArchitecture({ onOpen }: { onOpen?: () => void }) {
  const dialogTitleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const mapTab = useRef<HTMLButtonElement>(null);
  const flowTab = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [fitMap, setFitMap] = useState(true);
  const [view, setView] = useState<"map" | "flow">("map");

  function openMap(nextView: "map" | "flow") {
    if (!dialog.current || dialog.current.open) return;
    onOpen?.();
    setView(nextView);
    setFitMap(window.matchMedia("(min-width: 641px)").matches);
    dialog.current.showModal();
    setIsOpen(true);
    scroll.current?.scrollTo({ top: 0, left: 0 });
    heading.current?.focus({ preventScroll: true });
  }

  function selectView(nextView: "map" | "flow") {
    setView(nextView);
    scroll.current?.scrollTo({ top: 0, left: 0 });
  }

  return <section className="system-architecture" aria-label="VoxBuild system architecture">
    <div className="system-architecture-preview">
      <div><Box size={19} aria-hidden="true" /><strong>Browser</strong><span>Render</span></div><ArrowRight size={15} aria-hidden="true" />
      <div><Code2 size={19} aria-hidden="true" /><strong>Functions</strong><span>Validate</span></div><ArrowRight size={15} aria-hidden="true" />
      <div><Database size={19} aria-hidden="true" /><strong>Atlas</strong><span>Persist</span></div>
    </div>
    <div className="system-architecture-routes"><p><MessageSquare size={14} aria-hidden="true" /><span>Text via AI SDK + AI Gateway</span></p><p><AudioLines size={14} aria-hidden="true" /><span>Voice via AI SDK + Gateway WSS relay</span></p></div>
    <button type="button" className="system-architecture-open" onClick={() => openMap("flow")} aria-haspopup="dialog" aria-expanded={isOpen && view === "flow"}><ArrowRight size={15} aria-hidden="true" />Follow a prompt</button>
    <button type="button" className="system-architecture-open system-architecture-open-secondary" onClick={() => openMap("map")} aria-haspopup="dialog" aria-expanded={isOpen && view === "map"}><Maximize2 size={15} aria-hidden="true" />Open full system map</button>
    <p className="system-architecture-note">Architecture view, not live traffic. Shows the real demo and proposed customer connections.</p>
    <dialog ref={dialog} className="system-map-dialog" aria-labelledby={dialogTitleId} onClose={() => setIsOpen(false)}>
      <div className="system-map-shell">
        <header className="system-map-header" data-view={view}><div><h2 id={dialogTitleId} ref={heading} tabIndex={-1}>VoxBuild architecture</h2><p>A simple request walkthrough and the complete system map.</p></div><div className="system-map-header-actions">{view === "map" && <button type="button" className="system-map-view-toggle" onClick={() => { setFitMap((value) => !value); scroll.current?.scrollTo({ top: 0, left: 0 }); }}>{fitMap ? <ZoomIn size={15} aria-hidden="true" /> : <Maximize2 size={15} aria-hidden="true" />}<span>{fitMap ? "Enlarge labels" : "Fit complete map"}</span></button>}<button type="button" className="system-map-close" onClick={() => dialog.current?.close()} aria-label="Close architecture walkthrough"><ArrowLeft size={15} aria-hidden="true" /><span>Return to architecture</span><X size={16} aria-hidden="true" /></button></div></header>
        <div className="system-map-tabs" role="tablist" aria-label="Architecture explanation" onKeyDown={(event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          const next = event.key === "Home" ? "flow" : event.key === "End" ? "map" : view === "map" ? "flow" : "map";
          selectView(next); (next === "map" ? mapTab : flowTab).current?.focus();
        }}>
          <button ref={flowTab} id={dialogTitleId + "-flow-tab"} type="button" role="tab" aria-selected={view === "flow"} aria-controls={dialogTitleId + "-flow-panel"} tabIndex={view === "flow" ? 0 : -1} onClick={() => selectView("flow")}>How a prompt works</button>
          <button ref={mapTab} id={dialogTitleId + "-map-tab"} type="button" role="tab" aria-selected={view === "map"} aria-controls={dialogTitleId + "-map-panel"} tabIndex={view === "map" ? 0 : -1} onClick={() => selectView("map")}>Full system map</button>
        </div>
        {view === "map" && <div className="system-map-legend" aria-label="Connection legend"><span><i className="system-map-key-runtime" />Runtime HTTPS / data</span><span><i className="system-map-key-media" />Gateway realtime WSS</span><span><i className="system-map-key-delivery" />Delivery</span><span><i className="system-map-key-proposed" />Optional / proposed</span></div>}
        <div ref={scroll} className="system-map-scroll" data-view={view === "map" ? fitMap ? "fit" : "readable" : "flow"}>
          <div role="tabpanel" id={dialogTitleId + "-flow-panel"} aria-labelledby={dialogTitleId + "-flow-tab"} hidden={view !== "flow"} tabIndex={0}><PromptFlowExplainer /></div>
          <div role="tabpanel" id={dialogTitleId + "-map-panel"} aria-labelledby={dialogTitleId + "-map-tab"} hidden={view !== "map"} tabIndex={0}>
          <figure className="system-map-figure"><div className="system-map-canvas"><ArchitectureGraph /></div><figcaption>Static architecture, not live execution. Text Activity shows returned model/provider metadata. Voice serving-provider and per-response cost remain unknown unless reported.</figcaption></figure>
          <section className="system-map-journey" aria-label="Proposed customer journey">
            <span>Proposed customer journey</span>
            <p><strong>Existing listing</strong><ArrowRight size={15} aria-hidden="true" /><strong>VoxBuild planner + saved design</strong><ArrowRight size={15} aria-hidden="true" /><strong>Existing tour inquiry</strong></p>
            <small>The customer’s self-hosted Next.js app, OpenAI SDK feature, AWS services, Atlas, and identity stay. Approved property data, SSO, and the listing-to-tour handoff are proposed; this demo uses authored rooms, a catalog fixture, and a dedicated Atlas cluster.</small>
          </section>
          <details className="system-map-text-flow"><summary>Read the system flow</summary><ol><li><strong>Delivery:</strong> GitHub commits trigger Vercel builds, production or branch deployments, and asset delivery. Repository CI runs alongside deployment.</li><li><strong>Text:</strong> the Function loads the owned scene from Atlas and catalog context before calling AI SDK and Gateway. A complete validated plan calls the shared executor in-process. The API returns the accepted scene after the atomic save; read-only questions recheck the revision without a scene write.</li><li><strong>Voice:</strong> the token Function verifies ownership and requests a single-use client secret with a 60-second connection expiry. It returns the token and room/tool configuration. Browser audio goes through Gateway to OpenAI Realtime, bypassing application Functions. Completed tools return through the browser to the command API. The saved result updates the room and returns to Realtime before spoken confirmation is requested. There is no automatic in-session voice fallback.</li><li><strong>Captions:</strong> gpt-4o-mini-transcribe supplies English transcripts within the voice session. The browser displays these events; they are not submitted to the typed-prompt model.</li><li><strong>State:</strong> signed anonymous sessions own scene documents. Scene, revision, and receipt are one atomic write. Admission counters use separate writes. Atlas does not store audio, transcripts, or the browser activity log.</li><li><strong>Catalog and customer seams:</strong> UI, voice, and validation use the bundled catalog. The optional HTTPS metadata adapter feeds text generation and /api/catalog only. AWS and customer identity are proposed integrations. Token expiry does not cap session duration or spending.</li></ol></details>
          </div>
        </div>
      </div>
    </dialog>
  </section>;
}
