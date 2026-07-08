'use client'

import React from 'react'

const STEPS = [
  {
    num: '01 — Discover',
    title: 'Listen, then frame.',
    desc: 'We map your data landscape, business outcomes, and AI ambition. We surface where intelligence creates real leverage — and where it\'s a distraction.',
  },
  {
    num: '02 — Architect',
    title: 'Design for production.',
    desc: 'Reference architectures grounded in security, observability, and FinOps. AI-native from day one — not retrofitted onto legacy systems.',
  },
  {
    num: '03 — Build',
    title: 'Ship in tight loops.',
    desc: 'Senior engineering pods with embedded AI/ML and data specialists. We measure progress in working systems, not Jira tickets.',
  },
  {
    num: '04 — Scale',
    title: 'Own the long arc.',
    desc: 'MLOps, evaluation harnesses, and 24/7 production support. We stay long enough for AI to compound — not a quarter, not a project.',
  },
]

export default function ApproachSection() {
  return (
    <section
      id="approach"
      style={{
        padding: '7rem 0',
        borderTop: '1px solid var(--border-subtle)',
        background:
          'linear-gradient(180deg, transparent 0%, rgba(94, 234, 212, 0.02) 50%, transparent 100%)',
      }}
    >
      <div className="site-container">
        <div className="reveal max-w-[760px] mb-16">
          <div className="eyebrow mb-5">How we partner</div>
          <h2
            className="mb-5"
            style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)' }}
          >
            From <em className="italic-accent">ambition</em> to production.
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: 620 }}>
            A partnership built on engineering rigor — not slideware. Here&apos;s how
            we move from your AI vision to systems running in production.
          </p>
        </div>

        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div
              key={s.num}
              className="reveal group relative overflow-hidden flex flex-col"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 18,
                padding: '1.85rem',
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
                className="font-mono mb-5"
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--accent)',
                  letterSpacing: '0.1em',
                }}
              >
                {s.num}
              </div>
              <h3 className="mb-3" style={{ fontSize: '1.35rem' }}>
                {s.title}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
