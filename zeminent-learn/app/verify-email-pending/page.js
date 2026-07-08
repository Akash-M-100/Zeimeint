"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../components/AuthProvider";

const RESEND_COOLDOWN_SECONDS = 60;
const TOAST_DURATION_MS = 3000;

export default function VerifyEmailPendingPage() {
  const router = useRouter();
  const { user, status, logout } = useAuth();

  const [resending, setResending] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [toast, setToast] = useState(null);

  // Mount guards. Middleware already enforces these server-side, but the auth
  // state can change client-side (e.g. user verifies in another tab and this
  // tab's refresh flips isEmailVerified), so we mirror the rules here too.
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    } else if (status === "authenticated" && user?.isEmailVerified === true) {
      router.replace("/");
    }
  }, [status, user, router]);

  // Cooldown countdown. Cleanup matters — the interval must stop when the
  // component unmounts on redirect.
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const id = setInterval(() => {
      setCooldownSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownSeconds]);

  // Auto-dismiss the toast; a fresh timer per toast.
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => clearTimeout(id);
  }, [toast]);

  const handleResend = useCallback(async () => {
    setResending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setToast({ tone: "success", message: "Verification email sent. Check your inbox." });
        setCooldownSeconds(RESEND_COOLDOWN_SECONDS);
      } else if (res.status === 429) {
        setToast({ tone: "error", message: "Please wait before requesting another email." });
      } else {
        const message =
          (Array.isArray(data?.message) ? data.message[0] : data?.message) ??
          "Couldn't send the verification email. Please try again.";
        setToast({ tone: "error", message });
      }
    } catch {
      setToast({ tone: "error", message: "Network error — please try again." });
    } finally {
      setResending(false);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    await logout();
    router.replace("/login");
  }, [logout, router]);

  // While auth is resolving, or while a redirect is queued, render nothing
  // to avoid flashing the page at users who shouldn't see it.
  if (status !== "authenticated" || user?.isEmailVerified === true) {
    return (
      <div className="min-h-screen grid place-items-center px-6 py-12 relative overflow-hidden">
        <div className="absolute inset-0 glow-radial opacity-50 pointer-events-none" />
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center px-6 py-12 relative overflow-hidden">
      <div className="absolute inset-0 glow-radial opacity-50 pointer-events-none" />
      <div className="relative w-full max-w-md">
        <div className="card p-8 md:p-10 flex flex-col gap-7">
          <div className="flex flex-col gap-2">
            <div className="font-mono-label">almost there</div>
            <h1 className="font-display text-4xl md:text-5xl leading-[1.05]">
              Check your <span className="text-accent-2">email.</span>
            </h1>
          </div>

          <p className="text-sm text-muted-2 leading-relaxed">
            We sent a verification link to{" "}
            <span className="text-white">{user.email}</span>. Click the link to
            activate your account.
          </p>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending || cooldownSeconds > 0}
            className="inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-2 disabled:opacity-60 disabled:cursor-not-allowed text-bg px-5 py-3 rounded-full text-sm transition-colors"
          >
            {resending
              ? "Sending…"
              : cooldownSeconds > 0
                ? `Wait ${cooldownSeconds}s`
                : "Resend verification"}
          </button>

          <p className="text-sm text-muted-2 text-center">
            Wrong email?{" "}
            <button
              type="button"
              onClick={handleLogout}
              className="text-accent-2 hover:underline"
            >
              Log out
            </button>
          </p>
        </div>
      </div>

      {toast ? (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full border text-sm shadow-lg ${
            toast.tone === "success"
              ? "bg-card border-border-strong text-white"
              : "bg-red-500/10 border-red-500/30 text-red-200"
          }`}
          role="status"
        >
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}
