import React from 'react'
import Link from 'next/link'

const CAPABILITIES = [
  { name: 'AI & Machine Learning', href: '/#services' },
  { name: 'Data Engineering',      href: '/#services' },
  { name: 'Cloud Solutions',       href: '/#services' },
  { name: 'Software Engineering',  href: '/#services' },
  { name: 'Embedded AI Teams',     href: '/#services' },
]

const COMPANY = [
  { name: 'About us',     href: '/#leadership' },
  { name: 'Case studies', href: '/#cases' },
  { name: 'Approach',     href: '/#approach' },
  { name: 'Careers',      href: '/contact' },
  { name: 'Contact',      href: '/contact' },
]

const Footer = () => {
  const year = new Date().getFullYear()

  return (
    <footer
      style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '5rem 0 2.5rem',
        position: 'relative',
        zIndex: 2,
      }}
    >
      <div className="site-container">
        <div className="grid gap-12 grid-cols-1 lg:grid-cols-[2fr_1fr_1fr_1fr] lg:gap-16 mb-16">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center">
              <img
                src="/images/Logo.svg"
                alt="Zeminent Logo"
                className="h-[36px] lg:h-[40px] w-auto object-contain"
                style={{
                  imageRendering: '-webkit-optimize-contrast',
                  backfaceVisibility: 'hidden',
                  transform: 'translateZ(0)',
                  willChange: 'transform',
                }}
              />
            </Link>
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: '0.95rem',
                maxWidth: 340,
                margin: '1.25rem 0 1.75rem',
              }}
            >
              Your trusted partner in navigating the AI-first future — engineering
              intelligence into the core of your digital operating model.
            </p>

            <div className="flex gap-3">
              <SocialLink href="https://www.linkedin.com/company/zeminent/" label="LinkedIn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </SocialLink>
              <SocialLink href="https://www.instagram.com/zeminent_official" label="Instagram">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="2" width="20" height="20" rx="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </SocialLink>
              <SocialLink href="mailto:info@zeminent.com" label="Email">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </SocialLink>
            </div>
          </div>

          {/* Capabilities */}
          <FooterCol heading="Capabilities" items={CAPABILITIES} />

          {/* Company */}
          <FooterCol heading="Company" items={COMPANY} />

          {/* Reach us */}
          <div>
            <FooterHeading>Reach us</FooterHeading>
            <ul className="list-none p-0 m-0">
              <FooterLi>
                <FooterAnchor href="mailto:info@zeminent.com">info@zeminent.com</FooterAnchor>
              </FooterLi>
              <FooterLi>
                <FooterAnchor href="tel:+919032475086">+91 90324 75086</FooterAnchor>
              </FooterLi>
              <FooterLi>
                <span
                  style={{
                    color: 'var(--text-secondary)',
                    marginTop: '0.5rem',
                    fontSize: '0.85rem',
                    display: 'block',
                  }}
                >
                  2nd Floor, 213-214,
                  <br />
                  Welldone Tech Park,
                  <br />
                  Sohna Road, Sector 48,
                  <br />
                  Gurugram, Haryana 122101
                </span>
              </FooterLi>
            </ul>
          </div>
        </div>

        <div
          className="flex flex-wrap justify-between gap-4 font-mono"
          style={{
            paddingTop: '2rem',
            borderTop: '1px solid var(--border-subtle)',
            fontSize: '0.85rem',
            color: 'var(--text-tertiary)',
          }}
        >
          <span>© {year} Zeminent. All rights reserved.</span>
          <span>Engineered with care · Hyderabad / Gurugram</span>
        </div>
      </div>
    </footer>
  )
}

const FooterHeading = ({ children }) => (
  <h5
    className="font-mono"
    style={{
      fontSize: '0.72rem',
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      color: 'var(--text-tertiary)',
      marginBottom: '1.25rem',
      fontWeight: 500,
    }}
  >
    {children}
  </h5>
)

const FooterLi = ({ children }) => (
  <li style={{ marginBottom: '0.7rem', fontSize: '0.92rem', listStyle: 'none' }}>
    {children}
  </li>
)

const FooterAnchor = ({ href, children }) => (
  <Link
    href={href}
    className="transition-colors"
    style={{ color: 'var(--text-secondary)' }}
    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
  >
    {children}
  </Link>
)

const FooterCol = ({ heading, items }) => (
  <div>
    <FooterHeading>{heading}</FooterHeading>
    <ul className="list-none p-0 m-0">
      {items.map((i) => (
        <FooterLi key={i.name}>
          <FooterAnchor href={i.href}>{i.name}</FooterAnchor>
        </FooterLi>
      ))}
    </ul>
  </div>
)

const SocialLink = ({ href, label, children }) => (
  <a
    href={href}
    aria-label={label}
    target="_blank"
    rel="noopener noreferrer"
    className="grid place-items-center transition-all"
    style={{
      width: 38,
      height: 38,
      borderRadius: '50%',
      border: '1px solid var(--border-default)',
      color: 'var(--text-secondary)',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = 'var(--accent)'
      e.currentTarget.style.color = 'var(--accent)'
      e.currentTarget.style.transform = 'translateY(-2px)'
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = 'var(--border-default)'
      e.currentTarget.style.color = 'var(--text-secondary)'
      e.currentTarget.style.transform = 'translateY(0)'
    }}
  >
    {children}
  </a>
)

export default Footer
