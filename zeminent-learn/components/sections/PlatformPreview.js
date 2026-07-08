import { Play, PlayCircle, CheckCircle2, Circle } from "lucide-react";
import SectionLabel from "../ui/SectionLabel";

function PlatformMockup() {
  return (
    <div
      className="rounded-2xl overflow-hidden relative"
      style={{
        border: "1px solid var(--border-strong)",
        boxShadow: "0 60px 140px -40px rgba(0,0,0,0.7), 0 0 0 1px var(--border)",
      }}
    >
      {/* browser chrome */}
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ background: "var(--bg-2)", borderBottom: "1px solid var(--border)" }}
      >
        <span style={{ width: 11, height: 11, borderRadius: 999, background: "#1c2531" }} />
        <span style={{ width: 11, height: 11, borderRadius: 999, background: "#1c2531" }} />
        <span style={{ width: 11, height: 11, borderRadius: 999, background: "#1c2531" }} />
        <div
          className="ml-4 flex-1 max-w-md mx-auto rounded-md font-mono px-3 py-1"
          style={{
            background: "var(--bg-1)",
            color: "var(--fg-mute)",
            fontSize: 11,
            border: "1px solid var(--border)",
          }}
        >
          learn.zeminent.com/learn/react/hooks/useeffect
        </div>
      </div>

      <div className="grid grid-cols-12" style={{ background: "var(--bg-1)", minHeight: 480 }}>
        {/* sidebar */}
        <div
          className="col-span-3 p-5"
          style={{ borderRight: "1px solid var(--border)" }}
        >
          <div className="font-mono mb-4" style={{ color: "var(--fg-mute)", fontSize: 11, letterSpacing: "0.14em" }}>
            PHASE 02 · WEEK 06
          </div>
          {[
            { t: "React mental model", done: true },
            { t: "useState in depth", done: true },
            { t: "useEffect", done: false, current: true },
            { t: "Refs & imperative code", done: false },
            { t: "Context, providers", done: false },
            { t: "useReducer", done: false },
          ].map((m, i) => (
            <div
              key={i}
              className="flex items-center gap-3 py-2.5"
              style={{
                color: m.current
                  ? "var(--fg)"
                  : m.done
                  ? "var(--fg-dim)"
                  : "var(--fg-mute)",
                fontSize: 13,
                fontWeight: m.current ? 500 : 400,
              }}
            >
              {m.done ? (
                <CheckCircle2 size={14} style={{ color: "var(--accent)" }} />
              ) : m.current ? (
                <PlayCircle size={14} style={{ color: "var(--accent)" }} />
              ) : (
                <Circle size={14} />
              )}
              <span style={{ textDecoration: m.done ? "line-through" : "none" }}>{m.t}</span>
            </div>
          ))}
        </div>

        {/* main */}
        <div className="col-span-6 p-6">
          <div
            className="rounded-lg player-surface relative flex items-center justify-center"
            style={{ border: "1px solid var(--border)", aspectRatio: "16/9" }}
          >
            <button
              className="rounded-full flex items-center justify-center"
              style={{
                width: 64,
                height: 64,
                background: "var(--accent)",
                color: "#000",
                boxShadow: "0 0 60px var(--accent-glow)",
              }}
            >
              <Play size={26} fill="#000" />
            </button>
            <div
              className="absolute bottom-3 left-3 font-mono"
              style={{ fontSize: 11, color: "var(--fg-dim)" }}
            >
              06.03 · useEffect
            </div>
            <div
              className="absolute bottom-3 right-3 font-mono"
              style={{ fontSize: 11, color: "var(--fg-dim)" }}
            >
              28:14
            </div>
          </div>

          <div className="mt-5 flex items-center gap-5" style={{ fontSize: 13, color: "var(--fg-dim)" }}>
            {["Notes", "Resources", "Transcript", "Discussion"].map((t, i) => (
              <span
                key={t}
                style={{
                  color: i === 0 ? "var(--fg)" : "var(--fg-mute)",
                  borderBottom: i === 0 ? "2px solid var(--accent)" : "2px solid transparent",
                  paddingBottom: 8,
                }}
              >
                {t}
              </span>
            ))}
          </div>

          <div
            className="mt-5 rounded-lg p-4 font-mono"
            style={{
              background: "var(--bg-2)",
              border: "1px solid var(--border)",
              fontSize: 12,
              color: "var(--fg-dim)",
              lineHeight: 1.7,
            }}
          >
            <div style={{ color: "var(--fg-mute)" }}>// 12:34</div>
            <div>useEffect runs <span style={{ color: "var(--accent)" }}>after</span> render.</div>
            <div style={{ color: "var(--fg-mute)" }}>// 13:08</div>
            <div>cleanup function = the inverse of the effect.</div>
          </div>
        </div>

        {/* right rail — playground */}
        <div
          className="col-span-3 p-5"
          style={{ borderLeft: "1px solid var(--border)", background: "var(--bg)" }}
        >
          <div className="font-mono mb-3" style={{ color: "var(--fg-mute)", fontSize: 11, letterSpacing: "0.14em" }}>
            PLAYGROUND
          </div>
          <div
            className="rounded-md font-mono p-3"
            style={{
              background: "#0d1117",
              border: "1px solid var(--border)",
              fontSize: 11,
              lineHeight: 1.7,
              color: "var(--fg-dim)",
            }}
          >
            <div><span style={{ color: "#818cf8" }}>useEffect</span>(() ={">"} {"{"}</div>
            <div>&nbsp;&nbsp;document.title = `${"$"}{"{"}count{"}"}`;</div>
            <div>{"}"}, [count]);</div>
          </div>
          <button
            className="btn-primary mt-4 w-full py-2 text-center"
            style={{ fontSize: 12 }}
          >
            Run
          </button>
          <div
            className="mt-4 rounded-md p-3 font-mono"
            style={{
              border: "1px solid var(--accent-dim)",
              background: "rgba(94,234,212,0.04)",
              fontSize: 11,
              color: "var(--accent)",
            }}
          >
            ✓ rendered · 2.1ms
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PlatformPreview() {
  return (
    <section
      className="relative py-32"
      style={{
        borderTop: "1px solid var(--border)",
        background:
          "linear-gradient(180deg, transparent 0%, rgba(94,234,212,0.025) 50%, transparent 100%)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <SectionLabel num="03" label="Inside the platform" />

        <div className="grid md:grid-cols-12 gap-10 items-end mb-12">
          <h2
            className="font-display md:col-span-7 lg:col-span-12"
            style={{ fontSize: "clamp(40px, 5vw, 64px)", lineHeight: 1.05 }}
          >
            Your learning environment.
            <br />
            <span className="italic-display" style={{ color: "var(--fg-dim)" }}>
              Built like a product, not a Drive folder.
            </span>
          </h2>
          <p
            className="md:col-span-4 md:col-start-9 lg:col-span-12"
            style={{ color: "var(--fg-dim)", fontSize: 16, lineHeight: 1.6 }}
          >
            Recorded video that respects your time. A code playground next to every lesson.
            Notes that timestamp themselves to the video.
          </p>
        </div>

        <PlatformMockup />
      </div>
    </section>
  );
}
