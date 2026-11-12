"use client";

import { useState } from "react";
import { Blocks, Check, ChevronDown, ExternalLink, TrendingUp } from "lucide-react";
import { VERCEL_PRODUCT_DECISIONS } from "@/lib/vercel-product-decisions";
import "./vercel-product-decision.css";

export default function VercelProductDecision() {
  const [selectedId, setSelectedId] = useState(VERCEL_PRODUCT_DECISIONS[0].id);
  const decision = VERCEL_PRODUCT_DECISIONS.find((entry) => entry.id === selectedId) ?? VERCEL_PRODUCT_DECISIONS[0];

  return <div className="product-decisions">
    <div className="product-decision-picker" role="group" aria-label="Vercel product comparisons">
      {VERCEL_PRODUCT_DECISIONS.map((entry) => <button type="button" key={entry.id} aria-pressed={entry.id === decision.id} aria-controls="vercel-product-decision" onClick={() => setSelectedId(entry.id)}>{entry.label}</button>)}
    </div>
    <p className="product-decision-status" role="status">Showing {decision.label} comparison.</p>
    <section id="vercel-product-decision" className="product-decision-panel" aria-labelledby="product-decision-title">
      <div className="product-decision-heading"><span>{decision.kind}</span><a href={decision.source.href} target="_blank" rel="noopener noreferrer">{decision.source.label}<ExternalLink size={12} aria-hidden="true" /></a></div>
      <h4 id="product-decision-title">{decision.recommendation}</h4>
      <p className="product-decision-alternative"><span>Alternative:</span> {decision.alternative}</p>
      <div className="product-decision-comparison">
        <section className="product-decision-build"><h5><Blocks size={14} aria-hidden="true" />Build / compose in-house</h5><ul>{decision.build.map((item) => <li key={item}>{item}</li>)}</ul></section>
        <section className="product-decision-adopt"><h5><Check size={15} aria-hidden="true" />Adopt / use Vercel</h5><ul>{decision.adopt.map((item) => <li key={item}>{item}</li>)}</ul></section>
      </div>
      <div className="product-decision-benefit"><TrendingUp size={17} aria-hidden="true" /><p><strong>Business value</strong><span>{decision.benefit}</span></p></div>
      <div className="product-decision-evidence">
        <section><span className="product-decision-evidence-label">In VoxBuild</span><p>{decision.proof}</p></section>
        <section><a className="product-decision-story-label" href={decision.example.href} target="_blank" rel="noopener noreferrer">Vercel-published customer story<ExternalLink size={12} aria-hidden="true" /></a><p><strong>{decision.example.customer}</strong> — {decision.example.summary}</p><small>{decision.example.context}</small></section>
      </div>
      <details className="product-decision-ownership" key={decision.id}><summary>What the customer still owns<ChevronDown size={15} aria-hidden="true" /></summary><p>{decision.ownership}</p></details>
    </section>
  </div>;
}
