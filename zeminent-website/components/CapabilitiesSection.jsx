'use client'

import React from 'react'

/* ============================================================
   The two pillars we champion, each broken into the specific
   capabilities we own end-to-end. Rendered as a static card grid.
   ============================================================ */

const DATA_ENGINEERING = {
  label: 'Pillar 01 — Data Engineering',
  title: 'Data Engineering',
  intro:
    'The foundation under every AI initiative. We build the platforms that turn fragmented, messy data into a decision-ready, real-time signal.',
  icon: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
      <ellipse cx="24" cy="10" rx="16" ry="5" />
      <path d="M8 10 V24 C8 27 15 29 24 29 C33 29 40 27 40 24 V10" />
      <path d="M8 24 V38 C8 41 15 43 24 43 C33 43 40 41 40 38 V24" />
    </svg>
  ),
  capabilities: [
    {
      num: '01',
      title: 'Real-Time Pipelines & Streaming',
      summary: 'Move data the moment it is created — not in nightly batches.',
      points: [
        'Event streaming & change-data-capture from operational systems',
        'Exactly-once, sub-second pipelines for analytics and ML features',
        'Backfill + replay strategies that keep history and live data in sync',
      ],
      tags: ['Kafka', 'Flink', 'Spark Streaming', 'CDC', 'Kinesis'],
    },
    {
      num: '02',
      title: 'Lakehouse & Data Platforms',
      summary: 'One governed platform for BI, data science, and AI — no silos.',
      points: [
        'Medallion (bronze/silver/gold) lakehouse architecture',
        'Open table formats for ACID, time-travel, and schema evolution',
        'Cost-tuned storage & compute with workload isolation',
      ],
      tags: ['Databricks', 'Snowflake', 'Delta Lake', 'Iceberg', 'BigQuery'],
    },
    {
      num: '03',
      title: 'Transformation & Orchestration',
      summary: 'Modeled, tested, and documented data — shipped on a schedule you trust.',
      points: [
        'ELT modeling with dimensional and data-vault patterns',
        'Version-controlled transforms with CI and automated tests',
        'Dependency-aware orchestration with alerting and SLAs',
      ],
      tags: ['dbt', 'Airflow', 'Dagster', 'SQL', 'Data Mesh'],
    },
    {
      num: '04',
      title: 'Governance, Quality & Observability',
      summary: 'Trustworthy data with lineage, contracts, and proactive monitoring.',
      points: [
        'Column-level lineage, cataloging, and discoverability',
        'Data contracts and quality checks enforced in the pipeline',
        'PII handling, access controls, and audit for compliance',
      ],
      tags: ['Great Expectations', 'Lineage', 'Data Contracts', 'Governance'],
    },
  ],
}

const AI_ML = {
  label: 'Pillar 02 — AI & Machine Learning',
  title: 'AI & Machine Learning',
  intro:
    'From classical ML to generative AI and agents — we build production-grade intelligence that moves real business metrics, not demos.',
  icon: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="24" cy="24" r="6" />
      <circle cx="24" cy="6" r="3" />
      <circle cx="24" cy="42" r="3" />
      <circle cx="6" cy="24" r="3" />
      <circle cx="42" cy="24" r="3" />
      <line x1="24" y1="9" x2="24" y2="18" />
      <line x1="24" y1="30" x2="24" y2="39" />
      <line x1="9" y1="24" x2="18" y2="24" />
      <line x1="30" y1="24" x2="39" y2="24" />
    </svg>
  ),
  capabilities: [
    {
      num: '01',
      title: 'Generative AI & LLM Applications',
      summary: 'RAG, agents, and copilots grounded in your data — built to be evaluated.',
      points: [
        'Retrieval-augmented generation over your private knowledge',
        'Agentic workflows and tool-use for multi-step automation',
        'Eval harnesses, guardrails, and prompt/version management',
      ],
      tags: ['RAG', 'Agents', 'LLM Apps', 'Fine-tuning', 'Evals'],
    },
    {
      num: '02',
      title: 'Predictive & Classical ML',
      summary: 'The workhorse models that quietly drive margin and decisions.',
      points: [
        'Forecasting, recommendation, and personalization engines',
        'Fraud, anomaly, and risk detection on streaming data',
        'Churn, propensity, and uplift modeling on tabular data',
      ],
      tags: ['Forecasting', 'RecSys', 'Anomaly Detection', 'XGBoost'],
    },
    {
      num: '03',
      title: 'MLOps & Production Platforms',
      summary: 'Models that stay reliable in production — long after launch.',
      points: [
        'Feature stores and reproducible training pipelines',
        'CI/CD for models with automated promotion and rollback',
        'Live monitoring for drift, quality, and cost',
      ],
      tags: ['MLOps', 'Feature Store', 'Model Registry', 'Drift Monitoring'],
    },
    {
      num: '04',
      title: 'Vision, NLP & Document Intelligence',
      summary: 'Turn unstructured documents, images, and speech into structured signal.',
      points: [
        'Intelligent document processing and OCR at scale',
        'Computer vision for inspection, detection, and classification',
        'NLP and multimodal extraction, search, and summarization',
      ],
      tags: ['Computer Vision', 'NLP', 'IDP / OCR', 'Multimodal'],
    },
  ],
}

const PILLARS = [DATA_ENGINEERING, AI_ML]

export default function CapabilitiesSection() {
  return (
    <section
      id="capabilities"
      style={{ padding: '7rem 0', borderTop: '1px solid var(--border-subtle)' }}
    >
      <div className="site-container">
        <div className="reveal max-w-[760px] mb-16">
          <div className="eyebrow mb-5">Capabilities we own</div>
          <h2 className="mb-5" style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)' }}>
            Beneath the pillars, <em className="italic-accent">deep capability.</em>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: 620 }}>
            The overview is the headline. Here is the depth — the specific
            capabilities we champion and run end-to-end across Data Engineering
            and AI&nbsp;&amp;&nbsp;ML.
          </p>
        </div>

        <div className="flex flex-col gap-14">
          {PILLARS.map((p) => (
            <PillarBlock key={p.title} pillar={p} />
          ))}
        </div>
      </div>
    </section>
  )
}

function PillarBlock({ pillar }) {
  const { label, title, intro, icon, capabilities } = pillar

  return (
    <div>
      {/* Pillar header */}
      <div className="reveal flex items-start gap-4 max-w-[680px] mb-8">
        <div className="shrink-0" style={{ width: 44, height: 44, color: 'var(--accent)' }}>
          {icon}
        </div>
        <div>
          <div
            className="font-mono mb-2"
            style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}
          >
            {label}
          </div>
          <h3 className="mb-2" style={{ fontSize: '1.65rem' }}>
            {title}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.96rem', lineHeight: 1.6 }}>
            {intro}
          </p>
        </div>
      </div>

      {/* Capability cards */}
      <div className="grid gap-5 grid-cols-1 md:grid-cols-2">
        {capabilities.map((c) => (
          <CapabilityCard key={c.title} {...c} count={capabilities.length} />
        ))}
      </div>
    </div>
  )
}

function CapabilityCard({ num, title, summary, points, tags, count }) {
  return (
    <article
      className="reveal group relative overflow-hidden flex flex-col"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 18,
        padding: '1.75rem 1.85rem',
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-card-hover)'
        e.currentTarget.style.borderColor = 'var(--border-default)'
        e.currentTarget.style.transform = 'translateY(-4px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--bg-card)'
        e.currentTarget.style.borderColor = 'var(--border-subtle)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <span
        className="absolute top-0 inset-x-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          height: 1,
          background: 'linear-gradient(90deg, transparent, var(--accent) 50%, transparent)',
        }}
      />

      <div
        className="font-mono mb-5"
        style={{ fontSize: '0.78rem', color: 'var(--accent)', letterSpacing: '0.12em' }}
      >
        {num} / {String(count).padStart(2, '0')}
      </div>

      <h4 className="mb-2" style={{ fontSize: '1.25rem', fontFamily: 'var(--font-fraunces), serif' }}>
        {title}
      </h4>
      <p
        className="mb-5"
        style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.55 }}
      >
        {summary}
      </p>

      <ul className="flex flex-col gap-3 mb-6" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {points.map((pt) => (
          <li
            key={pt}
            className="flex items-start gap-3"
            style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5 }}
          >
            <span
              className="shrink-0"
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--accent)',
                marginTop: '0.45rem',
              }}
            />
            {pt}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-[0.4rem] mt-[10px]">
        {tags.map((t) => (
          <span
            key={t}
            className="font-mono"
            style={{
              fontSize: '0.7rem',
              color: 'var(--text-tertiary)',
              padding: '0.3rem 0.65rem',
              border: '1px solid var(--border-subtle)',
              borderRadius: 999,
            }}
          >
            {t}
          </span>
        ))}
      </div>
    </article>
  )
}
