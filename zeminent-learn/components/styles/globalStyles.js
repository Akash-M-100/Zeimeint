export const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;1,9..144,400&family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap');

:root {
  --bg: #0d1117;
  --bg-1: #141a23;
  --bg-2: #161d27;
  --bg-3: #1c2531;
  --fg: #e8ecef;
  --fg-dim: #a8b0bb;
  --fg-mute: #6b7280;
  --border: rgba(255,255,255,0.06);
  --border-strong: rgba(255,255,255,0.18);
  --accent: #5eead4;
  --accent-dim: rgba(94,234,212,0.16);
  --accent-glow: rgba(94,234,212,0.35);
}

*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }

.font-display { font-family: 'Fraunces', 'Georgia', serif; font-weight: 400; letter-spacing: -0.02em; line-height: 0.95; }
.font-body    { font-family: 'Geist', system-ui, sans-serif; }
.font-mono    { font-family: 'Geist Mono', ui-monospace, monospace; letter-spacing: -0.01em; }

.italic-display { font-family: 'Fraunces', serif; font-style: italic; font-weight: 400; }

::selection { background: var(--accent); color: #000; }

::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: var(--bg-3); border-radius: 10px; }
::-webkit-scrollbar-thumb:hover { background: #2d3a4d; }

.grid-bg {
  background-image:
    linear-gradient(to right, rgba(255,255,255,0.025) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255,255,255,0.025) 1px, transparent 1px);
  background-size: 56px 56px;
}

.hero-glow {
  background: radial-gradient(ellipse 80% 50% at 50% 0%, rgba(94,234,212,0.12), transparent 60%);
}

.btn-primary {
  background: var(--accent);
  color: #000;
  font-weight: 500;
  border-radius: 999px;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
  box-shadow: 0 0 0 0 var(--accent-glow);
}
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 0 32px 0 var(--accent-glow); }

.btn-ghost {
  border: 1px solid var(--border-strong);
  color: var(--fg);
  border-radius: 999px;
  background: transparent;
  transition: background 0.18s ease, border-color 0.18s ease;
}
.btn-ghost:hover { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.22); }

.caret {
  display: inline-block;
  width: 8px;
  height: 1.05em;
  background: var(--accent);
  margin-left: 1px;
  vertical-align: text-bottom;
  animation: blink 1.05s step-end infinite;
}
@keyframes blink { 0%, 50% { opacity: 1 } 50.01%, 100% { opacity: 0 } }

@keyframes lineReveal { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
.line-reveal { animation: lineReveal 0.9s cubic-bezier(.2,.7,.2,1) both; }

.nav-link { position: relative; }
.nav-link::after {
  content: ""; position: absolute; left: 0; right: 0; bottom: -6px;
  height: 1px; background: var(--accent); transform: scaleX(0); transform-origin: left;
  transition: transform 0.25s ease;
}
.nav-link:hover::after { transform: scaleX(1); }

.hero-grid {
  display: grid;
  gap: 3rem;
  align-items: start;
  min-height: 720px;
}

.hero-col {
  width: 100%;
  min-width: 0;
}

.hero-signature-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0;
}

@media (min-width: 768px) {
  .hero-signature-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .hero-grid {
    grid-template-columns: 0.55fr 0.45fr;
    gap: 4rem;
  }
}

.live-dot {
  width: 6px; height: 6px; border-radius: 999px; background: var(--accent);
  box-shadow: 0 0 0 0 var(--accent);
  animation: pulse 2.2s ease-out infinite;
  display: inline-block;
}
@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(94,234,212,0.6); }
  70% { box-shadow: 0 0 0 8px rgba(94,234,212,0); }
  100% { box-shadow: 0 0 0 0 rgba(94,234,212,0); }
}

.noise::after {
  content: ""; position: absolute; inset: 0; pointer-events: none; opacity: 0.035;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.7'/></svg>");
  mix-blend-mode: overlay;
}

/* cert paper */
.cert-paper {
  background: linear-gradient(180deg, #FAFAF7 0%, #F2F1EB 100%);
  color: #1A1A1A;
  position: relative;
  overflow: hidden;
}
.cert-paper::before {
  content: ""; position: absolute; inset: 0;
  background-image: radial-gradient(rgba(0,0,0,0.06) 1px, transparent 1px);
  background-size: 4px 4px;
  pointer-events: none;
  opacity: 0.45;
}

/* video player surface */
.player-surface {
  background:
    radial-gradient(ellipse at 30% 30%, rgba(94,234,212,0.08), transparent 50%),
    linear-gradient(180deg, #161d27 0%, #0d1117 100%);
}
`;
