'use client'

import React from 'react'

const CASES = [
  {
    domain: 'Retail · GenAI',
    title: 'Conversational commerce assistant for a multi-brand retailer',
    desc: 'Designed and shipped an LLM-powered shopping assistant grounded on the client\'s catalog, inventory, and order systems. RAG architecture with eval harness, latency budgets under 800ms, and guardrails for brand-safe responses.',
    metrics: [
      { val: '3.4×', lbl: 'Conversion uplift' },
      { val: '62%',  lbl: 'Support deflection' },
      { val: '11wk', lbl: 'Idea to production' },
    ],
  },
  {
    domain: 'Global Supply Chain · ML',
    title: 'Demand forecasting & inventory optimization at scale',
    desc: 'Re-engineered the forecasting stack on a lakehouse architecture with feature store and automated retraining. Replaced spreadsheet-driven planning with hierarchical ML across thousands of SKUs and hundreds of nodes.',
    metrics: [
      { val: '28%',   lbl: 'Forecast error ↓' },
      { val: '$14M',  lbl: 'Inventory freed' },
      { val: '15min', lbl: 'Replan cadence' },
    ],
  },
  {
    domain: 'FinServ · Data Engineering',
    title: 'Real-time risk & fraud signal platform',
    desc: 'Built a streaming analytics platform on Kafka and Flink, with a feature store powering both real-time scoring and offline model training. Sub-second decisions on millions of transactions per day.',
    metrics: [
      { val: '<200ms', lbl: 'Decision latency' },
      { val: '41%',    lbl: 'Fraud catch rate ↑' },
      { val: '99.99%', lbl: 'Platform uptime' },
    ],
  },
  {
    domain: 'Healthcare · Cloud + AI',
    title: 'Clinical document intelligence on a HIPAA-compliant cloud',
    desc: 'Modernized a legacy on-prem stack onto Azure with a HIPAA-aligned reference architecture. Layered an LLM-based document extraction pipeline with human-in-the-loop review and full audit trail.',
    metrics: [
      { val: '7×',  lbl: 'Throughput' },
      { val: '94%', lbl: 'Extraction accuracy' },
      { val: '0',   lbl: 'Compliance findings' },
    ],
  },
]

export default function CaseStudiesSection() {
  return (
    <section
      id="cases"
      style={{ padding: '7rem 0', borderTop: '1px solid var(--border-subtle)' }}
    >
      <div className="site-container">
        <div className="reveal max-w-[760px] mb-16">
          <div className="eyebrow mb-5">In production</div>
          <h2
            className="mb-5"
            style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)' }}
          >
            Stories from the <em className="italic-accent">build floor.</em>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: 620 }}>
            A snapshot of partnerships where AI-native engineering moved from idea
            to measurable business impact.
          </p>
        </div>

        <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
          {CASES.map((c) => (
            <CaseCard key={c.title} {...c} />
          ))}
        </div>
      </div>
    </section>
  )
}

function CaseCard({ domain, title, desc, metrics }) {
  return (
    <article
      className="reveal flex flex-col justify-between relative overflow-hidden"
      style={{
        borderRadius: 22,
        padding: '2.5rem',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        minHeight: 380,
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)'
        e.currentTarget.style.background = 'var(--bg-card-hover)'
        e.currentTarget.style.borderColor = 'var(--border-default)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.background = 'var(--bg-card)'
        e.currentTarget.style.borderColor = 'var(--border-subtle)'
      }}
    >
      <div>
        <div
          className="font-mono mb-5"
          style={{
            fontSize: '0.75rem',
            color: 'var(--accent)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          {domain}
        </div>
        <h3 className="mb-4" style={{ fontSize: '1.55rem', maxWidth: '90%' }}>
          {title}
        </h3>
        <p
          className="mb-7"
          style={{ color: 'var(--text-secondary)', fontSize: '0.96rem', lineHeight: 1.6 }}
        >
          {desc}
        </p>
      </div>

      <div
        className="flex flex-wrap gap-6"
        style={{ paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}
      >
        {metrics.map((m) => (
          <div key={m.lbl} className="flex-1" style={{ minWidth: 100 }}>
            <div
              className="font-display mb-1"
              style={{
                fontSize: '1.8rem',
                fontWeight: 500,
                color: 'var(--accent)',
                lineHeight: 1,
              }}
            >
              {m.val}
            </div>
            <div
              className="font-mono"
              style={{
                fontSize: '0.78rem',
                color: 'var(--text-tertiary)',
                letterSpacing: '0.05em',
              }}
            >
              {m.lbl}
            </div>
          </div>
        ))}
      </div>
    </article>
  )
}
