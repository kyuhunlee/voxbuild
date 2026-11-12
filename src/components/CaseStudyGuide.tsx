"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowLeft, ArrowRight, AudioLines, BookOpen, CheckCircle2, ChevronDown, Database, ExternalLink, Flag, MessageSquare, ShieldCheck, TriangleAlert, X } from "lucide-react";
import { CASE_STUDY_SECTIONS, type CaseStudyTone } from "@/lib/case-study";
import VercelProductDecision from "./VercelProductDecision";
import "./case-study-guide.css";

const STATUS_ICONS = { proof: CheckCircle2, target: Flag, retained: Database, risk: TriangleAlert } satisfies Record<CaseStudyTone, typeof Flag>;

function ArchitectureOverview() {
  return <figure className="case-study-flow" aria-label="Assumed current architecture: a listing web app and existing release pipeline use AWS APIs, MongoDB Atlas, and customer identity. Target: the existing listing adds a Vercel planner and Functions alongside the current app, with validated edits saved to retained Atlas. Existing APIs and identity stay in place. Text uses AI Gateway; voice connects directly to OpenAI Realtime.">
    <div className="case-study-before"><span>Assumed today</span><p><strong>Listing app + releases</strong><ArrowRight size={15} aria-hidden="true" /><strong>AWS APIs / Atlas / identity</strong></p></div>
    <div className="case-study-after"><span>Add alongside</span><p><strong>Existing listing</strong><ArrowRight size={15} aria-hidden="true" /><strong className="case-study-new-system">Vercel planner + Functions</strong><ArrowRight size={15} aria-hidden="true" /><strong>Retained Atlas</strong></p><small><ShieldCheck size={13} aria-hidden="true" />Existing app and services stay. Only validated edits are saved.</small></div>
    <figcaption>
      <p><MessageSquare size={15} aria-hidden="true" /><strong>Text</strong><span>Functions → AI SDK → AI Gateway</span></p>
      <p><AudioLines size={15} aria-hidden="true" /><strong>Voice</strong><span>Browser ↔ OpenAI Realtime over WebRTC</span></p>
    </figcaption>
  </figure>;
}

export default function CaseStudyGuide({ onOpen }: { onOpen: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const content = useRef<HTMLElement>(null);
  const sectionTitle = useRef<HTMLHeadingElement>(null);
  const [isOpen, setIsOpen] = useState(false);
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
    <dialog ref={dialog} id="case-study-guide" className="case-study-dialog" aria-labelledby="case-study-title" onClose={() => setIsOpen(false)} onKeyDown={handlePresentationKeys} onClick={(event) => { if (event.target === event.currentTarget) closeGuide(); }}>
      <div className="case-study-shell">
        <header className="case-study-header">
          <div><BookOpen size={20} aria-hidden="true" /><div><h2 id="case-study-title">VoxBuild case study</h2><p>A customer story you can walk through</p></div></div>
          <button type="button" className="case-study-close" onClick={closeGuide} aria-label="Close case study"><X size={20} aria-hidden="true" /></button>
        </header>
        <div className="case-study-body">
          <nav className="case-study-nav" aria-label="Case study sections">
            <p className="case-study-nav-intro">The walkthrough</p>
            {CASE_STUDY_SECTIONS.map((entry, index) => <button type="button" key={entry.id} onClick={() => navigate(index)} aria-current={index === sectionIndex ? "step" : undefined} aria-controls="case-study-content">
              <span>{entry.label}</span><ArrowRight size={14} aria-hidden="true" />
            </button>)}
            <div className="case-study-nav-links"><a href="https://voxbuild-nu.vercel.app/" target="_blank" rel="noopener noreferrer">Public demo<ExternalLink size={13} aria-hidden="true" /></a><a href="https://github.com/kyuhunlee/voxbuild" target="_blank" rel="noopener noreferrer">Source & history<ExternalLink size={13} aria-hidden="true" /></a></div>
          </nav>
          <div className="case-study-mobile-navigation"><label htmlFor="case-study-section">Jump to a section</label><select id="case-study-section" value={sectionIndex} onChange={(event) => navigate(Number(event.target.value))}>{CASE_STUDY_SECTIONS.map((entry, index) => <option key={entry.id} value={index}>{entry.label}</option>)}</select></div>
          <article ref={content} id="case-study-content" className="case-study-content" aria-labelledby="case-study-section-title" data-section={section.id}>
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
                  <div className="case-study-card-copy"><span className="case-study-card-tag"><StatusIcon size={13} aria-hidden="true" />{card.tag}</span><h4>{card.title}</h4>{card.value && <strong className="case-study-card-value">{card.value}</strong>}<p>{card.body}</p></div>
                </section>;
              })}
            </div>}
            {section.id === "demo" && <div className="case-study-demo-links"><button type="button" onClick={closeGuide}>Try it in the room<ArrowRight size={15} aria-hidden="true" /></button><a href="https://voxbuild-nu.vercel.app/" target="_blank" rel="noopener noreferrer">Public demo<ExternalLink size={13} aria-hidden="true" /></a><a href="https://github.com/kyuhunlee/voxbuild" target="_blank" rel="noopener noreferrer">Public repo<ExternalLink size={13} aria-hidden="true" /></a></div>}
            {!!section.details?.length && <details className="case-study-details" key={section.id}><summary>Details for Q&A<ChevronDown size={16} aria-hidden="true" /></summary><div>{section.details.map((block) => <section key={block.title}><h4>{block.title}</h4>{block.body && <p>{block.body}</p>}{block.bullets && <ul>{block.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}{block.rows && <dl>{block.rows.map((row) => <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl>}</section>)}</div></details>}
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
