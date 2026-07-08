"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import Tag from "../ui/Tag";
import SectionLabel from "../ui/SectionLabel";
import { PHASES } from "../data/phases";

export default function Curriculum() {
  const [open, setOpen] = useState("02");
  return (
    <section
      id="curriculum"
      className="relative py-32"
      style={{ borderTop: "1px solid var(--border)" }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <SectionLabel num="02" label="Curriculum" />

        <h2
          className="font-display"
          style={{ fontSize: "clamp(40px, 5.5vw, 76px)", lineHeight: 1.04 }}
        >
          24 weeks. 3 phases.
          <br />
          <span className="italic-display" style={{ color: "var(--accent)" }}>
            One engineer at the end.
          </span>
        </h2>

        <div className="mt-20 grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-1 hidden md:block">
            <div
              className="font-mono"
              style={{ color: "var(--fg-mute)", fontSize: 12, letterSpacing: "0.16em" }}
            >
              TIMELINE
            </div>
          </div>

          <div className="col-span-12 md:col-span-11 space-y-4">
            {PHASES.map((p) => {
              const isOpen = open === p.id;
              const Icon = p.icon;
              return (
                <div
                  key={p.id}
                  className="relative rounded-2xl"
                  style={{
                    border: `1px solid ${isOpen ? "var(--border-strong)" : "var(--border)"}`,
                    background: isOpen ? "var(--bg-1)" : "transparent",
                    transition: "all 0.3s ease",
                  }}
                >
                  <button
                    onClick={() => setOpen(isOpen ? null : p.id)}
                    className="w-full text-left p-7 flex items-start gap-6"
                  >
                    <div
                      className="font-mono flex-shrink-0"
                      style={{ color: "var(--fg-mute)", fontSize: 13, marginTop: 4 }}
                    >
                      Phase {p.id}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3
                          className="font-display"
                          style={{ fontSize: 38, lineHeight: 1, letterSpacing: "-0.02em" }}
                        >
                          {p.title}
                        </h3>
                        <span
                          className="font-mono"
                          style={{
                            color: "var(--fg-mute)",
                            fontSize: 13,
                            letterSpacing: "-0.01em",
                            marginLeft: 4,
                          }}
                        >
                          · {p.weeks}
                        </span>
                      </div>
                      <p
                        className="mt-3"
                        style={{
                          color: "var(--fg-dim)",
                          fontSize: 16,
                          maxWidth: 640,
                          lineHeight: 1.55,
                        }}
                      >
                        {p.summary}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 flex-shrink-0">
                      <Icon size={20} style={{ color: "var(--fg-mute)" }} />
                      <ChevronDown
                        size={18}
                        style={{
                          color: "var(--fg-dim)",
                          transform: isOpen ? "rotate(180deg)" : "none",
                          transition: "transform 0.25s ease",
                        }}
                      />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-7 pb-7" style={{ borderTop: "1px solid var(--border)" }}>
                      <div className="pt-6 grid md:grid-cols-2 gap-x-10 gap-y-4">
                        {p.modules.map((m) => (
                          <div
                            key={m.week}
                            className="flex items-start gap-5 py-3"
                            style={{ borderBottom: "1px dashed var(--border)" }}
                          >
                            <span
                              className="font-mono flex-shrink-0"
                              style={{
                                color: "var(--fg-mute)",
                                fontSize: 12,
                                letterSpacing: "0.05em",
                                marginTop: 4,
                              }}
                            >
                              W{m.week}
                            </span>
                            <div className="flex-1">
                              <div style={{ fontSize: 15 }}>{m.title}</div>
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                {m.tags.map((t) => (
                                  <Tag key={t}>{t}</Tag>
                                ))}
                                <span
                                  className="font-mono"
                                  style={{ color: "var(--fg-mute)", fontSize: 11 }}
                                >
                                  {m.hours}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div
                        className="mt-7 p-5 rounded-xl flex items-start gap-4"
                        style={{
                          background: "rgba(94,234,212,0.04)",
                          border: "1px solid var(--accent-dim)",
                        }}
                      >
                        <div
                          className="font-mono uppercase"
                          style={{
                            color: "var(--accent)",
                            fontSize: 11,
                            letterSpacing: "0.16em",
                            marginTop: 2,
                          }}
                        >
                          Deliverable
                        </div>
                        <div style={{ fontSize: 15, color: "var(--fg)" }}>{p.deliverable}</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
