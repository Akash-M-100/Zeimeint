"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "../../components/AuthProvider";

// Slice 14 B.5: gates the placement-program checkout surface. Unlike the
// Slice 12 checkout layout (which bounces Full-Access holders away), this
// layout EXPECTS the caller to be Full-Access — that's the eligibility
// condition — so we go via /api/placement-program/eligibility instead of
// reading user.hasFullAccess directly. The eligibility endpoint can also
// surface "already enrolled" reasons in the future without us re-coding the
// gate. createOrder still 409s if there's an active enrollment, so the
// page-level error path is the second line of defence.
export default function PlacementCheckoutLayout({ children }) {
  const router = useRouter();
  const { status } = useAuth();
  const [eligibility, setEligibility] = useState(null); // null while loading
  const [eligibilityError, setEligibilityError] = useState(null);

  // Step 1: redirect unauthenticated callers BEFORE we hit the eligibility
  // endpoint (which would 401 + waste a roundtrip).
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?from=/placement-program/checkout");
    }
  }, [status, router]);

  // Step 2: server re-checks eligibility on the order side too, but bouncing
  // ineligible callers here gives them a useful landing (the program page's
  // banner explains why) instead of a generic checkout error.
  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    fetch("/api/placement-program/eligibility", { cache: "no-store" })
      .then(async (r) => {
        const json = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(json?.message || "Eligibility check failed");
        return json?.data || { eligible: false };
      })
      .then((data) => {
        if (cancelled) return;
        setEligibility(data);
        if (!data.eligible) {
          router.replace("/placement-program");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setEligibilityError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [status, router]);

  if (status !== "authenticated" || (eligibility === null && !eligibilityError)) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="font-mono-label">loading…</div>
      </div>
    );
  }

  // Eligibility fetch failed — show the error rather than silently bouncing.
  // The user can retry by refreshing or going back to the landing page.
  if (eligibilityError) {
    return (
      <div className="min-h-screen grid place-items-center px-6">
        <div
          className="rounded-2xl p-6 max-w-md text-center"
          style={{ background: "var(--bg-1)", border: "1px solid var(--border)" }}
        >
          <p style={{ color: "var(--fg-dim)", fontSize: 14, marginBottom: 16 }}>
            Could not check your eligibility: {eligibilityError}
          </p>
          <Link
            href="/placement-program"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium"
            style={{
              background: "var(--bg-2)",
              border: "1px solid var(--border-strong)",
              color: "var(--fg)",
            }}
          >
            Back to program page
          </Link>
        </div>
      </div>
    );
  }

  // Layout chrome — minimal header like /checkout/layout.js. The Cancel link
  // goes back to the landing page (not Dashboard) so the user can re-read
  // the program details without losing their place.
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-bg/95 backdrop-blur border-b border-border">
        <div className="max-w-[1100px] mx-auto px-8 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center hover:opacity-80 transition-opacity"
            aria-label="Zeminent — back to home"
          >
            <Image
              src="/zeminent-logo-v3.png"
              alt="Zeminent"
              width={114}
              height={25}
              priority
              className="h-6 w-auto brand-logo"
            />
          </Link>
          <Link
            href="/placement-program"
            className="font-mono text-[11px] uppercase tracking-wider text-muted-2 hover:text-white transition-colors"
          >
            ← Cancel
          </Link>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
