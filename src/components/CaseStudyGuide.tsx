"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, AudioLines, BookOpen, Box, Check, Cloud, ExternalLink, MessageSquare, ShieldCheck, X } from "lucide-react";
import { CASE_STUDY_SECTIONS } from "@/lib/case-study";
import "./case-study-guide.css";

function ArchitectureOverview() {
  return <figure className="case-study-flow" aria-label="The browser uses Vercel Functions to validate and save scene changes in external MongoDB Atlas. Text requests use AI SDK and AI Gateway. Voice media connects directly to OpenAI Realtime.">
    <div className="case-study-flow-label"><ShieldCheck size={14} aria-hidden="true" />One validated save path</div>
    <div className="case-study-flow-path">
      <div><span className="case-study-flow-symbol"><Box size={20} aria-hidden="true" /></span><strong>Browser</strong><span>Render the room</span></div>
      <ArrowRight className="case-study-flow-arrow" size={17} aria-hidden="true" />
      <div><span className="case-study-flow-symbol"><span className="case-study-vercel-mark" aria-hidden="true" /></span><strong>Vercel Functions</strong><span>Validate the edit</span></div>
      <ArrowRight className="case-study-flow-arrow" size={17} aria-hidden="true" />
      <div><span className="case-study-flow-symbol"><Cloud size={20} aria-hidden="true" /></span><strong>MongoDB Atlas</strong><span>Persist accepted state</span></div>
    </div>
    <figcaption>
      <div><MessageSquare size={15} aria-hidden="true" /><p><strong>Text planning</strong><span>Vercel Functions → AI SDK → AI Gateway</span></p></div>
      <div><AudioLines size={15} aria-hidden="true" /><p><strong>Live voice</strong><span>Browser ↔ OpenAI Realtime over WebRTC</span></p></div>
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

  function navigate(index: number) { setSectionIndex(index); }

  function openGuide() {
    if (!dialog.current || dialog.current.open) return;
    onOpen();
    dialog.current.showModal();
    setIsOpen(true);
  }

  function closeGuide() { dialog.current?.close(); }

  return <>
    <button className="case-study-trigger" type="button" onClick={openGuide} aria-label="Open VoxBuild case study" aria-haspopup="dialog" aria-expanded={isOpen} aria-controls="case-study-guide">
      <BookOpen size={16} aria-hidden="true" /><span>Case study</span>
    </button>
    <dialog ref={dialog} id="case-study-guide" className="case-study-dialog" aria-labelledby="case-study-title" onClose={() => setIsOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) closeGuide(); }}>
      <div className="case-study-shell">
        <header className="case-study-header">
          <div><span className="case-study-heading-icon"><BookOpen size={19} aria-hidden="true" /></span><div><h2 id="case-study-title">VoxBuild case study</h2><p>The customer story behind the demo</p></div></div>
          <button type="button" className="case-study-close" onClick={closeGuide} aria-label="Close case study"><X size={20} aria-hidden="true" /></button>
        </header>
        <div className="case-study-body">
          <nav className="case-study-nav" aria-label="Case study sections">
            <div className="case-study-nav-intro"><p>The proposal</p><span>From customer need<br />to working product.</span></div>
            {CASE_STUDY_SECTIONS.map((entry, index) => <button type="button" key={entry.id} onClick={() => navigate(index)} aria-current={index === sectionIndex ? "step" : undefined} aria-controls="case-study-content">
              <span>{entry.label}</span><ArrowRight size={14} aria-hidden="true" />
            </button>)}
            <a href="https://github.com/kyuhunlee/voxbuild" target="_blank" rel="noopener noreferrer">View source <ExternalLink size={13} aria-hidden="true" /></a>
          </nav>
          <div className="case-study-mobile-navigation"><div><label htmlFor="case-study-section">Explore the proposal</label><a href="https://github.com/kyuhunlee/voxbuild" target="_blank" rel="noopener noreferrer">View source <ExternalLink size={12} aria-hidden="true" /></a></div><select id="case-study-section" value={sectionIndex} onChange={(event) => navigate(Number(event.target.value))}>{CASE_STUDY_SECTIONS.map((entry, index) => <option key={entry.id} value={index}>{entry.label}</option>)}</select></div>
          <article ref={content} id="case-study-content" className="case-study-content" aria-labelledby="case-study-section-title" data-section={section.id}>
            <div className="case-study-section-count"><span>{section.label}</span><span>{sectionIndex + 1}<span className="case-study-count-divider">/</span>{CASE_STUDY_SECTIONS.length}</span></div>
            <div className="case-study-progress" aria-hidden="true"><span style={{ width: `${(sectionIndex + 1) / CASE_STUDY_SECTIONS.length * 100}%` }} /></div>
            <div className="case-study-hero">
              <h3 ref={sectionTitle} tabIndex={-1} id="case-study-section-title">{section.title}</h3>
              <p className="case-study-intro">{section.intro}</p>
            </div>
            {section.id === "architecture" && <ArchitectureOverview />}
            {section.blocks.map((block) => <section className={`case-study-block${block.rows ? " case-study-block-rows" : ""}`} key={block.title}>
              <h4>{block.title}</h4>
              {block.body && <p>{block.body}</p>}
              {block.bullets && <ul>{block.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}
              {block.rows && <dl>{block.rows.map((row) => <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl>}
            </section>)}
            {section.id === "demo" && <div className="case-study-evidence-note"><Check size={15} aria-hidden="true" /><p>These are recorded checks, not a live health monitor. Use <strong>Architecture</strong> in the planner to inspect this session’s actual requests.</p></div>}
          </article>
        </div>
        <footer className="case-study-footer">
          <button type="button" onClick={() => navigate(sectionIndex - 1)} disabled={sectionIndex === 0}><ArrowLeft size={15} aria-hidden="true" />Previous</button>
          {sectionIndex < CASE_STUDY_SECTIONS.length - 1 ? <button type="button" className="case-study-next" onClick={() => navigate(sectionIndex + 1)}><span><span className="case-study-next-label">Next</span>{CASE_STUDY_SECTIONS[sectionIndex + 1].label}</span><ArrowRight size={16} aria-hidden="true" /></button> : <button type="button" className="case-study-next" onClick={closeGuide}>Return to demo<ArrowRight size={16} aria-hidden="true" /></button>}
        </footer>
      </div>
    </dialog>
  </>;
}
