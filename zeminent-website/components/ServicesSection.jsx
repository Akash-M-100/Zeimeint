'use client'

import React from 'react'

const SERVICES = [
  {
    num: '01 / Pillar',
    title: 'AI & Machine Learning',
    desc: 'From classical ML to generative AI, agentic systems, and LLM platforms — we build production-grade intelligence that drives measurable business outcomes.',
    tags: ['GenAI', 'LLM Apps', 'Agents', 'MLOps', 'Computer Vision', 'NLP'],
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="24" cy="24" r="6" />
        <circle cx="24" cy="6"  r="3" />
        <circle cx="24" cy="42" r="3" />
        <circle cx="6"  cy="24" r="3" />
        <circle cx="42" cy="24" r="3" />
        <line x1="24" y1="9"  x2="24" y2="18" />
        <line x1="24" y1="30" x2="24" y2="39" />
        <line x1="9"  y1="24" x2="18" y2="24" />
        <line x1="30" y1="24" x2="39" y2="24" />
      </svg>
    ),
  },
  {
    num: '02 / Pillar',
    title: 'Data Engineering',
    desc: 'The foundation of every AI initiative. We design real-time pipelines, lakehouses, and feature stores that turn fragmented data into decision-ready signal.',
    tags: ['Lakehouse', 'Streaming', 'ETL/ELT', 'Data Mesh', 'Spark', 'Kafka'],
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
        <ellipse cx="24" cy="10" rx="16" ry="5" />
        <path d="M8 10 V24 C8 27 15 29 24 29 C33 29 40 27 40 24 V10" />
        <path d="M8 24 V38 C8 41 15 43 24 43 C33 43 40 41 40 38 V24" />
      </svg>
    ),
  },
  {
    num: '03 / Foundation',
    title: 'Cloud Solutions',
    desc: 'AWS, Google Cloud, and Azure — architected, migrated, modernized. We bring deep expertise across all three hyperscalers, with security and FinOps built in.',
    tags: ['AWS', 'GCP', 'Azure', 'Kubernetes', 'Serverless', 'FinOps'],
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M14 36 C9 36 5 32 5 27 C5 22 9 18 14 18 C14 12 19 7 25 7 C31 7 36 12 36 18 C40 18 43 21 43 25 C43 30 39 36 33 36 Z" />
      </svg>
    ),
  },
  {
    num: '04 / Delivery',
    title: 'Software Engineering',
    desc: 'Full-stack product engineering when you need to build, ship, and scale. Polyglot teams that move with the rigor of a senior engineering org.',
    tags: ['React/Next', 'Node', 'Python', 'Go', 'Mobile', 'APIs'],
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M16 8 L8 24 L16 40" />
        <path d="M32 8 L40 24 L32 40" />
        <path d="M28 8 L20 40" />
      </svg>
    ),
  },
  {
    num: '05 / Engagement',
    title: 'Embedded AI Teams',
    desc: 'Augment your in-house engineering with senior AI/ML and data specialists who plug in seamlessly — accelerating roadmap delivery without the overhead of hiring.',
    tags: ['ML Engineers', 'Data Engineers', 'Architects', 'SREs'],
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="16" cy="16" r="6" />
        <circle cx="32" cy="16" r="6" />
        <path d="M6 38 C6 32 10 28 16 28 C22 28 26 32 26 38" />
        <path d="M22 38 C22 32 26 28 32 28 C38 28 42 32 42 38" />
      </svg>
    ),
  },
  {
    num: '06 / Accelerators',
    title: 'AI Accelerators',
    desc: 'Pre-built capabilities and reference architectures that compress time-to-value — RAG platforms, agent frameworks, and domain-tuned starter kits.',
    tags: ['RAG', 'Agents', 'Eval Harnesses', 'Templates'],
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M14 30 L24 8 L34 30 Z" />
        <path d="M14 30 L24 42 L34 30" />
        <line x1="20" y1="22" x2="28" y2="22" />
      </svg>
    ),
  },
]

export default function ServicesSection() {
  return (
    <section
      id="services"
      style={{ padding: '7rem 0', borderTop: '1px solid var(--border-subtle)' }}
    >
      <div className="site-container">
        <div className="reveal max-w-[760px] mb-16">
          <div className="eyebrow mb-5">What we do</div>
          <h2
            className="mb-5"
            style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)' }}
          >
            Two pillars. <em className="italic-accent">One outcome.</em>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: 620 }}>
            Every engagement is anchored in two deep capabilities — Data
            Engineering and AI/ML — delivered on the cloud of your choice. We
            don&apos;t sell hours; we partner to scale your AI mission.
          </p>
        </div>

        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <ServiceCard key={s.title} {...s} />
          ))}
        </div>
      </div>
    </section>
  )
}

function ServiceCard({ num, title, desc, tags, icon }) {
  return (
    <article
      className="reveal service-card group relative overflow-hidden flex flex-col"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 18,
        padding: '2.5rem 2.25rem',
        minHeight: 360,
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
          background:
            'linear-gradient(90deg, transparent, var(--accent) 50%, transparent)',
        }}
      />

      <div
        className="font-mono mb-6"
        style={{
          fontSize: '0.78rem',
          color: 'var(--text-tertiary)',
          letterSpacing: '0.1em',
        }}
      >
        {num}
      </div>

      <div className="mb-6" style={{ width: 48, height: 48, color: 'var(--accent)' }}>
        {icon}
      </div>

      <h3 className="mb-3" style={{ fontSize: '1.5rem' }}>
        {title}
      </h3>
      <p
        className="flex-grow mb-6"
        style={{ color: 'var(--text-secondary)', fontSize: '0.96rem', lineHeight: 1.6 }}
      >
        {desc}
      </p>

      <div className="flex flex-wrap gap-[0.4rem] mt-auto">
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
