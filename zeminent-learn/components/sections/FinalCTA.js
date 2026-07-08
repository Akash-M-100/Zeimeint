import { ArrowUpRight } from "lucide-react";
import Tag from "../ui/Tag";

export default function FinalCTA() {
  return (
    <section
      className="relative py-40"
      style={{
        borderTop: "1px solid var(--border)",
        background:
          "radial-gradient(ellipse 60% 100% at 50% 100%, rgba(94,234,212,0.1), transparent 70%)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 text-center">
        <Tag accent>
          <span className="live-dot" /> cohort 04 · jan 12 · 2026
        </Tag>
        <h2
          className="font-display mt-8"
          style={{
            fontSize: "clamp(48px, 8vw, 128px)",
            lineHeight: 0.98,
            letterSpacing: "-0.03em",
          }}
        >
          The next cohort starts
          <br />
          <span className="italic-display" style={{ color: "var(--accent)" }}>
            January twelfth.
          </span>
        </h2>
        <p
          className="mt-8 mx-auto"
          style={{ color: "var(--fg-dim)", fontSize: 18, maxWidth: 540, lineHeight: 1.55 }}
        >
          Seats capped at 200. No cohort is repeated. Apply now to secure yours.
        </p>
        <button
          className="btn-primary mt-10 px-7 py-3.5 inline-flex items-center gap-2"
          style={{ fontSize: 16 }}
        >
          Reserve your seat <ArrowUpRight size={16} />
        </button>
      </div>
    </section>
  );
}
