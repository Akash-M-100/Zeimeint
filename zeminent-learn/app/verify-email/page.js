"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../components/AuthProvider";

const SUCCESS_REDIRECT_MS = 2000;

export default function VerifyEmailPage() {
  // useSearchParams needs a Suspense boundary; the fallback matches the
  // pending state of the inner component so the layout doesn't jump.
  return (
    <div className="min-h-screen grid place-items-center px-6 py-12 relative overflow-hidden">
      <div className="absolute inset-0 glow-radial opacity-50 pointer-events-none" />
      <div className="relative w-full max-w-md">
        <Suspense fallback={<PendingCard />}>
          <VerifyEmailInner />
        </Suspense>
      </div>
    </div>
  );
}

function VerifyEmailInner() {
  const params = useSearchParams();
  const token = params.get("token");
  const router = useRouter();
  const { refreshUser } = useAuth();

  // Status state machine: 'missing' → no token; 'pending' → request in flight;
  // 'success' → verified; 'error' → backend rejection; 'network' → fetch threw.
  const [status, setStatus] = useState(token ? "pending" : "missing");
  const [errorMessage, setErrorMessage] = useState(null);

  // React 18 Strict Mode double-mounts effects in dev, which would fire the
  // verification POST twice. The second call would always 400 (token already
  // consumed) and flash an error after success. Guard with a ref.
  const requestedRef = useRef(false);

  useEffect(() => {
    if (!token) return;
    if (requestedRef.current) return;
    requestedRef.current = true;

    (async () => {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const message =
            (Array.isArray(data?.message) ? data.message[0] : data?.message) ??
            "Invalid or expired verification link.";
          setErrorMessage(message);
          setStatus("error");
          return;
        }
        setStatus("success");
        // Best-effort: if the user is logged in in this browser, pull the
        // updated isEmailVerified flag so the post-redirect destination (and
        // the strict-verification middleware) sees them as verified. A 401
        // here is expected when the link is opened logged-out — swallow it.
        refreshUser().catch(() => {});
      } catch {
        setStatus("network");
      }
    })();
  }, [token, refreshUser]);

  // On success, auto-forward to home after a short beat so the user can read
  // the confirmation. The "Continue to home" link is the manual fallback if
  // the programmatic redirect is blocked or delayed.
  useEffect(() => {
    if (status !== "success") return;
    const id = setTimeout(() => router.replace("/"), SUCCESS_REDIRECT_MS);
    return () => clearTimeout(id);
  }, [status, router]);

  if (status === "missing") {
    return (
      <ResultCard
        tone="error"
        icon={<CrossIcon />}
        title="Missing verification token"
        message="This link looks incomplete. Open the original email from your inbox, or sign in to request a new one."
        action={{ label: "Go to sign in", href: "/login" }}
      />
    );
  }

  if (status === "pending") {
    return <PendingCard />;
  }

  if (status === "success") {
    return (
      <ResultCard
        tone="success"
        icon={<CheckIcon />}
        title="Email verified!"
        message="Your account is fully unlocked. Taking you home…"
        action={{ label: "Continue to home", href: "/" }}
      />
    );
  }

  if (status === "network") {
    return (
      <ResultCard
        tone="error"
        icon={<CrossIcon />}
        title="Something went wrong"
        message="We couldn't reach the verification service. Please check your connection and try again."
        action={{ label: "Try again", href: typeof window !== "undefined" ? window.location.href : "/login" }}
      />
    );
  }

  // status === 'error' — surface the backend's message verbatim so cases like
  // "Email already verified" read naturally without bespoke branching.
  return (
    <ResultCard
      tone="error"
      icon={<CrossIcon />}
      title="Verification failed"
      message={errorMessage ?? "Invalid or expired verification link."}
      action={{ label: "Request a new link", href: "/login" }}
    />
  );
}

function PendingCard() {
  return (
    <div className="card p-8 md:p-10 flex flex-col items-center gap-5 text-center">
      <Spinner />
      <div className="flex flex-col gap-2">
        <div className="font-mono-label">verifying</div>
        <h1 className="font-display text-3xl md:text-4xl leading-[1.05]">
          Confirming your email…
        </h1>
      </div>
      <p className="text-sm text-muted-2">This will only take a moment.</p>
    </div>
  );
}

function ResultCard({ tone, icon, title, message, action }) {
  // Token-only tinting — the icon ring picks up tone, everything else stays
  // on the neutral card surface so the page reads consistently.
  const ringClass =
    tone === "success"
      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
      : "bg-red-500/10 border-red-500/30 text-red-300";

  return (
    <div className="card p-8 md:p-10 flex flex-col items-center gap-6 text-center">
      <div
        className={`size-14 rounded-full border grid place-items-center ${ringClass}`}
      >
        {icon}
      </div>
      <div className="flex flex-col gap-2">
        <div className="font-mono-label">
          {tone === "success" ? "all set" : "something's off"}
        </div>
        <h1 className="font-display text-3xl md:text-4xl leading-[1.05]">
          {title}
        </h1>
      </div>
      <p className="text-sm text-muted-2 max-w-sm">{message}</p>
      {action ? (
        <Link
          href={action.href}
          className="mt-2 inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-2 text-bg px-5 py-3 rounded-full text-sm transition-colors"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="size-10 animate-spin text-accent-2"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="2"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
