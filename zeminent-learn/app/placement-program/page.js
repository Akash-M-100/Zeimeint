"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRightIcon, LockIcon, CheckCircleIcon } from "@/app/components/Icons";
import { useAuth } from "@/app/components/AuthProvider";
import Nav from "@/components/sections/Nav";
import Footer from "@/components/Footer";

// Slice 14 Phase A: standalone landing page for the Placement Guarantee
// Program. Renders for everyone, but the enrollment CTA is hard-gated
// behind the /eligibility endpoint (server re-checks on the order side too).
//
// B.5: replaced the original lead-capture form with a direct-to-checkout
// CTA — the program is now sold via the placement-program/checkout flow
// on the new B.1-B.4 backend. Sales no longer triages leads pre-payment.

const PROGRAM_PILLARS = [
  {
    title: "What you get",
    body: "A dedicated mentor, weekly interview prep, applications to our hiring partner network, and a placement-or-refund commitment in writing.",
  },
  {
    title: "6-month commitment",
    body: "We agree to actively support your placement for 6 months from enrollment. You agree to active participation — applications, mock interviews, follow-ups.",
  },
  {
    title: "Refund policy",
    body: "If no placement is secured in 6 months despite active participation, you receive a full refund of ₹2,49,999 (less a ₹25,000 admin fee).",
  },
  {
    title: "Hiring partners",
    body: "Curated network of product companies, startups, and engineering teams hiring at the experience level you've trained for. Logos coming soon.",
  },
];

const PROCESS_STEPS = [
  { n: "01", t: "Enroll", d: "Sign the agreement and pay ₹2,49,999. You're matched with a mentor within 5 days." },
  { n: "02", t: "Skill audit", d: "Mentor reviews your portfolio, identifies gaps, and builds a 6-month plan with you." },
  { n: "03", t: "Apply + prep", d: "Weekly applications from our partner network. Mock interviews. System design. Behavioural rounds." },
  { n: "04", t: "Placement", d: "You accept an offer matching your stated salary expectation. Program complete." },
  { n: "05", t: "Refund (if needed)", d: "No placement in 6 months despite active participation? Refund initiated within 14 days." },
];

const PLACEHOLDER_TERMS = [
  "Active participation in the program for the full 6-month duration",
  "Application to at least 5 opportunities per week from our partner network",
  "Acceptance of any offer matching your stated salary expectation (cannot decline 3+ valid offers and remain eligible for refund)",
  "Full refund of ₹2,49,999 (less ₹25,000 program admin fee) if no placement is secured within 6 months despite active participation",
  "[PLACEHOLDER: Definition of 'placement' — salary minimum, role type, location flexibility]",
  "[PLACEHOLDER: Dispute resolution clause]",
  "[PLACEHOLDER: Refund timeline and method]",
];

export default function PlacementProgramPage() {
  return (
    <div
      style={{ background: "var(--bg)", color: "var(--fg)" }}
      className="min-h-screen flex flex-col"
    >
      <Nav />
      <main className="flex-1">
        <Hero />
        <EligibilityRail />
        <ProgramPillars />
        <ProcessFlow />
        <TermsPreview />
        <EnrollmentCTA />
      </main>
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative pt-32 pb-20">
      <div className="max-w-5xl mx-auto px-6">
        <div className="font-mono-label mb-4">Placement Guarantee Program</div>
        <h1
          className="font-display"
          style={{
            fontSize: "clamp(40px, 6vw, 84px)",
            lineHeight: 1.02,
            letterSpacing: "-0.02em",
          }}
        >
          Get placed within 6 months
          <br />
          <span className="italic-display" style={{ color: "#cc7755" }}>
            or get your money back.
          </span>
        </h1>
        <p
          className="mt-8 max-w-2xl"
          style={{ color: "var(--fg-dim)", fontSize: 18, lineHeight: 1.6 }}
        >
          A ₹2,49,999 program with a full refund guarantee if you&apos;re not placed
          in a software engineering role within 6 months of completing the
          program. Built for graduates of Full Access who want a guaranteed
          outcome.
        </p>
      </div>
    </section>
  );
}

// Eligibility state machine for both the banner AND the form. Single fetch
// shared via a small custom hook so we never display a banner that says
// "eligible" while the form below still reads "locked".
function useEligibilityFetch() {
  const { status } = useAuth();
  const [eligibility, setEligibility] = useState(null); // null = loading
  const [error, setError] = useState(null);

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      setEligibility({ eligible: false, anonymous: true });
      return;
    }
    fetch("/api/placement-program/eligibility", { cache: "no-store" })
      .then(async (r) => {
        const json = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(json?.message || "Could not check eligibility");
        return json?.data || { eligible: false, reason: "Unknown" };
      })
      .then(setEligibility)
      .catch((e) => {
        setError(e.message);
        setEligibility({ eligible: false, reason: e.message });
      });
  }, [status]);

  return useMemo(
    () => ({
      loading: eligibility === null,
      anonymous: Boolean(eligibility?.anonymous),
      eligible: Boolean(eligibility?.eligible),
      reason: eligibility?.reason || null,
      completedCourseIds: eligibility?.completedCourseIds || [],
      error,
    }),
    [eligibility, error],
  );
}

// A small context-free hook + a dedicated rail keeps each section self-
// describing while the hook still fires only once per page load (React
// state-sharing optimisation isn't needed at this scale — one fetch per
// section is fine, but bundling both into the page-level hook would be
// cleaner. Done here via shared usage below.)
function EligibilityRail() {
  const e = useEligibilityFetch();
  let tone = "neutral";
  let body = null;
  let cta = null;

  if (e.loading) {
    body = "Checking your eligibility…";
  } else if (e.anonymous) {
    tone = "accent";
    body = "Sign in to check your eligibility for the program.";
    cta = (
      <Link href="/login?from=/placement-program" className="cta-pill">
        Sign in →
      </Link>
    );
  } else if (!e.eligible) {
    tone = "warn";
    body =
      e.reason ||
      "Complete at least one course to unlock the Placement Guarantee Program.";
    cta = (
      <Link href="/courses" className="cta-pill">
        Browse courses →
      </Link>
    );
  } else {
    tone = "ok";
    body = `You're eligible. Express interest below and our team will reach out within 48 hours.`;
  }

  const palette = {
    neutral: { bg: "var(--bg-1)", fg: "var(--fg-dim)", border: "var(--border)" },
    accent: {
      bg: "rgba(94,234,212,0.06)",
      fg: "var(--accent)",
      border: "var(--accent-dim)",
    },
    warn: {
      bg: "rgba(204,119,85,0.06)",
      fg: "#cc7755",
      border: "rgba(204,119,85,0.3)",
    },
    ok: {
      bg: "rgba(94,234,212,0.08)",
      fg: "var(--accent)",
      border: "var(--accent-dim)",
    },
  }[tone];

  return (
    <section className="px-6 pb-12">
      <div
        className="max-w-5xl mx-auto rounded-2xl px-6 py-4 flex items-center gap-4 flex-wrap"
        style={{
          background: palette.bg,
          border: `1px solid ${palette.border}`,
        }}
        role="status"
        aria-live="polite"
      >
        {tone === "ok" && <CheckCircleIcon width={18} height={18} className="shrink-0" style={{ color: palette.fg }} />}
        {tone === "warn" && <LockIcon width={16} height={16} className="shrink-0" style={{ color: palette.fg }} />}
        <span style={{ color: palette.fg, fontSize: 14 }}>{body}</span>
        {cta && <span className="ml-auto">{cta}</span>}
      </div>
      <style jsx>{`
        :global(.cta-pill) {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 6px 14px;
          border-radius: 9999px;
          font-size: 13px;
          font-weight: 500;
          background: var(--bg-2);
          border: 1px solid var(--border-strong);
          color: var(--fg);
          text-decoration: none;
        }
        :global(.cta-pill:hover) {
          border-color: var(--accent);
        }
      `}</style>
    </section>
  );
}

function ProgramPillars() {
  return (
    <section className="px-6 py-16">
      <div className="max-w-5xl mx-auto">
        <h2
          className="font-display mb-10"
          style={{ fontSize: "clamp(28px, 3.5vw, 44px)", letterSpacing: "-0.02em" }}
        >
          What the program covers
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PROGRAM_PILLARS.map((p) => (
            <article
              key={p.title}
              className="rounded-2xl p-6"
              style={{
                background: "var(--bg-1)",
                border: "1px solid var(--border)",
              }}
            >
              <h3
                className="font-display mb-3"
                style={{ fontSize: 22, letterSpacing: "-0.01em" }}
              >
                {p.title}
              </h3>
              <p
                style={{
                  color: "var(--fg-dim)",
                  fontSize: 15,
                  lineHeight: 1.6,
                }}
              >
                {p.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProcessFlow() {
  return (
    <section
      className="px-6 py-16"
      style={{ borderTop: "1px solid var(--border)" }}
    >
      <div className="max-w-5xl mx-auto">
        <h2
          className="font-display mb-10"
          style={{ fontSize: "clamp(28px, 3.5vw, 44px)", letterSpacing: "-0.02em" }}
        >
          How it works
        </h2>
        <ol className="space-y-6">
          {PROCESS_STEPS.map((s) => (
            <li key={s.n} className="flex gap-6 items-start">
              <span
                className="font-mono shrink-0"
                style={{
                  color: "#cc7755",
                  fontSize: 13,
                  letterSpacing: "0.16em",
                  paddingTop: 4,
                }}
              >
                {s.n}
              </span>
              <div className="flex-1">
                <h3 className="font-display" style={{ fontSize: 20 }}>
                  {s.t}
                </h3>
                <p
                  className="mt-1"
                  style={{
                    color: "var(--fg-dim)",
                    fontSize: 15,
                    lineHeight: 1.55,
                  }}
                >
                  {s.d}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function TermsPreview() {
  const [open, setOpen] = useState(false);
  return (
    <section
      className="px-6 py-16"
      style={{ borderTop: "1px solid var(--border)" }}
    >
      <div className="max-w-5xl mx-auto">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="w-full text-left flex items-center justify-between gap-4 rounded-2xl p-5"
          style={{
            background: "var(--bg-1)",
            border: "1px solid var(--border)",
          }}
        >
          <span>
            <div
              className="font-mono uppercase"
              style={{
                color: "#cc7755",
                fontSize: 10,
                letterSpacing: "0.18em",
              }}
            >
              Draft Terms — preview only
            </div>
            <h3
              className="font-display mt-1"
              style={{ fontSize: 22, letterSpacing: "-0.01em" }}
            >
              Program agreement (preview)
            </h3>
            <p
              className="mt-1"
              style={{ color: "var(--fg-mute)", fontSize: 13 }}
            >
              Full legal agreement is provided at enrollment.
            </p>
          </span>
          <span
            className="font-mono"
            style={{ color: "var(--fg-mute)", fontSize: 13 }}
          >
            {open ? "Hide" : "Show"} terms
          </span>
        </button>
        {open && (
          <div
            className="mt-3 rounded-2xl p-6"
            style={{
              background: "var(--bg-1)",
              border: "1px solid var(--border)",
            }}
          >
            <p
              className="mb-4"
              style={{ color: "var(--fg-dim)", fontSize: 14 }}
            >
              By enrolling, you agree to:
            </p>
            <ol className="space-y-3">
              {PLACEHOLDER_TERMS.map((t, i) => (
                <li
                  key={i}
                  className="flex gap-4"
                  style={{ fontSize: 14, color: "var(--fg-dim)" }}
                >
                  <span
                    className="font-mono shrink-0"
                    style={{
                      color: "var(--fg-mute)",
                      paddingTop: 2,
                    }}
                  >
                    {i + 1}.
                  </span>
                  <span>{t}</span>
                </li>
              ))}
            </ol>
            <p
              className="mt-5"
              style={{ color: "var(--fg-mute)", fontSize: 12 }}
            >
              Final terms will be in the signed agreement at enrollment.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

// B.5: enrollment-driven CTA. Replaces LeadCaptureRail. Four render
// branches — loading / anonymous / ineligible / eligible — mirror the
// pattern that EligibilityRail uses at the top of the page, but here the
// action is "go to checkout" rather than "submit a sales lead." The
// checkout layout re-runs the eligibility check on arrival, so a stale
// CTA click (e.g. user lost progress between page load and click) still
// lands safely.
function EnrollmentCTA() {
  const e = useEligibilityFetch();

  let body = null;

  if (e.loading) {
    body = (
      <div
        className="rounded-2xl p-6"
        style={{
          background: "var(--bg-1)",
          border: "1px solid var(--border)",
        }}
      >
        <p style={{ color: "var(--fg-mute)", fontSize: 14 }}>
          Checking your eligibility…
        </p>
      </div>
    );
  } else if (e.anonymous) {
    body = (
      <div
        className="rounded-2xl p-6 flex flex-col gap-4 items-start"
        style={{
          background: "var(--bg-1)",
          border: "1px solid var(--border)",
        }}
      >
        <p style={{ color: "var(--fg-dim)", fontSize: 15 }}>
          Sign in to check your eligibility and start enrollment.
        </p>
        <Link
          href="/login?from=/placement-program"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium"
          style={{ background: "#cc7755", color: "#0d1117" }}
        >
          Sign in to enroll
          <ArrowRightIcon width={14} height={14} />
        </Link>
      </div>
    );
  } else if (!e.eligible) {
    body = (
      <div
        className="rounded-2xl p-6 flex flex-col gap-4 items-start"
        style={{
          background: "var(--bg-1)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center gap-2" style={{ color: "#cc7755" }}>
          <LockIcon width={14} height={14} />
          <span
            className="font-mono uppercase"
            style={{ fontSize: 10, letterSpacing: "0.16em" }}
          >
            Locked
          </span>
        </div>
        <p style={{ color: "var(--fg-dim)", fontSize: 15, lineHeight: 1.55 }}>
          {e.reason || "Complete at least one course to unlock enrollment."}
        </p>
        <Link
          href="/courses"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium"
          style={{
            background: "var(--bg-2)",
            border: "1px solid var(--border-strong)",
            color: "var(--fg)",
          }}
        >
          Browse courses
          <ArrowRightIcon width={14} height={14} />
        </Link>
      </div>
    );
  } else {
    body = (
      <div
        className="rounded-2xl p-6 flex flex-col gap-4 items-start"
        style={{
          background: "rgba(94,234,212,0.06)",
          border: "1px solid var(--accent-dim)",
        }}
      >
        <div className="flex items-center gap-2" style={{ color: "var(--accent)" }}>
          <CheckCircleIcon width={16} height={16} />
          <span
            className="font-mono uppercase"
            style={{ fontSize: 10, letterSpacing: "0.16em" }}
          >
            Eligible
          </span>
        </div>
        <p style={{ color: "var(--fg-dim)", fontSize: 15, lineHeight: 1.55 }}>
          You meet the program requirements. Complete enrollment to be paired
          with a placement mentor within 5 business days.
        </p>
        <Link
          href="/placement-program/checkout"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium"
          style={{ background: "#cc7755", color: "#0d1117" }}
        >
          Enroll now
          <ArrowRightIcon width={14} height={14} />
        </Link>
      </div>
    );
  }

  return (
    <section
      id="enroll"
      className="px-6 py-20"
      style={{ borderTop: "1px solid var(--border)" }}
    >
      <div className="max-w-2xl mx-auto">
        <div className="font-mono-label mb-4">Step 1 — Enroll</div>
        <h2
          className="font-display mb-3"
          style={{
            fontSize: "clamp(28px, 3.5vw, 44px)",
            letterSpacing: "-0.02em",
          }}
        >
          Ready to start?
        </h2>
        <p
          className="mb-8"
          style={{ color: "var(--fg-dim)", fontSize: 16, lineHeight: 1.6 }}
        >
          Limited cohort. Complete enrollment, sign the agreement, and you&apos;re
          matched with a placement mentor within 5 business days.
        </p>
        {body}
      </div>
    </section>
  );
}
