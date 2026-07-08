"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message =
          (Array.isArray(data?.message) ? data.message[0] : data?.message) ??
          "Something went wrong. Please try again.";
        setError(message);
        setSubmitting(false);
        return;
      }
      // Backend is anti-enumeration: a 2xx means "request accepted", not
      // "email exists". Show the same generic confirmation either way.
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="card p-8 md:p-10 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="font-mono-label">check your inbox</div>
          <h1 className="font-display text-4xl md:text-5xl leading-[1.05]">
            Reset link <span className="text-accent-2">sent.</span>
          </h1>
        </div>
        <p className="text-sm text-muted-2 leading-relaxed">
          If an account exists for{" "}
          <span className="text-white">{email}</span>, we&apos;ve sent a password
          reset link. Check your inbox — the link expires in 1 hour.
        </p>
        <p className="text-sm text-muted-2 text-center">
          <Link href="/login" className="text-accent-2 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="card p-8 md:p-10 flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <div className="font-mono-label">forgot password</div>
        <h1 className="font-display text-4xl md:text-5xl leading-[1.05]">
          Reset your <span className="text-accent-2">password.</span>
        </h1>
        <p className="text-sm text-muted-2">
          Enter your email and we&apos;ll send you a link to set a new password.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field
          label="email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          required
        />

        {error ? (
          <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-2 disabled:opacity-60 disabled:cursor-not-allowed text-bg px-5 py-3 rounded-full text-sm transition-colors"
        >
          {submitting ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <p className="text-sm text-muted-2 text-center">
        Remembered it?{" "}
        <Link href="/login" className="text-accent-2 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

function Field({ label, type, value, onChange, autoComplete, required }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono-label">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        className="bg-card-2 border border-border focus:border-accent-2 focus:outline-none rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-muted transition-colors"
      />
    </label>
  );
}
