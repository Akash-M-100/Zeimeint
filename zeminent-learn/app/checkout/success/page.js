"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircleIcon, DownloadIcon, ArrowRightIcon } from "@/app/components/Icons";

export default function CheckoutSuccessPage() {
  const router = useRouter();
  const params = useSearchParams();
  const paymentId = params.get("paymentId");

  // Defensive — landing here without a paymentId means a stray reload or a
  // bookmark. Bounce to Dashboard rather than show a broken success card.
  useEffect(() => {
    if (!paymentId) router.replace("/Dashboard");
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
    <div className="max-w-[640px] mx-auto px-6 md:px-8 py-16 flex flex-col items-center text-center gap-8">
      <span className="size-16 rounded-full grid place-items-center bg-accent-soft text-accent-2">
        <CheckCircleIcon width={32} height={32} />
      </span>

      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl md:text-4xl leading-[1.05]">
          Payment successful.
        </h1>
        <p className="text-sm md:text-base text-muted-2 max-w-md">
          Full Access is unlocked across every course on Zeminent. Your GST
          tax invoice is ready below.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
        <a
          href={receiptHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-border text-sm text-white hover:border-border-strong transition-colors"
        >
          <DownloadIcon width={14} height={14} />
          Download Tax Invoice
        </a>
        <Link
          href="/courses"
          className="inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-2 text-bg px-5 py-2.5 rounded-full text-sm font-medium transition-colors"
        >
          Start learning
          <ArrowRightIcon width={14} height={14} />
        </Link>
      </div>

      <Link
        href="/Profile?tab=account"
        className="font-mono text-[11px] uppercase tracking-wider text-muted-2 hover:text-white transition-colors"
      >
        View membership in Profile →
      </Link>

      <p className="text-xs text-muted-2 max-w-md">
        An email with your tax invoice has been sent to your registered email.
      </p>
    </div>
  );
}
