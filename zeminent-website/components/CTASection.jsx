'use client'

import React from 'react'

export default function CTASection() {
  return (
    <section
      id="contact"
      className="relative overflow-hidden"
      style={{
        padding: '8rem 0',
        borderTop: '1px solid var(--border-subtle)',
      }}
    >
      <span
        aria-hidden
        className="absolute"
        style={{
          top: '50%',
          left: '50%',
          width: 800,
          height: 800,
          background:
            'radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }}
      />

      <div className="site-container relative">
        <div className="text-center max-w-[760px] mx-auto">
          <div className="reveal eyebrow mb-6" style={{ justifyContent: 'center' }}>
            Let&apos;s build
          </div>
          <h2 className="reveal mb-6" style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)' }}>
            Ready to engineer <em className="italic-accent">intelligence</em>
            <br />
            into your business?
          </h2>
          <p
            className="reveal mb-10"
            style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}
          >
            A 30-minute conversation is enough to know if there&apos;s a fit. No
            slides, no pitch — just a working session on where AI can actually
            move your numbers.
          </p>
          <div className="reveal flex flex-wrap justify-center gap-4">
            <a href="mailto:info@zeminent.com" className="btn-pill btn-pill-primary">
              info@zeminent.com <span className="arrow">→</span>
            </a>
            <a href="tel:+919032475086" className="btn-pill btn-pill-secondary">
              +91 90324 75086
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
