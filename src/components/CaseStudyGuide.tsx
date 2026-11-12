"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowLeft, ArrowRight, AudioLines, BookOpen, CheckCircle2, ChevronDown, Database, ExternalLink, Flag, Maximize2, MessageSquare, Minimize2, ShieldCheck, TriangleAlert, X } from "lucide-react";
import { CASE_STUDY_SECTIONS, type CaseStudyTone } from "@/lib/case-study";
import VercelProductDecision from "./VercelProductDecision";
import "./case-study-guide.css";

const STATUS_ICONS = { proof: CheckCircle2, target: Flag, retained: Database, risk: TriangleAlert } satisfies Record<CaseStudyTone, typeof Flag>;

function ArchitectureOverview() {
  return <figure className="case-study-flow" aria-label="Assumed current architecture: self-hosted Next.js and an existing OpenAI SDK feature use AWS APIs, MongoDB Atlas, and customer identity. Target: add a Vercel planner alongside the existing application. The proposed renter journey goes from a listing to a saved design and back to the existing tour inquiry. Text and realtime voice use AI SDK and AI Gateway; both save validated edits to Atlas. The demo uses authored rooms and its own real Atlas cluster.">
    <div className="case-study-before"><span>Assumed today</span><p><strong>Self-hosted Next.js + OpenAI SDK</strong><ArrowRight size={15} aria-hidden="true" /><strong>AWS / Atlas / identity</strong></p></div>
    <div className="case-study-after"><span>Add alongside</span><p><strong>Existing listing</strong><ArrowRight size={15} aria-hidden="true" /><strong className="case-study-new-system">Vercel planner + Functions</strong><ArrowRight size={15} aria-hidden="true" /><strong>Retained Atlas</strong></p><small><ShieldCheck size={13} aria-hidden="true" />Existing app and services stay. Only validated edits are saved.</small></div>
    <div className="case-study-journey"><span>Proposed journey</span><p><strong>Explore a listing</strong><ArrowRight size={15} aria-hidden="true" /><strong>Plan + save a room</strong><ArrowRight size={15} aria-hidden="true" /><strong>Request a tour</strong></p><small>Approved room/catalog data initializes the planner; the saved design can accompany an inquiry in the existing marketplace.</small></div>
    <figcaption>
      <p><MessageSquare size={15} aria-hidden="true" /><strong>Text</strong><span>AI SDK → Gateway → text model</span></p>
      <p><AudioLines size={15} aria-hidden="true" /><strong>Voice</strong><span>AI SDK ↔ Gateway WSS ↔ OpenAI Realtime</span></p>
    </figcaption>
  </figure>;
}

export default function CaseStudyGuide({ onOpen }: { onOpen: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const content = useRef<HTMLElement>(null);
  const sectionTitle = useRef<HTMLHeadingElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [sectionIndex, setSectionIndex] = useState(0);
  const section = CASE_STUDY_SECTIONS[sectionIndex];

  useEffect(() => {
    if (!isOpen) return;
    content.current?.scrollTo({ top: 0 });
    sectionTitle.current?.focus({ preventScroll: true });
  }, [sectionIndex, isOpen]);

  function navigate(index: number) { setSectionIndex(Math.max(0, Math.min(CASE_STUDY_SECTIONS.length - 1, index))); }
  function openGuide() {
    if (!dialog.current || dialog.current.open) return;
    onOpen();
    dialog.current.showModal();
    setIsOpen(true);
  }
  function closeGuide() { dialog.current?.close(); }
  function handlePresentationKeys(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.defaultPrevented || !(event.target instanceof Element)) return;
    if (window.getSelection()?.isCollapsed === false) return;
    if (event.target.closest("button, a, select, input, textarea, summary, [contenteditable='true']")) return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    navigate(sectionIndex + (event.key === "ArrowRight" ? 1 : -1));
  }

  return <>
    <button className="case-study-trigger" type="button" onClick={openGuide} aria-label="Open VoxBuild case study" aria-haspopup="dialog" aria-expanded={isOpen} aria-controls="case-study-guide">
      <BookOpen size={16} aria-hidden="true" /><span>Case study</span>
    </button>
    <dialog ref={dialog} id="case-study-guide" className={`case-study-dialog${isExpanded ? " is-expanded" : ""}`} aria-labelledby="case-study-title" onClose={() => { setIsOpen(false); setIsExpanded(false); }} onKeyDown={handlePresentationKeys} onClick={(event) => { if (event.target === event.currentTarget) closeGuide(); }}>
      <div className="case-study-shell">
        <header className="case-study-header">
          <div className="case-study-brand"><span className="case-study-brand-mark"><BookOpen size={20} aria-hidden="true" /></span><div><h2 id="case-study-title">VoxBuild case study</h2><p>Customer scenario, architecture, and business case</p></div></div>
          <div className="case-study-header-actions"><button type="button" className="case-study-expand" onClick={() => setIsExpanded((expanded) => !expanded)} aria-label={isExpanded ? "Restore case study side panel" : "Expand case study to full screen"} aria-controls="case-study-guide">{isExpanded ? <Minimize2 size={15} aria-hidden="true" /> : <Maximize2 size={15} aria-hidden="true" />}<span>{isExpanded ? "Side panel" : "Full screen"}</span></button><button type="button" className="case-study-close" onClick={closeGuide}><span>Return to demo</span><X size={17} aria-hidden="true" /></button></div>
        </header>
        <div className="case-study-body">
          <nav className="case-study-nav" aria-label="Case study sections">
            <p className="case-study-nav-intro">The walkthrough</p>
            {CASE_STUDY_SECTIONS.map((entry, index) => <button type="button" key={entry.id} onClick={() => navigate(index)} aria-current={index === sectionIndex ? "step" : undefined} aria-controls="case-study-content">
              <span className="case-study-nav-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><span>{entry.label}</span><ArrowRight size={14} aria-hidden="true" />
            </button>)}
            <div className="case-study-nav-links"><a href="https://voxbuild-nu.vercel.app/" target="_blank" rel="noopener noreferrer">Public demo<ExternalLink size={13} aria-hidden="true" /></a><a href="https://github.com/kyuhunlee/voxbuild" target="_blank" rel="noopener noreferrer">Source & history<ExternalLink size={13} aria-hidden="true" /></a><details className="case-study-status-key"><summary>Status key<ChevronDown size={12} aria-hidden="true" /></summary><div><span data-tone="proof"><CheckCircle2 size={12} aria-hidden="true" />Demonstrated</span><span data-tone="target"><Flag size={12} aria-hidden="true" />Pilot / proposal</span><span data-tone="retained"><Database size={12} aria-hidden="true" />Customer / reference</span><span data-tone="risk"><TriangleAlert size={12} aria-hidden="true" />Risk / limit</span></div></details></div>
          </nav>
          <div className="case-study-mobile-navigation"><label htmlFor="case-study-section">Jump to a section</label><select id="case-study-section" value={sectionIndex} onChange={(event) => navigate(Number(event.target.value))}>{CASE_STUDY_SECTIONS.map((entry, index) => <option key={entry.id} value={index}>{entry.label}</option>)}</select></div>
          <article ref={content} id="case-study-content" className="case-study-content" aria-labelledby="case-study-section-title" data-section={section.id}>
            <div className="case-study-page">
            <div className="case-study-section-count"><span>{section.label}</span><span>{sectionIndex + 1} of {CASE_STUDY_SECTIONS.length}</span></div>
            <div className="case-study-progress" aria-hidden="true"><span style={{ width: ((sectionIndex + 1) / CASE_STUDY_SECTIONS.length * 100) + "%" }} /></div>
            <div className="case-study-hero"><h3 ref={sectionTitle} tabIndex={-1} id="case-study-section-title">{section.title}</h3><p>{section.intro}</p></div>
            {section.id === "architecture" && <ArchitectureOverview />}
            {section.id === "vercel" && <VercelProductDecision />}
            {section.id !== "vercel" && <div className={"case-study-cards" + (section.id === "rollout" ? " case-study-sequence" : "")}>
              {section.cards.map((card, index) => {
                const StatusIcon = STATUS_ICONS[card.tone];
                return <section className="case-study-card" data-tone={card.tone} key={card.title}>
                  {section.id === "rollout" && <span className="case-study-step" aria-label={"Step " + (index + 1)}>{index + 1}</span>}
                  <div className="case-study-card-copy"><span className="case-study-card-tag"><StatusIcon size={13} aria-hidden="true" />{card.tag}</span><h4>{card.title}</h4>{card.value && <strong className="case-study-card-value">{card.value}</strong>}<p>{section.id === "demo" ? card.body.split(/(“[^”]+”)/g).map((part, partIndex) => part.startsWith("“") ? <span className="case-study-prompt" key={partIndex}>{part}</span> : part) : card.body}</p>{card.source && <a className="case-study-card-source" href={card.source.href} target="_blank" rel="noopener noreferrer">{card.source.label}<ExternalLink size={12} aria-hidden="true" /></a>}</div>
                </section>;
              })}
            </div>}
            {section.id === "demo" && <div className="case-study-demo-links"><button type="button" onClick={closeGuide}>Try it in the room<ArrowRight size={15} aria-hidden="true" /></button><a href="https://voxbuild-nu.vercel.app/" target="_blank" rel="noopener noreferrer">Public demo<ExternalLink size={13} aria-hidden="true" /></a><a href="https://github.com/kyuhunlee/voxbuild" target="_blank" rel="noopener noreferrer">Public repo<ExternalLink size={13} aria-hidden="true" /></a></div>}
            {!!section.details?.length && <details className="case-study-details" key={section.id}><summary>Details for Q&A<ChevronDown size={16} aria-hidden="true" /></summary><div>{section.details.map((block) => <section key={block.title}><h4>{block.title}</h4>{block.body && <p>{block.body}</p>}{block.bullets && <ul>{block.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}{block.rows && <dl>{block.rows.map((row) => <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl>}</section>)}</div></details>}
            </div>
          </article>
        </div>
        <footer className="case-study-footer">
          <button type="button" onClick={() => navigate(sectionIndex - 1)} disabled={sectionIndex === 0}><ArrowLeft size={15} aria-hidden="true" />Previous</button>
          <span className="case-study-key-hint">Use ← → to present</span>
          {sectionIndex < CASE_STUDY_SECTIONS.length - 1 ? <button type="button" className="case-study-next" onClick={() => navigate(sectionIndex + 1)}>{CASE_STUDY_SECTIONS[sectionIndex + 1].label}<ArrowRight size={16} aria-hidden="true" /></button> : <button type="button" className="case-study-next" onClick={closeGuide}>Return to demo<ArrowRight size={16} aria-hidden="true" /></button>}
        </footer>
      </div>
    </dialog>
  </>;
}
