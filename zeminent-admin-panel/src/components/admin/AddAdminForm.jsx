"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";

import Button from "@/components/common/Button";
import { Field, Input } from "@/components/common/FormControls";

// Modal body for /admin/admins → Add Admin. Client-side validation mirrors
// the backend's createAdminValidator (min 8 chars, ≥1 uppercase, ≥1 digit)
// so users see issues inline before submit. Backend re-validates and is
// the source of truth — this just spares a roundtrip for obvious errors.
export default function AddAdminForm({ onSubmit, onCancel }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const passwordIssues = (() => {
    const issues = [];
    if (password.length < 8) issues.push("at least 8 characters");
    if (!/[A-Z]/.test(password)) issues.push("at least 1 uppercase letter");
    if (!/\d/.test(password)) issues.push("at least 1 number");
    return issues;
  })();

  // Email regex is intentionally loose — type=email already does HTML5
  // checking; the server is the source of truth. We just want to gate
  // the submit button on obvious garbage.
  const isValid =
    name.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    passwordIssues.length === 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
    } catch {
      // Parent toasts the backend error (e.g. 409 duplicate email).
      // Keep the form mounted so the user can correct + retry.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Create a new admin account. The new admin will have full access to
        this panel and can be revoked at any time.
      </p>

      <Field label="Full name" required>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Riya Patel"
          disabled={submitting}
          minLength={2}
          maxLength={100}
          required
          autoFocus
        />
      </Field>

      <Field label="Email" required>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="riya@zeminent.com"
          disabled={submitting}
          required
        />
      </Field>

      <Field label="Password" required>
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 chars, 1 uppercase, 1 number"
            disabled={submitting}
            minLength={8}
            maxLength={100}
            required
            className="pr-16"
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        {password && passwordIssues.length > 0 && (
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
            Password needs: {passwordIssues.join(", ")}
          </p>
        )}
      </Field>

      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          icon={UserPlus}
          loading={submitting}
          disabled={!isValid}
        >
          Create admin
        </Button>
      </div>
    </form>
  );
}
