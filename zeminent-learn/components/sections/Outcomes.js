import SectionLabel from "../ui/SectionLabel";
import { TESTIMONIALS } from "../data/testimonials";

export default function Outcomes() {
  return (
    <section
      className="relative py-32"
      style={{ borderTop: "1px solid var(--border)" }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <SectionLabel num="06" label="Outcomes" />

        <h2
          className="font-display"
          style={{ fontSize: "clamp(40px, 5vw, 64px)", lineHeight: 1.04, maxWidth: 900 }}
        >
          What graduates do
          <span className="italic-display" style={{ color: "var(--fg-dim)" }}>
            {" "}after Zeminent.
          </span>
        </h2>

        {/* stat strip */}
        <div
          className="mt-16 grid grid-cols-2 md:grid-cols-4 rounded-2xl overflow-hidden"
          style={{ border: "1px solid var(--border-strong)" }}
        >
          {[
            { n: "2.4×", l: "avg salary jump" },
            { n: "94%", l: "capstones shipped" },
            { n: "78%", l: "placed in 90 days" },
            { n: "200", l: "seats per cohort" },
          ].map((s, i) => (
            <div
              key={s.l}
              className="p-8"
              style={{
                borderRight: i < 3 ? "1px solid var(--border)" : "none",
                background: i % 2 === 0 ? "var(--bg-1)" : "transparent",
              }}
            >
              <div
                className="font-mono"
                style={{ fontSize: 44, letterSpacing: "-0.04em", color: "var(--fg)" }}
              >
                {s.n}
              </div>
              <div
                className="font-mono uppercase mt-2"
                style={{ color: "var(--fg-mute)", fontSize: 11, letterSpacing: "0.14em" }}
              >
                {s.l}
              </div>
            </div>
          ))}
        </div>

        {/* testimonials */}
        <div className="mt-24 space-y-20">
          {TESTIMONIALS.map((t, i) => (
            <div
              key={i}
              style={{ maxWidth: 980 }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 999,
                  background: "linear-gradient(135deg, #161d27, #1c2531)",
                  border: "1px solid var(--border-strong)",
                }}
                className="flex items-center justify-center font-display"
              >
                <span style={{ fontSize: 22 }}>{t.name[0]}</span>
              </div>

              <blockquote className="mt-6">
                <div
                  className="font-display"
                  style={{
                    fontSize: "clamp(22px, 2.4vw, 32px)",
                    lineHeight: 1.3,
                    color: "var(--fg)",
                  }}
                >
                  <span
                    className="italic-display"
                    style={{ color: "var(--accent)", marginRight: 6 }}
                  >
                    "
                  </span>
                  {t.quote}
                  <span
                    className="italic-display"
                    style={{ color: "var(--accent)", marginLeft: 4 }}
                  >
                    "
                  </span>
                </div>
                <footer className="mt-6 flex items-baseline gap-3">
                  <span style={{ fontSize: 15, fontWeight: 500 }}>{t.name}</span>
                  <span
                    className="font-mono"
                    style={{ color: "var(--fg-mute)", fontSize: 12 }}
                  >
                    {t.role}
                  </span>
                </footer>
              </blockquote>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
