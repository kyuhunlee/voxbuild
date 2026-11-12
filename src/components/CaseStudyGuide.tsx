"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Box, Check, Cloud, ExternalLink, X } from "lucide-react";
import { CASE_STUDY_SECTIONS } from "@/lib/case-study";

function ArchitectureOverview() {
  return <figure className="case-study-flow" aria-label="The browser uses Vercel Functions to validate and save scene changes in external MongoDB Atlas. Text requests use AI SDK and AI Gateway. Voice media connects directly to OpenAI Realtime.">
    <div className="case-study-flow-path">
      <div><Box size={18} /><strong>Browser</strong><span>Interactive 3D planner</span></div>
      <ArrowRight className="case-study-flow-arrow" size={17} aria-hidden="true" />
      <div><span className="case-study-vercel-mark" aria-hidden="true" /><strong>Vercel</strong><span>Functions · AI SDK · Gateway</span></div>
      <ArrowRight className="case-study-flow-arrow" size={17} aria-hidden="true" />
      <div><Cloud size={18} /><strong>MongoDB Atlas</strong><span>External scene storage</span></div>
    </div>
    <figcaption>Text planning uses AI Gateway. Voice media connects directly from the browser to OpenAI Realtime. Every accepted edit passes through server validation and Atlas.</figcaption>
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
      <BookOpen size={15} aria-hidden="true" /><span>Case study</span>
    </button>
    <dialog ref={dialog} id="case-study-guide" className="case-study-dialog" aria-labelledby="case-study-title" onClose={() => setIsOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) closeGuide(); }}>
      <div className="case-study-shell">
        <header className="case-study-header">
          <div><span className="case-study-heading-icon"><BookOpen size={18} aria-hidden="true" /></span><div><h2 id="case-study-title">VoxBuild case study</h2><p>The customer story behind the demo</p></div></div>
          <button className="case-study-close" onClick={closeGuide} aria-label="Close case study"><X size={20} /></button>
        </header>
        <div className="case-study-body">
          <nav className="case-study-nav" aria-label="Case study sections">
            <p>Explore the proposal</p>
            {CASE_STUDY_SECTIONS.map((entry, index) => <button key={entry.id} onClick={() => navigate(index)} aria-current={index === sectionIndex ? "step" : undefined} aria-controls="case-study-content">
              <span>{entry.label}</span>{index === sectionIndex && <ArrowRight size={13} aria-hidden="true" />}
            </button>)}
            <a href="https://github.com/kyuhunlee/voxbuild" target="_blank" rel="noopener noreferrer">Public source <ExternalLink size={12} aria-hidden="true" /></a>
          </nav>
          <div className="case-study-mobile-navigation"><div><label htmlFor="case-study-section">Explore the proposal</label><a href="https://github.com/kyuhunlee/voxbuild" target="_blank" rel="noopener noreferrer">Public source <ExternalLink size={11} aria-hidden="true" /></a></div><select id="case-study-section" value={sectionIndex} onChange={(event) => navigate(Number(event.target.value))}>{CASE_STUDY_SECTIONS.map((entry, index) => <option key={entry.id} value={index}>{entry.label}</option>)}</select></div>
          <article ref={content} id="case-study-content" className="case-study-content" aria-labelledby="case-study-section-title">
            <div className="case-study-section-count"><span>Reference scenario</span><span>{sectionIndex + 1} of {CASE_STUDY_SECTIONS.length}</span></div>
            <h3 ref={sectionTitle} tabIndex={-1} id="case-study-section-title">{section.title}</h3>
            <p className="case-study-intro">{section.intro}</p>
            {section.id === "architecture" && <ArchitectureOverview />}
            {section.blocks.map((block) => <section className="case-study-block" key={block.title}>
              <h4>{block.title}</h4>
              {block.body && <p>{block.body}</p>}
              {block.bullets && <ul>{block.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}
              {block.rows && <dl>{block.rows.map((row) => <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl>}
            </section>)}
            {section.id === "demo" && <div className="case-study-evidence-note"><Check size={15} aria-hidden="true" /><p>These are recorded checks, not a live health monitor. Use <strong>Architecture</strong> in the planner to inspect this session’s actual requests.</p></div>}
          </article>
        </div>
        <footer className="case-study-footer">
          <button onClick={() => navigate(sectionIndex - 1)} disabled={sectionIndex === 0}><ArrowLeft size={15} aria-hidden="true" />Previous</button>
          {sectionIndex < CASE_STUDY_SECTIONS.length - 1 ? <button className="case-study-next" onClick={() => navigate(sectionIndex + 1)}>Next: {CASE_STUDY_SECTIONS[sectionIndex + 1].label}<ArrowRight size={15} aria-hidden="true" /></button> : <button className="case-study-next" onClick={closeGuide}>Return to demo<ArrowRight size={15} aria-hidden="true" /></button>}
        </footer>
      </div>
    </dialog>
  </>;
}
