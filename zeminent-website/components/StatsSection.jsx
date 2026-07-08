'use client'

import React from 'react'

const STATS = [
  { num: '10+',  lbl: 'Years of senior engineering experience across the team' },
  { num: '3',    lbl: 'Hyperscaler clouds\nAWS · GCP · Azure' },
  { num: '24/7', lbl: 'Production support & on-call coverage' },
  { num: '100%', lbl: 'AI-first engagement mindset, every project' },
]

export default function StatsSection() {
  return (
    <section
      style={{
        padding: '5rem 0',
        borderTop: '1px solid var(--border-subtle)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div className="site-container">
        <div className="grid gap-10 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.num} className="reveal">
              <div
                className="font-display mb-2"
                style={{
                  fontSize: 'clamp(2.75rem, 5vw, 3.75rem)',
                  lineHeight: 1,
                  fontWeight: 400,
                  background: 'var(--gradient-1)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {s.num}
              </div>
              <div
                style={{
                  fontSize: '0.92rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.45,
                  whiteSpace: 'pre-line',
                }}
              >
                {s.lbl}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
