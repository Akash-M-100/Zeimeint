"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EyeIcon, EyeOffIcon } from "../../components/Icons";

const MIN_PASSWORD_LENGTH = 8;
const SUCCESS_REDIRECT_MS = 2000;

export default function ResetPasswordPage() {
  // useSearchParams requires a Suspense boundary in the App Router.
  return (
    <Suspense fallback={<CardShell title="Reset your password" />}>
      <ResetPasswordInner />
    </Suspense>
  );
}

function ResetPasswordInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");

  // 'idle' (showing the form) | 'submitting' | 'success' | 'error' | 'network'
  const [status, setStatus] = useState("idle");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [formError, setFormError] = useState(null); // client-side validation
  const [serverError, setServerError] = useState(null); // backend rejection message

  // Auto-forward to sign-in after a short beat on success; the link is the
  // manual fallback if the redirect is blocked.
  useEffect(() => {
    if (status !== "success") return;
    const id = setTimeout(() => router.replace("/login"), SUCCESS_REDIRECT_MS);
    return () => clearTimeout(id);
  }, [status, router]);

  async function onSubmit(e) {
    e.preventDefault();
    setFormError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setFormError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setFormError("Passwords don't match.");
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message =
          (Array.isArray(data?.message) ? data.message[0] : data?.message) ??
          "Invalid or expired reset link.";
        setServerError(message);
        setStatus("error");
        return;
      }
      setStatus("success");
    } catch {
      setStatus("network");
    }
  }

  if (!token) {
    return (
      <ResultCard
        tone="error"
        title="Invalid reset link"
        message="This link is missing its token. Request a fresh password reset link to continue."
        action={{ label: "Request a new link", href: "/forgot-password" }}
      />
    );
  }

  if (status === "success") {
    return (
      <ResultCard
        tone="success"
        title="Password reset"
        message="Your password has been updated. Taking you to sign in…"
        action={{ label: "Continue to sign in", href: "/login" }}
      />
    );
  }

  if (status === "error") {
    return (
      <ResultCard
        tone="error"
        title="Reset failed"
        message={serverError ?? "Invalid or expired reset link."}
        action={{ label: "Request a new link", href: "/forgot-password" }}
      />
    );
  }

  if (status === "network") {
    return (
      <ResultCard
        tone="error"
        title="Something went wrong"
        message="We couldn't reach the server. Please check your connection and try again."
        action={{ label: "Back to sign in", href: "/login" }}
      />
    );
  }

  // status === 'idle' or 'submitting' — show the form.
  const submitting = status === "submitting";
  return (
    <div className="card p-8 md:p-10 flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <div className="font-mono-label">reset password</div>
        <h1 className="font-display text-4xl md:text-5xl leading-[1.05]">
          Choose a new <span className="text-accent-2">password.</span>
        </h1>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field
          label="new password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
        />
        <Field
          label="confirm new password"
          type="password"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
        />

        {formError ? (
          <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {formError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-2 disabled:opacity-60 disabled:cursor-not-allowed text-bg px-5 py-3 rounded-full text-sm transition-colors"
        >
          {submitting ? "Resetting…" : "Reset password"}
        </button>
      </form>

      <p className="text-sm text-muted-2 text-center">
        <Link href="/login" className="text-accent-2 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

function ResultCard({ tone, title, message, action }) {
  const ringClass =
    tone === "success"
      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
      : "bg-red-500/10 border-red-500/30 text-red-300";

  return (
    <div className="card p-8 md:p-10 flex flex-col items-center gap-6 text-center">
      <div className={`size-14 rounded-full border grid place-items-center ${ringClass}`}>
        {tone === "success" ? <CheckIcon /> : <CrossIcon />}
      </div>
      <div className="flex flex-col gap-2">
        <div className="font-mono-label">
          {tone === "success" ? "all set" : "something's off"}
        </div>
        <h1 className="font-display text-3xl md:text-4xl leading-[1.05]">{title}</h1>
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

function CardShell({ title }) {
  return (
    <div className="card p-8 md:p-10 flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <div className="font-mono-label">reset password</div>
        <h1 className="font-display text-4xl md:text-5xl leading-[1.05]">{title}</h1>
      </div>
    </div>
  );
}

function Field({ label, type, value, onChange, autoComplete, required, minLength }) {
  const [reveal, setReveal] = useState(false);
  const isPassword = type === "password";
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono-label">{label}</span>
      <div className="relative">
        <input
          type={isPassword && reveal ? "text" : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          className={`w-full bg-card-2 border border-border focus:border-accent-2 focus:outline-none rounded-lg px-3.5 py-2.5 ${isPassword ? "pr-11" : ""} text-sm text-white placeholder:text-muted transition-colors`}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            aria-label={reveal ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 grid place-items-center px-3 text-muted-2 hover:text-white transition-colors"
          >
            {reveal ? <EyeOffIcon width={16} height={16} /> : <EyeIcon width={16} height={16} />}
          </button>
        ) : null}
      </div>
    </label>
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
