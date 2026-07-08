"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircleIcon,
  DownloadIcon,
  ArrowRightIcon,
} from "../../../components/Icons";

// Slice 14 B.5: post-payment landing for the placement-program checkout.
// Mirrors the structure of app/checkout/success/page.js (Full Access) but
// with placement-specific copy + the "what happens next" block since the
// program has a multi-step onboarding lifecycle the buyer should expect.
//
// Defensive: a stray reload or bookmark without ?paymentId bounces back to
// the program landing page rather than rendering a broken card.

const NEXT_STEPS = [
  {
    title: "Mentor pairing",
    body:
      "Within 5 business days, you'll be paired with a placement mentor matched to your background and goals.",
  },
  {
    title: "Onboarding call",
    body:
      "We'll schedule a 1-on-1 to align on the 6-month roadmap, target roles, and weekly cadence.",
  },
  {
    title: "Application support",
    body:
      "Personalized job-search guidance, mock interviews, system design, and behavioural prep throughout the program.",
  },
  {
    title: "Refund policy",
    body:
      "Full refund available within 6 months if no placement is secured despite active participation (terms apply).",
  },
];

export default function PlacementCheckoutSuccessPage() {
  const router = useRouter();
  const params = useSearchParams();
  const paymentId = params.get("paymentId");

  useEffect(() => {
    if (!paymentId) router.replace("/placement-program");
  }, [paymentId, router]);

  if (!paymentId) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="font-mono-label">redirecting…</div>
      </div>
    );
  }

  const receiptHref = `/api/payments/receipt/${encodeURIComponent(paymentId)}`;

  return (
    <div className="max-w-[760px] mx-auto px-6 md:px-8 py-16 flex flex-col gap-10">
      <header className="flex flex-col items-center text-center gap-6">
        <span
          className="size-16 rounded-full grid place-items-center"
          style={{
            background: "rgba(94,234,212,0.1)",
            color: "var(--accent)",
          }}
        >
          <CheckCircleIcon width={32} height={32} />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-3xl md:text-4xl leading-[1.05]">
            You&apos;re enrolled in the Placement Guarantee Program.
          </h1>
          <p
            className="text-sm md:text-base"
            style={{ color: "var(--fg-dim)" }}
          >
            Welcome aboard. Your enrollment is confirmed.
          </p>
        </div>
      </header>

      <section
        className="rounded-2xl p-6 md:p-8 flex flex-col gap-3"
        style={{
          background: "var(--bg-1)",
          border: "1px solid var(--border)",
        }}
      >
        <ConfirmationRow label="Payment received" />
        <ConfirmationRow label="Tax invoice generated" />
        <ConfirmationRow label="Mentor pairing within 5 business days" />
      </section>

      <section className="flex flex-col gap-4">
        <h2
          className="font-display"
          style={{ fontSize: 22, letterSpacing: "-0.01em" }}
        >
          What happens next
        </h2>
        <ol className="flex flex-col gap-4">
          {NEXT_STEPS.map((step, i) => (
            <li
              key={step.title}
              className="rounded-2xl p-5 flex gap-5 items-start"
              style={{
                background: "var(--bg-1)",
                border: "1px solid var(--border)",
              }}
            >
              <span
                className="font-mono shrink-0"
                style={{
                  color: "#cc7755",
                  fontSize: 12,
                  letterSpacing: "0.16em",
                  paddingTop: 4,
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex flex-col gap-1">
                <span
                  className="font-display"
                  style={{ fontSize: 16, color: "var(--fg)" }}
                >
                  {step.title}
                </span>
                <span
                  style={{
                    color: "var(--fg-dim)",
                    fontSize: 14,
                    lineHeight: 1.55,
                  }}
                >
                  {step.body}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col sm:flex-row gap-3 justify-center">
        <a
          href={receiptHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium"
          style={{
            background: "var(--bg-2)",
            border: "1px solid var(--border-strong)",
            color: "var(--fg)",
          }}
        >
          <DownloadIcon width={14} height={14} />
          Download Tax Invoice
        </a>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium"
          style={{ background: "#cc7755", color: "#0d1117" }}
        >
          Back to homepage
          <ArrowRightIcon width={14} height={14} />
        </Link>
      </section>

      <p
        className="text-center"
        style={{ color: "var(--fg-mute)", fontSize: 12 }}
      >
        An email with your enrollment details and tax invoice has been sent to
        your registered email.
      </p>
    </div>
  );
}

function ConfirmationRow({ label }) {
  return (
    <div className="flex items-center gap-3">
      <CheckCircleIcon
        width={18}
        height={18}
        style={{ color: "var(--accent)" }}
      />
      <span style={{ color: "var(--fg)", fontSize: 14 }}>{label}</span>
    </div>
  );
}
