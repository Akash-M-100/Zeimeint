"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { settingsSections } from "@/app/data/mockData";
import { useAuth } from "@/app/components/AuthProvider";
import { EyeIcon, EyeOffIcon } from "@/app/components/Icons";

const TABS = [
  { id: "account", label: "Account" },
  { id: "password", label: "Password" },
  { id: "preferences", label: "Preferences" },
  { id: "receipts", label: "Receipts" },
];

const MIN_PASSWORD_LENGTH = 8;
const TOAST_AUTO_CLEAR_MS = 3500;

function TabBar({ activeTab }) {
  return (
    <nav className="flex items-center gap-1 border-b border-border" role="tablist">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <Link
            key={tab.id}
            href={`/Profile?tab=${tab.id}`}
            scroll={false}
            role="tab"
            aria-selected={isActive}
            className={[
              "px-4 py-2.5 text-xs font-mono uppercase tracking-wider transition-colors border-b-2 -mb-px",
              isActive
                ? "text-accent-2 border-accent-2"
                : "text-muted-2 hover:text-white border-transparent",
            ].join(" ")}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

function ComingSoonBadge() {
  return (
    <span className="font-mono uppercase text-[10px] tracking-wider px-2 py-0.5 rounded-full border border-border text-muted-2">
      coming soon
    </span>
  );
}

function FieldRow({ label, value, action }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
      <span className="text-sm text-muted-2">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm text-white font-mono">{value || "—"}</span>
        {action}
      </div>
    </div>
  );
}

// Inline status pill rendered beneath form sections. Tone styling mirrors the
// reset-password page's error pill so success / failure feel consistent
// across the auth surfaces.
function InlineToast({ tone, message }) {
  const toneCls =
    tone === "success"
      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
      : "bg-red-500/10 border-red-500/30 text-red-300";
  return (
    <div className={`text-sm px-3 py-2 rounded-lg border ${toneCls}`}>
      {message}
    </div>
  );
}

// Common auto-clear behavior: whenever `toast` changes to a truthy value,
// schedule it to clear after a few seconds. Cleared toasts simply do nothing.
function useAutoClearToast(toast, setToast) {
  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(null), TOAST_AUTO_CLEAR_MS);
    return () => clearTimeout(id);
  }, [toast, setToast]);
}

function AccountTab() {
  const { user, updateProfile, logout } = useAuth();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  useAutoClearToast(toast, setToast);

  const fullName = user?.name ?? "Student";
  const email = user?.email ?? "—";
  // No explicit handle on the user model — derive from the email's local part
  // so it stays personal without an extra DB field.
  const handle = user?.email ? `@${user.email.split("@")[0]}` : "—";
  // Slice 11: package membership state. Date is defensive — legacy users who
  // were granted access before fullAccessGrantedAt existed will show without
  // a date suffix rather than "(since Invalid Date)".
  const hasFullAccess = Boolean(user?.hasFullAccess);
  const grantedAt = user?.fullAccessGrantedAt
    ? new Date(user.fullAccessGrantedAt)
    : null;
  const membershipValue = hasFullAccess
    ? grantedAt && !Number.isNaN(grantedAt.getTime())
      ? `Full Access (since ${grantedAt.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })})`
      : "Full Access"
    : "Locked";
  const membershipAction = hasFullAccess ? null : (
    <Link
      href="/courses"
      className="font-mono uppercase text-[10px] tracking-wider px-2 py-0.5 rounded-full border border-accent-2/30 text-accent-2 bg-accent-soft hover:border-accent-2 transition-colors"
    >
      Get Full Access (₹39,999)
    </Link>
  );

  const startEdit = () => {
    setDraftName(fullName);
    setEditing(true);
    setToast(null);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraftName("");
  };

  const saveEdit = async () => {
    const trimmed = draftName.trim();
    if (trimmed.length < 2 || trimmed.length > 60) {
      setToast({ tone: "error", message: "Name must be 2-60 characters." });
      return;
    }
    if (trimmed === fullName) {
      // No change — exit edit mode silently rather than firing a sync request.
      cancelEdit();
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ name: trimmed });
      setToast({ tone: "success", message: "Profile updated." });
      setEditing(false);
    } catch (err) {
      setToast({
        tone: "error",
        message: err?.message || "Failed to update profile.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <section className="card p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl">Account</h2>
        <span className="font-mono-label">account</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
        {/* Full name — inline editable; doesn't reuse FieldRow because the edit
            state needs to swap out both the value and the action atomically. */}
        <div className="flex items-start justify-between gap-3 py-3 border-b border-border last:border-b-0">
          <span className="text-sm text-muted-2 shrink-0 mt-1.5">Full name</span>
          {editing ? (
            <div className="flex items-center gap-2 flex-1 min-w-0 justify-end flex-wrap">
              <input
                type="text"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                minLength={2}
                maxLength={60}
                disabled={saving}
                autoFocus
                aria-label="Full name"
                className="flex-1 min-w-0 max-w-[14rem] bg-card-2 border border-border focus:border-accent-2 focus:outline-none rounded-lg px-3 py-1.5 text-sm text-white font-mono transition-colors"
              />
              <button
                type="button"
                onClick={saveEdit}
                disabled={saving}
                className="font-mono uppercase text-[10px] tracking-wider px-2.5 py-1 rounded-full bg-accent text-bg hover:bg-accent-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? "saving…" : "save"}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                disabled={saving}
                className="font-mono uppercase text-[10px] tracking-wider px-2.5 py-1 rounded-full border border-border text-muted-2 hover:text-white hover:border-border-strong disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-white font-mono">{fullName}</span>
              <button
                type="button"
                onClick={startEdit}
                className="font-mono uppercase text-[10px] tracking-wider px-2 py-0.5 rounded-full border border-border text-muted-2 hover:text-white hover:border-border-strong transition-colors"
              >
                edit
              </button>
            </div>
          )}
        </div>
        <FieldRow label="Email" value={email} />
        <FieldRow label="Display handle" value={handle} />
        <FieldRow
          label="Membership"
          value={membershipValue}
          action={membershipAction}
        />
      </div>

      {toast && <InlineToast tone={toast.tone} message={toast.message} />}

      <div className="mt-4 pt-6 border-t border-border">
        <button
          type="button"
          onClick={handleSignOut}
          className="text-sm text-rose-400 hover:text-rose-300 transition-colors"
        >
          Sign out of this device
        </button>
      </div>
    </section>
  );
}

function PasswordField({ label, value, onChange, autoComplete, minLength }) {
  const [reveal, setReveal] = useState(false);
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono-label">{label}</span>
      <div className="relative">
        <input
          type={reveal ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          minLength={minLength}
          required
          className="w-full bg-card-2 border border-border focus:border-accent-2 focus:outline-none rounded-lg px-3.5 py-2.5 pr-11 text-sm text-white placeholder:text-muted transition-colors"
        />
        <button
          type="button"
          onClick={() => setReveal((v) => !v)}
          aria-label={reveal ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 grid place-items-center px-3 text-muted-2 hover:text-white transition-colors"
        >
          {reveal ? <EyeOffIcon width={16} height={16} /> : <EyeIcon width={16} height={16} />}
        </button>
      </div>
    </label>
  );
}

function PasswordTab() {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  useAutoClearToast(toast, setToast);

  const allFilled = currentPassword && newPassword && confirmPassword;

  const onSubmit = async (e) => {
    e.preventDefault();
    setToast(null);

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setToast({
        tone: "error",
        message: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      });
      return;
    }
    if (newPassword === currentPassword) {
      setToast({
        tone: "error",
        message: "New password must differ from current password.",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setToast({
        tone: "error",
        message: "New password and confirmation don't match.",
      });
      return;
    }

    setSubmitting(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setToast({ tone: "success", message: "Password changed successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setToast({
        tone: "error",
        message: err?.message || "Failed to change password.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="card p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Change your password</h2>
          <span className="font-mono-label">password</span>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4 max-w-md">
          <PasswordField
            label="current password"
            value={currentPassword}
            onChange={setCurrentPassword}
            autoComplete="current-password"
          />
          <PasswordField
            label="new password"
            value={newPassword}
            onChange={setNewPassword}
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
          />
          <PasswordField
            label="confirm new password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
          />

          {toast && <InlineToast tone={toast.tone} message={toast.message} />}

          <button
            type="submit"
            disabled={!allFilled || submitting}
            className="self-start mt-2 inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-2 disabled:opacity-60 disabled:cursor-not-allowed text-bg px-5 py-2.5 rounded-full text-sm font-medium transition-colors"
          >
            {submitting ? "Saving…" : "Change password"}
          </button>
        </form>
      </section>

      <Link
        href="/forgot-password"
        className="self-start inline-flex items-center gap-2 text-sm text-accent-2 hover:text-white transition-colors"
      >
        Forgot your password? Reset via email →
      </Link>
    </div>
  );
}

function PreferencesTab() {
  // Render the Learning + Notifications sections from the mock data. Every
  // value is a placeholder today (none of these persist anywhere), so each
  // one carries an explicit "coming soon" badge to set expectations.
  const placeholderSections = settingsSections.filter(
    (s) => s.id === "learning" || s.id === "notifications",
  );

  return (
    <div className="flex flex-col gap-6">
      {placeholderSections.map((section) => (
        <section key={section.id} className="card p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl">{section.title}</h2>
            <span className="font-mono-label">{section.id}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {section.fields.map((field) => (
              <FieldRow
                key={field.label}
                label={field.label}
                value={field.value}
                action={<ComingSoonBadge />}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// Slice 12: lists the viewer's captured payments and surfaces a "Download"
// link per row that streams the PDF receipt from the backend (via the BFF
// proxy that preserves Content-Disposition). Loads lazily — the fetch only
// fires when this tab mounts, not on every Profile page render.
function ReceiptsTab() {
  const [payments, setPayments] = useState(null); // null = loading
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    fetch("/api/payments/me", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error("Could not load payment history");
        return r.json();
      })
      .then((d) => {
        if (active) setPayments(d.data?.payments || []);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return (
      <section className="card p-6">
        <p className="text-red-300">{error}</p>
      </section>
    );
  }

  if (payments === null) {
    return (
      <section className="card p-6">
        <p className="text-muted">Loading payment history…</p>
      </section>
    );
  }

  if (payments.length === 0) {
    return (
      <section className="card p-6 flex flex-col gap-2">
        <h2 className="font-display text-2xl">Receipts</h2>
        <p className="text-sm text-muted-2">
          No payments yet. Receipts will appear here after your first purchase.
        </p>
      </section>
    );
  }

  return (
    <section className="card p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl">Receipts</h2>
        <span className="font-mono-label">receipts</span>
      </div>
      <ul className="flex flex-col divide-y divide-border">
        {payments.map((p) => {
          const paidAt = p.receiptMeta?.paidAt || p.createdAt;
          const dateLabel = paidAt
            ? new Date(paidAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "—";
          return (
            <li
              key={p._id}
              className="flex items-center justify-between py-3 gap-3"
            >
              <div className="min-w-0">
                <div className="text-sm text-white font-mono">
                  {p.receiptNumber || "—"}
                </div>
                <div className="font-mono text-[11px] text-muted-2 mt-0.5">
                  {dateLabel}
                  {p.receiptMeta?.paymentMethod && (
                    <> · {p.receiptMeta.paymentMethod.toUpperCase()}</>
                  )}
                  {" · ₹"}
                  {Number(p.amount).toLocaleString("en-IN")}
                </div>
              </div>
              <a
                href={`/api/payments/receipt/${p._id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono uppercase text-[10px] tracking-wider px-3 py-1.5 rounded-full border border-accent-2/30 text-accent-2 bg-accent-soft hover:border-accent-2 transition-colors shrink-0"
              >
                Download
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function ProfilePage() {
  const searchParams = useSearchParams();
  const requested = searchParams.get("tab");
  const activeTab = TABS.some((t) => t.id === requested) ? requested : "account";

  return (
    <div className="max-w-[1100px] mx-auto px-8 py-10 flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <div className="font-mono-label">profile</div>
        <h1 className="font-display text-4xl md:text-5xl leading-[1.05]">
          Profile.
        </h1>
      </header>

      <TabBar activeTab={activeTab} />

      <div>
        {activeTab === "account" && <AccountTab />}
        {activeTab === "password" && <PasswordTab />}
        {activeTab === "preferences" && <PreferencesTab />}
        {activeTab === "receipts" && <ReceiptsTab />}
      </div>
    </div>
  );
}
