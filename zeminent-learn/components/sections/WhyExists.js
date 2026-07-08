import SectionLabel from "../ui/SectionLabel";

export default function WhyExists() {
  return (
    <section className="relative py-32" style={{ borderTop: "1px solid var(--border)" }}>
      <div className="max-w-7xl mx-auto px-6">
        <SectionLabel num="01" label="Why this exists" />

        <h2
          className="font-display"
          style={{
            fontSize: "clamp(40px, 5.5vw, 76px)",
            maxWidth: 1100,
            lineHeight: 1.04,
          }}
        >
          Most courses teach syntax.
          <br />
          <span className="italic-display" style={{ color: "var(--fg-dim)" }}>
            We teach how engineers actually ship.
          </span>
        </h2>

        <div
          className="grid lg:grid-cols-12 gap-12 mt-20"
          style={{ color: "var(--fg-dim)", fontSize: 17, lineHeight: 1.7 }}
        >
          <div className=" lg:col-span-7" style={{ maxWidth: "60ch" }}>
            <p>
              The web is full of MERN tutorials. Most graduate someone who can build a todo
              app and immediately stall the moment a real codebase, a real deadline, or a
              real reviewer enters the room. Hiring managers see hundreds of these portfolios
              every week, and they all look the same.
            </p>
            <p className="mt-6">
              Zeminent is built backwards from that problem. Every module is taught the way
              you'd actually be expected to do the work in a senior engineer's review:
              specifications first, code second, tests and deployment in the same breath.
              Capstone projects are graded against a rubric that mirrors a real pull request.
            </p>
            <p className="mt-6" style={{ color: "var(--fg)" }}>
              By week twelve you don't have a certificate of attendance. You have a deployed
              full-stack product, a Git history that proves you wrote it, and a code review
              loop that taught you how to defend it.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
