const Tag = ({ children, accent = false, className = "" }) => (
  <span
    className={`font-mono uppercase tracking-wider ${className}`}
    style={{
      fontSize: 11,
      letterSpacing: "0.12em",
      padding: "4px 9px",
      borderRadius: 999,
      border: `1px solid ${accent ? "var(--accent-dim)" : "var(--border)"}`,
      color: accent ? "var(--accent)" : "var(--fg-dim)",
      background: accent ? "rgba(94,234,212,0.04)" : "transparent",
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </span>
);

export default Tag;
