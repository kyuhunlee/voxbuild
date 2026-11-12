"use client";

import { useEffect, useRef, useState } from "react";
import { Blocks, Check, ChevronDown, ExternalLink, TrendingUp } from "lucide-react";
import { VERCEL_PRODUCT_DECISIONS } from "@/lib/vercel-product-decisions";
import "./vercel-product-decision.css";

export default function VercelProductDecision() {
  const [selectedId, setSelectedId] = useState(VERCEL_PRODUCT_DECISIONS[0].id);
  const comparisons = useRef<HTMLElement>(null);
  const picker = useRef<HTMLDivElement>(null);
  const decision = VERCEL_PRODUCT_DECISIONS.find((entry) => entry.id === selectedId) ?? VERCEL_PRODUCT_DECISIONS[0];

  function updatePickerClearance() {
    const panel = comparisons.current;
    const scroller = panel?.closest<HTMLElement>(".case-study-content");
    if (!panel || !scroller || !picker.current) return;
    const topPadding = Number.parseFloat(getComputedStyle(scroller).paddingTop) || 0;
    const clearance = Math.ceil(picker.current.getBoundingClientRect().height + topPadding) + 16;
    panel.style.setProperty("--product-picker-clearance", clearance + "px");
  }

  useEffect(() => {
    updatePickerClearance();
    const scroller = comparisons.current?.closest<HTMLElement>(".case-study-content");
    if (!picker.current || !scroller) return;
    const observer = new ResizeObserver(updatePickerClearance);
    observer.observe(picker.current);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, []);

  return <div className="product-decisions">
    <div ref={picker} className="product-decision-picker" role="group" aria-label="Vercel product comparisons">
      {VERCEL_PRODUCT_DECISIONS.map((entry) => <button type="button" key={entry.id} aria-pressed={entry.id === decision.id} aria-controls="vercel-product-decision" onClick={() => { setSelectedId(entry.id); updatePickerClearance(); comparisons.current?.scrollIntoView({ block: "start", behavior: "auto" }); }}>{entry.label}</button>)}
    </div>
    <p className="product-decision-status" role="status">Showing {decision.label} comparison.</p>
    <section ref={comparisons} id="vercel-product-decision" className="product-decision-panel" aria-labelledby="product-decision-title">
      <div className="product-decision-heading"><span>{decision.kind}</span><a href={decision.source.href} target="_blank" rel="noopener noreferrer">{decision.source.label}<ExternalLink size={12} aria-hidden="true" /></a></div>
      <h4 id="product-decision-title">{decision.recommendation}</h4>
      <p className="product-decision-alternative"><span>Alternative:</span> {decision.alternative}</p>
      <div className="product-decision-comparison">
        <section className="product-decision-build"><h5><Blocks size={14} aria-hidden="true" />Build / compose in-house</h5><ul>{decision.build.map((item) => <li key={item}>{item}</li>)}</ul></section>
        <section className="product-decision-adopt"><h5><Check size={15} aria-hidden="true" />Adopt / use Vercel</h5><ul className="product-decision-adopt-list">{decision.adopt.map((item) => <li key={item.title}><span className="product-decision-benefit-check"><Check size={12} aria-hidden="true" /></span><div><strong>{item.title}</strong><p>{item.body}</p></div></li>)}</ul></section>
      </div>
      <div className="product-decision-benefit"><TrendingUp size={17} aria-hidden="true" /><p><strong>Business value</strong><span>{decision.benefit}</span></p></div>
      <div className="product-decision-evidence">
        <section><span className="product-decision-evidence-label">In VoxBuild</span><p>{decision.proof}</p></section>
      </div>
      <section className="product-customer-story" aria-labelledby="product-customer-story-title">
        <header><h5 id="product-customer-story-title">{decision.example.customer}</h5><a className="product-decision-story-label" href={decision.example.href} target="_blank" rel="noopener noreferrer">Vercel-published customer story<ExternalLink size={12} aria-hidden="true" /></a></header>
        <p className="product-customer-story-summary">{decision.example.summary}</p>
        <dl className="product-customer-story-metrics">{decision.example.metrics.map((metric) => <div key={metric.label}><dt>{metric.label}</dt><dd><strong>{metric.value}</strong><span>{metric.kind}</span></dd></div>)}</dl>
        <p className="product-customer-story-context">{decision.example.context}</p>
        <details className="product-customer-story-details" key={decision.id}><summary>Story details<ChevronDown size={15} aria-hidden="true" /></summary><dl>{decision.example.details.map((detail) => <div key={detail.label}><dt>{detail.label}</dt><dd>{detail.body}</dd></div>)}</dl></details>
      </section>
      <details className="product-decision-ownership" key={decision.id}><summary>What the customer still owns<ChevronDown size={15} aria-hidden="true" /></summary><p>{decision.ownership}</p></details>
    </section>
  </div>;
}
