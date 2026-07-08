'use client'

import React from 'react'
import Link from 'next/link'

const TRUST_LOGOS = [
  'AWS',
  'Google Cloud',
  'Microsoft Azure',
  'Databricks',
  'Snowflake',
  'OpenAI',
  'Anthropic',
]

export default function Hero() {
  return (
    <header
      className="relative flex items-center overflow-hidden"
      style={{
        minHeight: '100vh',
        padding: '9rem 0 5rem',
      }}
    >
      <div className="grid-bg" />

      <div className="site-container w-full">
        <div className="grid gap-12 items-center lg:grid-cols-[1.3fr_1fr] lg:gap-16">
          {/* === Left: content === */}
          <div className="max-w-[720px]">
            <div className="eyebrow mb-7">AI-First Engineering Partner</div>

            <h1
              className="mb-7"
              style={{ fontSize: 'clamp(2.75rem, 7vw, 5.5rem)' }}
            >
              <span className="hero-line l1">Engineering</span>
              <span className="hero-line l2">
                <em className="italic-accent">intelligence</em>
              </span>
              <span className="hero-line l3">into your core.</span>
            </h1>

            <p
              className="hero-rise d-1 mb-10"
              style={{
                fontSize: 'clamp(1.05rem, 1.4vw, 1.18rem)',
                color: 'var(--text-secondary)',
                maxWidth: 580,
                lineHeight: 1.6,
              }}
            >
              Your trusted partner in navigating the AI-first future — architecting
              AI-native solutions that make your business intelligent by design, not
              just by application. We engineer AI into the core of your digital
              operating model.
            </p>

            <div className="hero-rise d-2 flex flex-wrap gap-4">
              <Link href="/contact" className="btn-pill btn-pill-primary">
                Start a partnership <span className="arrow">→</span>
              </Link>
              <a href="#services" className="btn-pill btn-pill-secondary">
                Explore capabilities
              </a>
            </div>
          </div>

          {/* === Right: AI orb === */}
          <div
            className="hero-rise d-1 relative mx-auto"
            style={{ aspectRatio: '1 / 1', width: '100%', maxWidth: 480 }}
          >
            <svg viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <defs>
                <radialGradient id="orbCore" cx="50%" cy="50%">
                  <stop offset="0%"   stopColor="#5eead4" stopOpacity="0.6" />
                  <stop offset="50%"  stopColor="#818cf8" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#0d1117" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%"   stopColor="#5eead4" />
                  <stop offset="100%" stopColor="#818cf8" stopOpacity="0.3" />
                </linearGradient>
                <filter id="orbGlow">
                  <feGaussianBlur stdDeviation="3" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <circle cx="250" cy="250" r="180" fill="url(#orbCore)" className="orb-pulse" />

              <g className="orb-ring orb-ring-3">
                <circle cx="250" cy="250" r="220" fill="none" stroke="url(#ringGrad)" strokeWidth="0.5" strokeDasharray="2 6" />
                <circle cx="470" cy="250" r="4" fill="#5eead4" filter="url(#orbGlow)" />
                <circle cx="30"  cy="250" r="3" fill="#818cf8" filter="url(#orbGlow)" />
                <circle cx="250" cy="30"  r="3" fill="#f5b86b" filter="url(#orbGlow)" />
              </g>

              <g className="orb-ring orb-ring-2">
                <ellipse cx="250" cy="250" rx="180" ry="80" fill="none" stroke="#5eead4" strokeWidth="1" strokeOpacity="0.4" />
                <circle cx="430" cy="250" r="3" fill="#5eead4" filter="url(#orbGlow)" />
                <circle cx="70"  cy="250" r="3" fill="#5eead4" filter="url(#orbGlow)" />
              </g>

              <g className="orb-ring" transform="rotate(60 250 250)">
                <ellipse cx="250" cy="250" rx="180" ry="80" fill="none" stroke="#818cf8" strokeWidth="1" strokeOpacity="0.35" />
              </g>
              <g className="orb-ring orb-ring-2" transform="rotate(120 250 250)">
                <ellipse cx="250" cy="250" rx="180" ry="80" fill="none" stroke="#f5b86b" strokeWidth="1" strokeOpacity="0.25" />
              </g>

              <circle cx="250" cy="250" r="50" fill="url(#orbCore)" filter="url(#orbGlow)" />
              <circle cx="250" cy="250" r="8"  fill="#5eead4"      filter="url(#orbGlow)" />

              <g opacity="0.4">
                <line x1="250" y1="250" x2="430" y2="180" stroke="#5eead4" strokeWidth="0.5" strokeDasharray="2 4" />
                <line x1="250" y1="250" x2="120" y2="350" stroke="#818cf8" strokeWidth="0.5" strokeDasharray="2 4" />
                <line x1="250" y1="250" x2="380" y2="380" stroke="#f5b86b" strokeWidth="0.5" strokeDasharray="2 4" />
              </g>

              <circle cx="430" cy="180" r="2" fill="#5eead4" />
              <circle cx="120" cy="350" r="2" fill="#818cf8" />
              <circle cx="380" cy="380" r="2" fill="#f5b86b" />
            </svg>
          </div>
        </div>

        {/* === Trust bar === */}
        <div
          className="hero-rise d-4"
          style={{
            marginTop: '4rem',
            paddingTop: '2rem',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div
            className="font-mono mb-5"
            style={{
              fontSize: '0.72rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--text-tertiary)',
            }}
          >
            Engineering across the modern AI stack
          </div>
          <div className="flex flex-wrap items-center gap-10 font-mono text-[0.85rem]" style={{ color: 'var(--text-tertiary)' }}>
            {TRUST_LOGOS.map((label) => (
              <span key={label} className="inline-flex items-center gap-2">
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--accent)',
                  }}
                />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}
