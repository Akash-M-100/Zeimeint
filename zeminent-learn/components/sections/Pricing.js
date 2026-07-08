"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import SectionLabel from "../ui/SectionLabel";
import { LockIcon } from "@/app/components/Icons";
import { useAuth } from "@/app/components/AuthProvider";

// Slice 11: collapsed from the legacy two-tier (Self-paced / Cohort) +
// EMI-toggle layout to a single Full Access SKU. Slice 14 Phase A: added
// the Placement Guarantee Program card alongside it, gated client-side by
// the eligibility endpoint (and re-checked server-side on lead submit).
// Backend pricing lives in zeminent-learn-backend/src/config/product.js.
const PACKAGE = {
  name: "Full Access",
  price: "₹39,999",
  priceNote: "lifetime · one-time payment",
  description:
    "One purchase. Every course we ship, today and tomorrow. No tiers, no add-ons, no surprise renewals.",
  ctaLabel: "Get Full Access",
  ctaHref: "/courses",
  features: [
    "All courses — current and future",
    "140+ hours of recorded lessons",
    "All weekly assignments and projects",
    "Verifiable certificate on completion",
    "Community access",
    "Lifetime access — no recurring fees",
  ],
};

const PLACEMENT = {
  name: "Placement Guarantee Program",
  price: "₹2,49,999",
  priceNote: "one-time · lifetime mentorship",
  tag: "REFUND IF NOT PLACED",
  description:
    "Get placed in a software engineering role within 6 months — or get a full refund (less a small admin fee). Built for graduates of Full Access who want a guaranteed outcome.",
  ctaLabel: "Learn more",
  ctaHref: "/placement-program",
  features: [
    "6-month placement commitment",
    "Full refund if no placement",
    "1-on-1 mentoring + interview prep",
    "Access to our hiring partner network",
    "Signed agreement at enrollment",
  ],
};

export default function Pricing() {
  return (
    <section
      id="pricing"
      className="relative py-32"
      style={{ borderTop: "1px solid var(--border)" }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <SectionLabel num="07" label="Pricing" />

        <div className="mb-16 text-center">
          <h2
            className="font-display"
            style={{ fontSize: "clamp(40px, 5vw, 68px)", lineHeight: 1.04 }}
          >
            Two paths.
            <br />
            <span className="italic-display" style={{ color: "var(--fg-dim)" }}>
              Same destination.
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FullAccessCard />
          <PlacementProgramCard />
        </div>

        <div
          className="mt-10 flex flex-wrap items-center gap-6 justify-center"
          style={{ color: "var(--fg-mute)", fontSize: 13 }}
        >
          <span className="flex items-center gap-2">
            <Check size={14} style={{ color: "var(--accent)" }} /> 14-day
            money-back on Full Access
          </span>
          <span>·</span>
          <span>Razorpay</span>
          <span>·</span>
          <span>GST invoiced on request</span>
        </div>
      </div>
    </section>
  );
}

function FullAccessCard() {
  return (
    <article
      className="relative rounded-2xl p-10 w-full flex flex-col"
      style={{
        background:
          "linear-gradient(180deg, rgba(94,234,212,0.06), rgba(94,234,212,0.01))",
        border: "1px solid var(--accent-dim)",
      }}
    >
      <div
        className="font-mono uppercase"
        style={{ color: "var(--fg-mute)", fontSize: 11, letterSpacing: "0.18em" }}
      >
        {PACKAGE.name}
      </div>
      <div className="mt-5 flex items-baseline gap-3">
        <span
          className="font-display"
          style={{ fontSize: 64, letterSpacing: "-0.02em" }}
        >
          {PACKAGE.price}
        </span>
        <span
          className="font-mono"
          style={{ color: "var(--fg-mute)", fontSize: 13 }}
        >
          {PACKAGE.priceNote}
        </span>
      </div>
      <p
        className="mt-4"
        style={{ color: "var(--fg-dim)", fontSize: 15, lineHeight: 1.55 }}
      >
        {PACKAGE.description}
      </p>

      <div className="my-8" style={{ height: 1, background: "var(--border)" }} />

      <ul className="space-y-3 flex-1">
        {PACKAGE.features.map((f) => (
          <li
            key={f}
            className="flex items-start gap-3"
            style={{ fontSize: 14 }}
          >
            <Check
              size={14}
              style={{
                color: "var(--accent)",
                marginTop: 4,
                flexShrink: 0,
              }}
            />
            <span style={{ color: "var(--fg-dim)" }}>{f}</span>
          </li>
        ))}
      </ul>

      <Link
        href={PACKAGE.ctaHref}
        className="btn-primary mt-9 w-full py-3.5 inline-flex items-center justify-center"
        style={{ fontSize: 14 }}
      >
        {PACKAGE.ctaLabel}
      </Link>
    </article>
  );
}

// Eligibility-gated card. Three visual states:
//   - LOADING: skeleton-ish neutral while we await the BFF
//   - LOCKED: opacity-60, lock badge replaces the CTA, "Sign in" or
//     "Complete a course" reason surfaces underneath
//   - UNLOCKED: full color, active CTA → /placement-program
function PlacementProgramCard() {
  const { status } = useAuth();
  const [eligibility, setEligibility] = useState(null); // null = loading
  const [error, setError] = useState(null);

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      setEligibility({
        eligible: false,
        reason: "Sign in to check your eligibility",
      });
      return;
    }
    fetch("/api/placement-program/eligibility", { cache: "no-store" })
      .then(async (r) => {
        const json = await r.json().catch(() => ({}));
        if (!r.ok) {
          throw new Error(json?.message || "Could not check eligibility");
        }
        return json;
      })
      .then((d) =>
        setEligibility(
          d?.data || { eligible: false, reason: "Unknown eligibility state" },
        ),
      )
      .catch((e) => {
        setError(e.message);
        setEligibility({ eligible: false, reason: e.message });
      });
  }, [status]);

  const loading = eligibility === null;
  const locked = loading || !eligibility?.eligible;
  const reason = eligibility?.reason || "Complete a course to unlock";

  return (
    <article
      className="relative rounded-2xl p-10 w-full flex flex-col"
      style={{
        background:
          "linear-gradient(180deg, rgba(204,119,85,0.06), rgba(204,119,85,0.01))",
        border: "1px solid var(--accent-warm-dim, var(--border-strong))",
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="font-mono uppercase"
          style={{
            color: "var(--fg-mute)",
            fontSize: 11,
            letterSpacing: "0.18em",
          }}
        >
          Placement Guarantee
        </div>
        {locked && (
          <LockIcon
            width={12}
            height={12}
            style={{ color: "var(--fg-mute)" }}
          />
        )}
      </div>

      {/* Body opacity-60 when locked so the gating is visually obvious but the
          card still reads as a real product, not a stub. */}
      <div className={locked ? "opacity-60" : ""}>
        <div className="mt-5 flex items-baseline gap-3 flex-wrap">
          <span
            className="font-display"
            style={{ fontSize: 56, letterSpacing: "-0.02em" }}
          >
            {PLACEMENT.price}
          </span>
          <span
            className="font-mono"
            style={{ color: "var(--fg-mute)", fontSize: 13 }}
          >
            {PLACEMENT.priceNote}
          </span>
        </div>
        <div className="mt-3">
          <span
            className="inline-block font-mono uppercase px-2.5 py-1 rounded-full"
            style={{
              fontSize: 10,
              letterSpacing: "0.14em",
              color: "#cc7755",
              background: "rgba(204,119,85,0.08)",
              border: "1px solid rgba(204,119,85,0.25)",
            }}
          >
            {PLACEMENT.tag}
          </span>
        </div>
        <p
          className="mt-4"
          style={{
            color: "var(--fg-dim)",
            fontSize: 15,
            lineHeight: 1.55,
          }}
        >
          {PLACEMENT.description}
        </p>

        <div
          className="my-8"
          style={{ height: 1, background: "var(--border)" }}
        />

        <ul className="space-y-3">
          {PLACEMENT.features.map((f) => (
            <li
              key={f}
              className="flex items-start gap-3"
              style={{ fontSize: 14 }}
            >
              <Check
                size={14}
                style={{
                  color: "#cc7755",
                  marginTop: 4,
                  flexShrink: 0,
                }}
              />
              <span style={{ color: "var(--fg-dim)" }}>{f}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA / lock badge live OUTSIDE the dimmed body so the locked label
          stays legible at full opacity. */}
      <div className="mt-9">
        {locked ? (
          <div
            className="w-full py-3.5 inline-flex items-center justify-center gap-2 rounded-full"
            style={{
              fontSize: 13,
              color: "var(--fg-mute)",
              background: "var(--bg-2)",
              border: "1px solid var(--border)",
              cursor: "not-allowed",
            }}
            role="status"
            aria-live="polite"
          >
            <LockIcon width={14} height={14} />
            <span>{loading ? "Checking eligibility…" : reason}</span>
          </div>
        ) : (
          <Link
            href={PLACEMENT.ctaHref}
            className="w-full py-3.5 inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors"
            style={{
              fontSize: 14,
              color: "#0d1117",
              background: "#cc7755",
            }}
          >
            {PLACEMENT.ctaLabel} →
          </Link>
        )}
      </div>

      {error && (
        <p
          className="mt-3 text-center"
          style={{ color: "var(--fg-mute)", fontSize: 12 }}
        >
          {/* Surfacing the error verbatim is fine — it's a status message,
              never a security signal. */}
          {error}
        </p>
      )}
    </article>
  );
}
