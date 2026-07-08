"use client";

import { useTheme } from "../app/components/ThemeProvider";

// Sun / Moon glyphs (inline so we don't depend on an icon lib version).
function SunIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export default function ThemeToggle({ className = "", size = 36, style }) {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`grid place-items-center rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        border: "1px solid var(--border-strong)",
        color: "var(--fg-dim)",
        background: "transparent",
        cursor: "pointer",
        transition: "color 0.2s ease, border-color 0.2s ease, background 0.2s ease",
        ...style,
      }}
    >
      {isDark ? <SunIcon size={size * 0.5} /> : <MoonIcon size={size * 0.5} />}
    </button>
  );
}
