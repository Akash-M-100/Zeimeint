"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../../components/AuthProvider";
import { EyeIcon, EyeOffIcon } from "../../components/Icons";

export default function RegisterPage() {
  const router = useRouter();
  const { register, status, user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Already-logged-in users who land on /register get routed by verification
  // state, not blindly to /Dashboard (strict-verification contract).
  useEffect(() => {
    if (status !== "authenticated") return;
    router.replace(user?.isEmailVerified ? "/" : "/verify-email-pending");
  }, [status, user, router]);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setSubmitting(true);
    try {
      // A freshly registered email/password user is always unverified.
      await register(name, email, password);
      router.replace("/verify-email-pending");
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="card p-8 md:p-10 flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <div className="font-mono-label">get started</div>
        <h1 className="font-display text-4xl md:text-5xl leading-[1.05]">
          Create your <span className="text-accent-2">account.</span>
        </h1>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field
          label="name"
          type="text"
          value={name}
          onChange={setName}
          autoComplete="name"
          required
        />
        <Field
          label="email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          required
        />
        <Field
          label="password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          minLength={8}
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
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      <OAuthButtons />

      <p className="text-sm text-muted-2 text-center">
        Already have one?{" "}
        <Link href="/login" className="text-accent-2 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

function OAuthButtons() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 text-muted-2">
        <span className="h-px flex-1 bg-border" />
        <span className="font-mono-label text-xs">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <a
        href="/api/auth/google/start"
        className="inline-flex items-center justify-center gap-2 bg-card-2 hover:bg-card border border-border text-white px-5 py-3 rounded-full text-sm transition-colors"
      >
        Continue with Google
      </a>
      <a
        href="/api/auth/github/start"
        className="inline-flex items-center justify-center gap-2 bg-card-2 hover:bg-card border border-border text-white px-5 py-3 rounded-full text-sm transition-colors"
      >
        Continue with GitHub
      </a>
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
