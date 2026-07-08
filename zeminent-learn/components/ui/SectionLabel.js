const SectionLabel = ({ num, label }) => (
  <div className="flex items-center gap-3 mb-12">
    <span
      className="font-mono"
      style={{ color: "var(--fg-mute)", fontSize: 12, letterSpacing: "0.16em" }}
    >
      {num}
    </span>
    <span style={{ width: 32, height: 1, background: "var(--border-strong)" }} />
    <span
      className="font-mono uppercase"
      style={{ color: "var(--fg-dim)", fontSize: 12, letterSpacing: "0.18em" }}
    >
      {label}
    </span>
  </div>
);

export default SectionLabel;
