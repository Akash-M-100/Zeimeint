'use client'

import React, { useEffect, useState } from 'react'

export default function ContactPage() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const [form, setForm] = useState({ name: '', email: '', company: '', message: '' })
  const [status, setStatus] = useState({ state: 'idle', error: '' })

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (status.state === 'sending') return
    setStatus({ state: 'sending', error: '' })

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.name,
          email: form.email,
          phone: '',
          company: form.company,
          service: 'AI Partnership Inquiry',
          budget: 'Not specified',
          details: form.message,
        }),
      })
      if (!res.ok) throw new Error('Request failed')
      setStatus({ state: 'sent', error: '' })
      setForm({ name: '', email: '', company: '', message: '' })
    } catch (err) {
      setStatus({ state: 'error', error: 'Something went wrong. Please email us directly.' })
    }
  }

  return (
    <div className="min-h-screen" style={{ paddingTop: '9rem', paddingBottom: '5rem' }}>
      <div className="site-container">
        <div className="grid gap-16 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
          {/* Left: pitch */}
          <div>
            <div className="eyebrow mb-6">Let&apos;s build</div>
            <h1 className="mb-6" style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)' }}>
              Start an <em className="italic-accent">AI partnership.</em>
            </h1>
            <p
              className="mb-10"
              style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: 520 }}
            >
              A 30-minute conversation is enough to know if there&apos;s a fit. No
              slides, no pitch — just a working session on where AI can actually
              move your numbers.
            </p>

            <div className="flex flex-col gap-6">
              <ContactRow label="Email" value="info@zeminent.com" href="mailto:info@zeminent.com" />
              <ContactRow label="Call"  value="+91 90324 75086"   href="tel:+919032475086" />
              <ContactRow
                label="Visit"
                value={
                  <>
                    2nd Floor, 213-214,
                    <br />
                    Welldone Tech Park,
                    <br />
                    Sohna Road, Sector 48,
                    <br />
                    Gurugram, Haryana 122101
                  </>
                }
              />
            </div>
          </div>

          {/* Right: form */}
          <form
            onSubmit={handleSubmit}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 22,
              padding: '2.5rem',
            }}
          >
            <Field label="Your name" name="name" value={form.name} onChange={handleChange} required />
            <Field label="Work email" type="email" name="email" value={form.email} onChange={handleChange} required />
            <Field label="Company" name="company" value={form.company} onChange={handleChange} />
            <Field
              label="What are you working on?"
              name="message"
              value={form.message}
              onChange={handleChange}
              required
              textarea
            />

            <button
              type="submit"
              className="btn-pill btn-pill-primary mt-2"
              disabled={status.state === 'sending'}
              style={{ opacity: status.state === 'sending' ? 0.6 : 1 }}
            >
              {status.state === 'sending' ? 'Sending…' : 'Send message'}{' '}
              <span className="arrow">→</span>
            </button>

            {status.state === 'sent' && (
              <p
                className="mt-4"
                style={{ color: 'var(--accent)', fontSize: '0.9rem' }}
              >
                Thanks — we&apos;ll be in touch within one business day.
              </p>
            )}
            {status.state === 'error' && (
              <p
                className="mt-4"
                style={{ color: 'var(--accent-warm)', fontSize: '0.9rem' }}
              >
                {status.error}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}

function ContactRow({ label, value, href }) {
  const body =
    typeof value === 'string' ? value : value

  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: '110px 1fr',
        gap: '1.25rem',
        paddingBottom: '1.25rem',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div
        className="font-mono"
        style={{
          fontSize: '0.72rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--text-tertiary)',
          paddingTop: 4,
        }}
      >
        {label}
      </div>
      {href ? (
        <a href={href} style={{ color: 'var(--text-primary)' }}>
          {body}
        </a>
      ) : (
        <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{body}</div>
      )}
    </div>
  )
}

function Field({ label, name, value, onChange, type = 'text', required = false, textarea = false }) {
  const baseStyle = {
    width: '100%',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 12,
    padding: '0.85rem 1rem',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-geist), sans-serif',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'border-color 0.2s',
  }

  return (
    <label className="block mb-5">
      <span
        className="font-mono block mb-2"
        style={{
          fontSize: '0.72rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--text-tertiary)',
        }}
      >
        {label}
      </span>
      {textarea ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          rows={5}
          style={baseStyle}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
        />
      ) : (
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          style={baseStyle}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
        />
      )}
    </label>
  )
}
