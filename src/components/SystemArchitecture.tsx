"use client";

import { useId, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, AudioLines, Box, Code2, Database, Maximize2, MessageSquare, ZoomIn, X } from "lucide-react";
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
    <desc id={unique + "desc"}>GitHub triggers Vercel builds and deployments; CI runs alongside them. Vercel serves the browser application and static assets. React and Three.js render the room locally. Browser HTTPS requests use Node.js Vercel Functions for anonymous sessions, scene reads, voice setup, text planning, and validated scene commands. AI SDK calls AI Gateway, which routes to configured OpenAI or Google text models. Voice setup uses the server's OpenAI credential, then audio and tool data travel directly between browser and OpenAI Realtime over WebRTC. Completed voice tools return through the browser to the validated command API. Text planning calls the same executor internally. Atlas persists owned scenes, revisions, command receipts, and admission counters. The catalog is a bundled 14-SKU fixture; an optional existing AWS HTTPS API seam and customer identity integration are proposed.</desc>
    <defs>
      <marker id={runtimeArrow} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto-start-reverse"><path d="M1 1L7 4L1 7" /></marker>
      <marker id={mediaArrow} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto-start-reverse"><path d="M1 1L7 4L1 7" /></marker>
      <marker id={deliveryArrow} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M1 1L7 4L1 7" /></marker>
      <marker id={proposedArrow} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M1 1L7 4L1 7" /></marker>
    </defs>

    <rect className="system-map-delivery-boundary" x="15" y="8" width="1170" height="112" rx="12" />
    <text className="system-map-lane-label" x="35" y="29">Delivery path · separate from a live room edit</text>
    <rect className="system-map-vercel-boundary" x="305" y="172" width="510" height="428" rx="14" />
    <text className="system-map-boundary-label" x="325" y="194">Vercel application APIs + AI Gateway</text>
    <text className="system-map-outside-label" x="890" y="169">External providers and retained data</text>

    <g className="system-map-edges">
      <path className="system-map-edge-delivery" d="M230 73H340" markerEnd={"url(#" + deliveryArrow + ")"} />
      <path className="system-map-edge-delivery" d="M570 73H660" markerEnd={"url(#" + deliveryArrow + ")"} />
      <path className="system-map-edge-delivery" d="M775 100V130H60V245" markerEnd={"url(#" + deliveryArrow + ")"} />
      <path className="system-map-edge-media" d="M152 245V145H1025V194" markerStart={"url(#" + mediaArrow + ")"} markerEnd={"url(#" + mediaArrow + ")"} />
      <path className="system-map-edge-runtime" d="M265 320H288M288 255V522M288 255H325M288 382H325M288 522H325" />
      <path className="system-map-edge-runtime" d="M310 255H325M310 382H325M310 522H325" markerEnd={"url(#" + runtimeArrow + ")"} />
      <path className="system-map-edge-setup" d="M265 281H277V202H690V210" markerEnd={"url(#" + runtimeArrow + ")"} />
      <path className="system-map-edge-setup" d="M795 255H842V242H890" markerEnd={"url(#" + runtimeArrow + ")"} />
      <path className="system-map-edge-runtime" d="M535 382H585" markerStart={"url(#" + runtimeArrow + ")"} markerEnd={"url(#" + runtimeArrow + ")"} />
      <path className="system-map-edge-runtime" d="M795 382H890" markerStart={"url(#" + runtimeArrow + ")"} markerEnd={"url(#" + runtimeArrow + ")"} />
      <path className="system-map-edge-runtime" d="M430 435V470" markerEnd={"url(#" + runtimeArrow + ")"} />
      <path className="system-map-edge-runtime" d="M535 255H548V593H860V545H890" markerStart={"url(#" + runtimeArrow + ")"} markerEnd={"url(#" + runtimeArrow + ")"} />
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

    <MapNode x={35} y={245} width={230} height={125} title="Visitor’s browser" tag="Local rendering" lines={["Next.js / React interface", "Three.js + React Three Fiber", "3D room · controls · microphone"]} />
    <MapNode x={325} y={210} width={210} height={90} title="Session + scene APIs" tag="Node.js Functions · HTTPS" lines={["/api/session · /api/scenes", "Signed cookie + Atlas reads"]} />
    <MapNode x={585} y={210} width={210} height={90} title="Voice setup" tag="Function · server-only credentials" lines={["/api/realtime-session", "SDP setup; no media relay"]} />
    <MapNode x={325} y={330} width={210} height={105} title="Text planning + AI SDK" tag="Function · /api/scene-agent" lines={["Read canonical scene + catalog", "generateText → structured plan", "Calls same executor in-process"]} />
    <MapNode x={585} y={330} width={210} height={105} title="AI Gateway" tag="Managed service · text routing" lines={["Primary / fallback selection", "Actual model + provider trace", "Usage, cost, request timings"]} />
    <MapNode x={325} y={470} width={210} height={105} title="Shared scene executor" tag="Manual / voice: /api/commands" lines={["Strict schema + domain rules", "Owner + expected revision", "Atomic state + command receipt"]} />
    <MapNode x={585} y={470} width={210} height={105} title="Shared catalog fixture" tag="Fixture · not an AWS request" tone="fixture" lines={["14 renderable furniture SKUs", "UI + voice + text default", "Finite dimensions and finishes"]} />

    <MapNode x={890} y={194} width={270} height={112} title="OpenAI Realtime" tag="Direct voice · outside AI Gateway" tone="provider" lines={["gpt-realtime-2.1", "Audio + RTCDataChannel tool events", "ASR: gpt-4o-mini-transcribe (en)"]} />
    <MapNode x={890} y={330} width={270} height={125} title="Configured text models" tag="Execution is confirmed per request" tone="provider" lines={["Primary: openai/gpt-4.1-mini", "Fallback: google/gemini-2.5-flash", "Policy routing tested; outage untested"]} />
    <MapNode x={890} y={495} width={270} height={104} title="MongoDB Atlas" tag="Real external connection · retained" tone="retained" lines={["Owned room + artwork + furniture", "Revisions + command receipts", "Admission counters with TTL"]} />
    <MapNode x={35} y={630} width={230} height={80} title="Customer identity" tag="Proposed customer integration" tone="proposed" lines={["Demo: signed anonymous cookie"]} />
    <MapNode x={890} y={630} width={270} height={80} title="Existing AWS catalog API" tag="Optional / proposed integration seam" tone="proposed" lines={["HTTPS known-SKU metadata adapter"]} />

    <text className="system-map-media-label" x="440" y="136">Direct WebRTC audio + tool data</text>
    <text className="system-map-edge-label" x="817" y="233">SDP only</text>
    <text className="system-map-edge-label" x="440" y="458">Plan</text>
    <text className="system-map-edge-label" x="515" y="444">Catalog data</text>
    <text className="system-map-edge-label" x="555" y="608">Atomic save + acknowledged scene</text>
    <text className="system-map-edge-label" x="615" y="585">Owned scene reads</text>
    <text className="system-map-proposed-label" x="704" y="655">Optional HTTPS</text>
    <text className="system-map-bottom-note" x="325" y="735">Voice tool call → browser → validated command → save acknowledgement → spoken confirmation.</text>
  </svg>;
}

export default function SystemArchitecture({ onOpen }: { onOpen?: () => void }) {
  const dialogTitleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [fitMap, setFitMap] = useState(true);

  function openMap() {
    if (!dialog.current || dialog.current.open) return;
    onOpen?.();
    setFitMap(window.matchMedia("(min-width: 641px)").matches);
    dialog.current.showModal();
    setIsOpen(true);
    scroll.current?.scrollTo({ top: 0, left: 0 });
    heading.current?.focus({ preventScroll: true });
  }

  return <section className="system-architecture" aria-label="VoxBuild system architecture">
    <div className="system-architecture-preview">
      <div><Box size={19} aria-hidden="true" /><strong>Browser</strong><span>Render</span></div><ArrowRight size={15} aria-hidden="true" />
      <div><Code2 size={19} aria-hidden="true" /><strong>Functions</strong><span>Validate</span></div><ArrowRight size={15} aria-hidden="true" />
      <div><Database size={19} aria-hidden="true" /><strong>Atlas</strong><span>Persist</span></div>
    </div>
    <div className="system-architecture-routes"><p><MessageSquare size={14} aria-hidden="true" /><span>Text via AI SDK + AI Gateway</span></p><p><AudioLines size={14} aria-hidden="true" /><span>Voice directly over OpenAI WebRTC</span></p></div>
    <button type="button" className="system-architecture-open" onClick={openMap} aria-haspopup="dialog" aria-expanded={isOpen}><Maximize2 size={15} aria-hidden="true" />Open full system map</button>
    <p className="system-architecture-note">Architecture view, not live traffic. Shows the real demo and proposed customer connections.</p>
    <dialog ref={dialog} className="system-map-dialog" aria-labelledby={dialogTitleId} onClose={() => setIsOpen(false)}>
      <div className="system-map-shell">
        <header className="system-map-header"><div><h2 id={dialogTitleId} ref={heading} tabIndex={-1}>VoxBuild system map</h2><p>Delivery, model requests, live voice, and the shared save boundary.</p></div><div className="system-map-header-actions"><button type="button" className="system-map-view-toggle" onClick={() => { setFitMap((value) => !value); scroll.current?.scrollTo({ top: 0, left: 0 }); }}>{fitMap ? <ZoomIn size={15} aria-hidden="true" /> : <Maximize2 size={15} aria-hidden="true" />}<span>{fitMap ? "Enlarge labels" : "Fit complete map"}</span></button><button type="button" className="system-map-close" onClick={() => dialog.current?.close()} aria-label="Close system map"><ArrowLeft size={15} aria-hidden="true" /><span>Return to architecture</span><X size={16} aria-hidden="true" /></button></div></header>
        <div className="system-map-legend" aria-label="Connection legend"><span><i className="system-map-key-runtime" />Runtime HTTPS / data</span><span><i className="system-map-key-media" />Direct voice media + tool data</span><span><i className="system-map-key-delivery" />Delivery</span><span><i className="system-map-key-proposed" />Optional / proposed</span></div>
        <div ref={scroll} className="system-map-scroll" data-view={fitMap ? "fit" : "readable"} tabIndex={0} aria-label="Scrollable full system diagram">
          <figure className="system-map-figure"><div className="system-map-canvas"><ArchitectureGraph /></div><figcaption>Configured model names describe this demo, not which model served a particular request. Use Activity to inspect returned execution metadata.</figcaption></figure>
          <details className="system-map-text-flow"><summary>Read the system flow</summary><ol><li><strong>Delivery:</strong> GitHub commits trigger Vercel builds, production or branch deployments, and asset delivery. Repository CI runs alongside deployment.</li><li><strong>Text:</strong> the owned scene and catalog go to the text Function, AI SDK, and AI Gateway. A validated plan calls the shared executor internally and commits to Atlas.</li><li><strong>Voice:</strong> the server negotiates the connection with OpenAI. Audio and tool events then travel directly over WebRTC. Completed tools return through the browser to the command API; spoken confirmation follows the saved acknowledgement.</li><li><strong>State:</strong> signed anonymous sessions own scene documents. Atlas stores accepted room state, revisions, receipts, and admission counters—not audio, transcripts, or the browser’s activity log.</li><li><strong>Customer seams:</strong> AWS catalog and identity connections remain target integrations. The demo uses a labeled catalog fixture and its own signed sessions.</li></ol></details>
        </div>
      </div>
    </dialog>
  </section>;
}
