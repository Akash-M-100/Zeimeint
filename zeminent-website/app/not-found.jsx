import Link from 'next/link'

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ paddingTop: '9rem', paddingBottom: '5rem' }}
    >
      <div className="text-center max-w-[520px]">
        <div className="eyebrow mb-6" style={{ justifyContent: 'center' }}>
          404 · Page not found
        </div>
        <h1
          className="mb-5"
          style={{
            fontSize: 'clamp(3rem, 8vw, 6rem)',
            background: 'var(--gradient-1)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Lost in <em className="italic-accent">latent space.</em>
        </h1>
        <p
          className="mb-10"
          style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}
        >
          The page you&apos;re looking for doesn&apos;t exist — or has been moved.
        </p>
        <Link href="/" className="btn-pill btn-pill-primary">
          Back to home <span className="arrow">→</span>
        </Link>
      </div>
    </div>
  )
}
