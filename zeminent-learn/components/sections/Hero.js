"use client";
import { useState, useEffect } from "react";
import { ArrowRight, Play } from "lucide-react";
import Tag from "../ui/Tag";
import { HERO_CODE, colorize } from "../data/heroCode";

function HeroSignature() {
  const [typed, setTyped] = useState(0);
  const total = HERO_CODE.length;

  useEffect(() => {
    let raf;
    let last = performance.now();
    let count = 0;
    const tick = (now) => {
      const dt = now - last;
      if (dt > 28) {
        last = now;
        count += 1;
        if (count > total + 60) count = 0;
        setTyped(count);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [total]);

  const visible = HERO_CODE.slice(0, Math.min(typed, total));
  const lines = visible.split("\n");
  const fullLines = HERO_CODE.split("\n");

  const showPill = typed > HERO_CODE.indexOf("cohort 04") + 12;
  const showHeading1 = typed > HERO_CODE.indexOf("Ship engineers,") + 14;
  const showHeading2 = typed > HERO_CODE.indexOf("not graduates.") + 14;
  const showButton = typed > HERO_CODE.indexOf("Enroll") + 6;

  return (
    <div
      className="relative rounded-2xl overflow-hidden noise"
      style={{
        border: "1px solid var(--border-strong)",
        background: "var(--bg-1)",
        boxShadow:
          "0 1px 0 rgba(255,255,255,0.04) inset, 0 30px 80px -20px rgba(0,0,0,0.7)",
      }}
    >
      {/* window chrome */}
      <div
        className="flex items-center justify-between gap-2 px-4 py-3"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <span style={{ width: 10, height: 10, borderRadius: 999, background: "#2d3a4d" }} />
          <span style={{ width: 10, height: 10, borderRadius: 999, background: "#2d3a4d" }} />
          <span style={{ width: 10, height: 10, borderRadius: 999, background: "#2d3a4d" }} />
          <span className="font-mono ml-3" style={{ color: "var(--fg-mute)", fontSize: 11 }}>
            hero.tsx
          </span>
        </div>
        <span className="font-mono" style={{ color: "var(--fg-mute)", fontSize: 11 }}>
          <span className="live-dot mr-2" /> live
        </span>
      </div>

      <div className="hero-signature-grid" style={{ minHeight: 360 }}>
        {/* code pane */}
        <div
          className="font-mono p-5"
          style={{
            fontSize: 13,
            lineHeight: 1.65,
            background: "linear-gradient(180deg, rgba(94,234,212,0.025) 0%, transparent 30%)",
            borderRight: "1px solid var(--border)",
            color: "var(--fg)",
          }}
        >
          {fullLines.map((fullLine, idx) => {
            const lineText = lines[idx] ?? "";
            const isTyping = idx === lines.length - 1 && typed < total;
            const colored = colorize(lineText);
            return (
              <div key={idx} className="flex items-start" style={{ minHeight: "1.65em" }}>
                <span
                  style={{
                    width: 28,
                    color: "var(--fg-mute)",
                    userSelect: "none",
                    textAlign: "right",
                    marginRight: 14,
                    flexShrink: 0,
                  }}
                >
                  {idx + 1}
                </span>
                <span style={{ whiteSpace: "pre" }}>
                  {colored.map((c, i2) => (
                    <span key={i2} style={{ color: c.color }}>
                      {c.text}
                    </span>
                  ))}
                  {isTyping && <span className="caret" />}
                </span>
              </div>
            );
          })}
        </div>

        {/* render pane */}
        <div className="relative flex flex-col items-start justify-center p-8" style={{ minHeight: 360 }}>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at 30% 40%, rgba(94,234,212,0.06), transparent 60%)",
            }}
          />
          <div className="relative w-full">
            <div
              style={{
                opacity: showPill ? 1 : 0,
                transform: showPill ? "translateY(0)" : "translateY(8px)",
                transition: "all 0.5s cubic-bezier(.2,.7,.2,1)",
              }}
            >
              <Tag accent>
                <span className="live-dot" /> cohort 04 · jan 12
              </Tag>
            </div>

            <div className="mt-5 font-display" style={{ fontSize: 44, lineHeight: 0.98 }}>
              <div
                style={{
                  opacity: showHeading1 ? 1 : 0,
                  transform: showHeading1 ? "translateY(0)" : "translateY(10px)",
                  transition: "all 0.55s cubic-bezier(.2,.7,.2,1)",
                }}
              >
                Ship engineers,
              </div>
              <div
                className="italic-display"
                style={{
                  color: "var(--accent)",
                  opacity: showHeading2 ? 1 : 0,
                  transform: showHeading2 ? "translateY(0)" : "translateY(10px)",
                  transition: "all 0.55s 0.05s cubic-bezier(.2,.7,.2,1)",
                  fontSize: 44,
                }}
              >
                not graduates.
              </div>
            </div>

            <div
              className="mt-6"
              style={{
                opacity: showButton ? 1 : 0,
                transform: showButton ? "translateY(0)" : "translateY(8px)",
                transition: "all 0.5s cubic-bezier(.2,.7,.2,1)",
              }}
            >
              <button
                className="btn-primary px-5 py-2.5 inline-flex items-center gap-2"
                style={{ fontSize: 14 }}
              >
                Enroll <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* status bar */}
      <div
        className="flex items-center justify-between px-4 py-2 font-mono"
        style={{ borderTop: "1px solid var(--border)", fontSize: 11, color: "var(--fg-mute)" }}
      >
        <span>main · synced</span>
        <span>{Math.min(typed, total)}/{total}</span>
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <section className="relative pt-32 pb-24" style={{ minHeight: "100vh" }}>
      <div className="absolute inset-0 grid-bg" style={{ opacity: 0.4 }} />
      <div className="absolute inset-0 hero-glow" />
      <div className="relative max-w-7xl mx-auto px-6">
        <div className="hero">
          <div className="hero-col">
            <div className="line-reveal" style={{ animationDelay: "0.05s" }}>
              <Tag accent>
                <span className="live-dot" /> cohort 04 · enrollment open
              </Tag>
            </div>

            <h1
              className="font-display mt-7"
              style={{ fontSize: "clamp(56px, 8vw, 112px)", letterSpacing: "-0.025em" }}
            >
              <span className="block line-reveal" style={{ animationDelay: "0.1s" }}>
                Ship engineers,
              </span>
              <span
                className="italic-display block line-reveal"
                style={{ color: "var(--accent)", animationDelay: "0.2s" }}
              >
                not graduates.
              </span>
            </h1>

            <p
              className="mt-7 line-reveal"
              style={{
                fontSize: 18,
                lineHeight: 1.55,
                maxWidth: 520,
                color: "var(--fg-dim)",
                animationDelay: "0.35s",
              }}
            >
              Twelve weeks. 140+ hours of recorded lessons. One real-world capstone shipped to
              production. A certificate employers can verify.
            </p>

            <div
              className="mt-9 flex flex-wrap items-center gap-3 line-reveal"
              style={{ animationDelay: "0.5s" }}
            >
              <button
                className="btn-primary px-6 py-3 inline-flex items-center gap-2"
                style={{ fontSize: 15 }}
              >
                Enroll for cohort 04 <ArrowRight size={16} />
              </button>
              <button
                className="btn-ghost px-5 py-3 inline-flex items-center gap-2"
                style={{ fontSize: 15 }}
              >
                <Play size={14} /> Curriculum trailer
                <span className="font-mono ml-1" style={{ color: "var(--fg-mute)", fontSize: 12 }}>
                  2:14
                </span>
              </button>
            </div>

            <div className="mt-14 line-reveal" style={{ animationDelay: "0.7s" }}>
              <div
                className="font-mono uppercase mb-4"
                style={{ color: "var(--fg-mute)", fontSize: 11, letterSpacing: "0.16em" }}
              >
                Trusted by engineers now at
              </div>
              <div
                className="flex flex-wrap items-center gap-x-8 gap-y-3"
                style={{ color: "var(--fg-dim)" }}
              >
                {["razorpay", "zomato", "swiggy", "freshworks", "postman", "cred"].map((c) => (
                  <span
                    key={c}
                    className="font-mono lowercase"
                    style={{ fontSize: 14, letterSpacing: "-0.01em", opacity: 0.7 }}
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="hero-col line-reveal" style={{ animationDelay: "0.4s" }}>
            <HeroSignature />
            <div
              className="mt-4 flex items-center justify-between font-mono"
              style={{ color: "var(--fg-mute)", fontSize: 12 }}
            >
              <span>↑ live demo · types and renders in real time</span>
              <span>looped</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
