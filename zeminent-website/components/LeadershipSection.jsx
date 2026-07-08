'use client'

import React from 'react'
import Image from 'next/image'
import { Linkedin } from 'lucide-react'

const TEAM = [
  {
    image: '/teamImages/Img1.png',
    name: 'Surya P',
    role: 'CEO & Founder',
    bio: '10+ years in talent leadership, formerly Head of Talent at Zeminent, where he scaled engineering hiring across global teams.',
    linkedin:
      'https://www.linkedin.com/in/surya-teja-823108240?utm_source=share_via&utm_content=profile&utm_medium=member_android',
  },
  {
    image: '/teamImages/Img2.png',
    name: 'Yaswanth K',
    role: 'Chief Technology Officer',
    bio: '12+ years in cloud architecture and software engineering. Previously led platform teams at Zeminent; AWS Certified Solutions Architect.',
    linkedin: 'https://www.linkedin.com/in/yaswanthkonerinagarajan/',
  },
  {
    image: '/teamImages/Ram.jpeg',
    name: 'Ram Das Gupta',
    role: 'VP of Operations',
    bio: 'Operations leader specialising in scaling delivery teams and engineering processes. Former Director of Operations at Zeminent.',
    linkedin: 'https://www.linkedin.com/in/er-rdgupta',
  },
  {
    image: '/teamImages/Img4.png',
    name: 'Maya',
    role: 'Head of Talent',
    bio: '10+ years in technical recruitment and team building. Previously led talent acquisition at Zeminent.',
    linkedin: 'https://www.linkedin.com/in/maya-devi-91bb0b347',
  },
  {
    image: '/teamImages/sainath.jpeg',
    name: 'Sainath',
    role: 'Sales & Marketing',
    bio: '10+ years building high-performing sales teams, increasing lead conversions, and executing data-driven marketing strategies.',
    linkedin: 'https://www.linkedin.com/in/thummapudisainadh-st01',
  },
]

export default function LeadershipSection() {
  // Duplicate the list so the marquee loops seamlessly.
  const looped = [...TEAM, ...TEAM]

  return (
    <section
      id="leadership"
      style={{ padding: '7rem 0', borderTop: '1px solid var(--border-subtle)' }}
    >
      <div className="site-container">
        <div className="reveal mb-12 max-w-[760px]">
          <div className="eyebrow mb-5">Leadership</div>
          <h2 className="mb-5" style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)' }}>
            The team behind <em className="italic-accent">the partnership.</em>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: 620 }}>
            A senior leadership team with deep roots in engineering, AI/ML, and
            operating teams that have shipped at scale.
          </p>
        </div>
      </div>

      {/* Marquee — full bleed with fading edges */}
      <div className="reveal team-marquee">
        <div className="team-track">
          {looped.map((m, i) => (
            <TeamCard key={`${m.name}-${i}`} member={m} />
          ))}
        </div>
      </div>

      <style jsx>{`
        .team-marquee {
          position: relative;
          width: 100%;
          overflow: hidden;
          -webkit-mask-image: linear-gradient(
            90deg,
            transparent 0,
            black 6%,
            black 94%,
            transparent 100%
          );
          mask-image: linear-gradient(
            90deg,
            transparent 0,
            black 6%,
            black 94%,
            transparent 100%
          );
        }

        .team-track {
          display: flex;
          gap: 20px;
          width: max-content;
          animation: team-scroll 38s linear infinite;
        }

        .team-marquee:hover .team-track {
          animation-play-state: paused;
        }

        /* Translate by half the duplicated width = one full original loop */
        @keyframes team-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        @media (prefers-reduced-motion: reduce) {
          .team-track { animation: none; }
        }
      `}</style>
    </section>
  )
}

function TeamCard({ member }) {
  return (
    <article
      className="flex items-center gap-5"
      style={{
        flex: 'none',
        width: 360,
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 18,
        padding: '1.25rem',
        transition: 'all 0.3s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-card-hover)'
        e.currentTarget.style.borderColor = 'var(--border-default)'
        e.currentTarget.style.transform = 'translateY(-3px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--bg-card)'
        e.currentTarget.style.borderColor = 'var(--border-subtle)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {/* Left: text */}
      <div className="flex-1 min-w-0">
        <h4
          className="font-display mb-1 truncate"
          style={{ fontSize: '1.05rem', fontWeight: 500 }}
        >
          {member.name}
        </h4>
        <div
          className="font-mono mb-3 truncate"
          style={{
            fontSize: '0.65rem',
            color: 'var(--accent)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          {member.role}
        </div>
        <p
          className="mb-3"
          style={{
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 4,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {member.bio}
        </p>
        <a
          href={member.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${member.name} on LinkedIn`}
          className="inline-flex items-center gap-2 font-mono transition-colors"
          style={{
            fontSize: '0.7rem',
            color: 'var(--text-tertiary)',
            letterSpacing: '0.08em',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-tertiary)')}
        >
          <Linkedin size={13} /> LINKEDIN
        </a>
      </div>

      {/* Right: circular image */}
      <div
        className="relative flex-none"
        style={{
          width: 96,
          height: 96,
          borderRadius: '50%',
          overflow: 'hidden',
          border: '1.5px solid var(--border-default)',
          boxShadow: '0 8px 24px -8px rgba(94, 234, 212, 0.18)',
        }}
      >
        <Image src={member.image} alt={member.name} fill sizes="96px" className="object-cover" />
      </div>
    </article>
  )
}
