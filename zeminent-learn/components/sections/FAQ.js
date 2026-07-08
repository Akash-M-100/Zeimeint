import { Plus } from "lucide-react";
import SectionLabel from "../ui/SectionLabel";
import { FAQ_ITEMS } from "../data/faq";

export default function FAQ() {
  return (
    <section
      id="faq"
      className="relative py-32"
      style={{ borderTop: "1px solid var(--border)" }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <SectionLabel num="08" label="FAQ" />

        <div className="grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-4">
            <h2
              className="font-display"
              style={{ fontSize: "clamp(40px, 5vw, 72px)", lineHeight: 1.04 }}
            >
              Honest
              <br />
              <span className="italic-display" style={{ color: "var(--fg-dim)" }}>
                answers.
              </span>
            </h2>
            <p className="mt-6" style={{ color: "var(--fg-dim)", fontSize: 15, lineHeight: 1.6 }}>
              Still unsure? Email{" "}
              <a className="font-mono" style={{ color: "var(--accent)" }}>
                info@zeminent.com
              </a>{" "}
              and ask anything.
            </p>
          </div>

          <div className="lg:col-span-8">
            {FAQ_ITEMS.map((item, i) => (
              <details key={i} className="group" style={{ borderTop: "1px solid var(--border)" }}>
                <summary
                  className="py-6 flex items-start gap-6"
                  style={{ fontSize: 18 }}
                >
                  <span
                    className="font-mono flex-shrink-0"
                    style={{ color: "var(--fg-mute)", fontSize: 12, marginTop: 6 }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span style={{ flex: 1 }}>{item.q}</span>
                  <span
                    style={{
                      color: "var(--fg-dim)",
                      transition: "transform 0.25s ease, color 0.25s ease",
                      flexShrink: 0,
                    }}
                    className="group-open:rotate-45"
                  >
                    <Plus size={18} />
                  </span>
                </summary>
                <div
                  className="pb-7 pl-12"
                  style={{
                    color: "var(--fg-dim)",
                    fontSize: 16,
                    lineHeight: 1.65,
                    maxWidth: "65ch",
                  }}
                >
                  {item.a}
                </div>
              </details>
            ))}
            <div style={{ borderTop: "1px solid var(--border)" }} />
          </div>
        </div>
      </div>
    </section>
  );
}
