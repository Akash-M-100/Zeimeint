'use client'

import React from 'react'

const FEATURES = [
  {
    title: 'Partnership over project',
    desc: "We don't ship and disappear. Your AI mission becomes ours — we stay through scale, iteration, and the messy middle where most engagements drop off.",
    icon: (
      <svg viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M18 4 L31 11 V25 L18 32 L5 25 V11 Z" />
        <path d="M18 4 V32" />
        <path d="M5 11 L31 25" />
        <path d="M5 25 L31 11" />
      </svg>
    ),
  },
  {
    title: 'Senior engineers, not staff aug',
    desc: 'Every pod is anchored by engineers with a decade-plus of production experience. No bench rotations, no junior bait-and-switch.',
    icon: (
      <svg viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="6" y="10" width="24" height="20" rx="2" />
        <path d="M12 10 V6" />
        <path d="M24 10 V6" />
        <line x1="6" y1="16" x2="30" y2="16" />
        <circle cx="14" cy="22" r="1.5" fill="currentColor" />
        <circle cx="22" cy="22" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    title: 'Speed without shortcuts',
    desc: 'Pre-built accelerators, reference architectures, and a strong evaluation discipline let us move from prototype to production in weeks, not quarters.',
    icon: (
      <svg viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="18" cy="18" r="14" />
        <path d="M18 4 V18 L26 22" />
      </svg>
    ),
  },
  {
    title: 'Transparent & agile',
    desc: "Working systems demoed every two weeks. Honest tradeoffs, visible burn-down, and an open conversation about what's worth building — and what isn't.",
    icon: (
      <svg viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M6 18 C10 8 26 8 30 18" />
        <path d="M6 18 C10 28 26 28 30 18" />
        <circle cx="18" cy="18" r="4" fill="currentColor" />
      </svg>
    ),
  },
  {
    title: 'Production discipline',
    desc: 'Evals, observability, cost guardrails, and on-call rotations — every system we build is engineered to live in production, not just impress in a demo.',
    icon: (
      <svg viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M8 14 L18 6 L28 14 V28 H8 Z" />
        <path d="M14 28 V20 H22 V28" />
      </svg>
    ),
  },
]

export default function WhyUsSection() {
  return (
    <section
      style={{ padding: '7rem 0', borderTop: '1px solid var(--border-subtle)' }}
    >
      <div className="site-container">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
          <div className="reveal">
            <div className="eyebrow mb-5">Why Zeminent</div>
            <h2
              className="mb-6"
              style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)' }}
            >
              Built for the <em className="italic-accent">AI-first</em> decade.
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', marginTop: '1.5rem' }}>
              The companies winning with AI aren&apos;t the ones with the most pilots —
              they&apos;re the ones treating AI as core engineering. That&apos;s the work
              we do, every day.
            </p>
          </div>

          <div className="flex flex-col">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="reveal grid items-start"
                style={{
                  padding: '1.75rem 0',
                  borderTop: '1px solid var(--border-default)',
                  borderBottom:
                    i === FEATURES.length - 1
                      ? '1px solid var(--border-default)'
                      : undefined,
                  gridTemplateColumns: 'auto 1fr',
                  gap: '1.5rem',
                }}
              >
                <div style={{ width: 36, height: 36, color: 'var(--accent)', flexShrink: 0 }}>
                  {f.icon}
                </div>
                <div>
                  <h4
                    className="font-body mb-2"
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {f.title}
                  </h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.55 }}>
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
