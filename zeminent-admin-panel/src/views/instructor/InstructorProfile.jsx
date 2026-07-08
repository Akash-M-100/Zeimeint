"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { UploadCloud, Trash2, X, AlertCircle } from "lucide-react";

import { Field, Input, Textarea, Toggle } from "@/components/common/FormControls";
import Button from "@/components/common/Button";
import { authService } from "@/api/authService";
import { useAuth } from "@/context/AuthContext";
import { getInitials } from "@/utils/format";
import { cn } from "@/utils/cn";

// Slice 13: My Profile page for instructors. Wraps PATCH /api/auth/me and
// the avatar presign+upload flow into a single form. Save is gated on
// dirty-state diff against the last loaded user.

const BIO_MAX = 1000;
const EXPERTISE_MAX_TAGS = 20;
const EXPERTISE_MAX_TAG_LEN = 30;
const AVATAR_ACCEPT = "image/jpeg,image/png,image/webp";

// URL validator that matches the backend's express-validator `.isURL()` — empty
// string is fine (cleared field); anything non-empty must look like http(s)://...
function isValidUrl(value) {
  if (!value) return true;
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// The form state mirrors the persisted user shape but flattens defaults so
// the inputs never see `null` / `undefined`. seedFromUser maps a server doc
// → form; toPatch (in the save handler) diffs against the seed.
function seedFromUser(user) {
  return {
    name: user?.name || "",
    title: user?.title || "",
    bio: user?.bio || "",
    yearsOfExperience:
      user?.yearsOfExperience == null ? "" : String(user.yearsOfExperience),
    socialLinks: {
      linkedin: user?.socialLinks?.linkedin || "",
      twitter: user?.socialLinks?.twitter || "",
      github: user?.socialLinks?.github || "",
      website: user?.socialLinks?.website || "",
    },
    expertise: Array.isArray(user?.expertise) ? [...user.expertise] : [],
    isVisibleOnHomePage: user?.isVisibleOnHomePage !== false, // default true
  };
}

export default function InstructorProfile() {
  const { user, updateUser } = useAuth();

  const [form, setForm] = useState(() => seedFromUser(user));
  const [original, setOriginal] = useState(() => seedFromUser(user));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Avatar state:
  //   - `preview` is a blob URL for the just-picked file. Set the instant
  //     the user opens the picker so they see their photo immediately while
  //     the upload runs. Cleared on success so the render falls through to
  //     user.avatarUrl (the freshly-signed CloudFront URL the backend
  //     returns from PATCH /me, via Phase 1.5's enrichUserWithAvatarUrl).
  //   - `imgError` flips when the <img> fails to load — covers expired
  //     signed URLs, deleted S3 objects, network blips — so we fall back
  //     to the initials placeholder instead of showing a broken image.
  const [preview, setPreview] = useState(null);
  const [imgError, setImgError] = useState(false);
  const [avatarStatus, setAvatarStatus] = useState("idle"); // idle | uploading | uploaded | error
  const [avatarError, setAvatarError] = useState(null);
  const fileInputRef = useRef(null);

  // Re-seed if the auth-context user changes underneath us (e.g. after a
  // post-login bootstrap completes).
  useEffect(() => {
    setForm(seedFromUser(user));
    setOriginal(seedFromUser(user));
  }, [user]);

  // Revoke the blob URL when it's replaced or the component unmounts —
  // otherwise the browser leaks it until tab close.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  // Render priority: blob preview (mid-upload) > signed user.avatarUrl > null.
  // Computed every render so any auth-context update (updateUser, /me refetch)
  // is reflected without a separate effect to sync.
  const avatarSrc = preview || user?.avatarUrl || null;

  // Reset the img-error fallback when the source changes — a new upload or a
  // re-fetched signed URL deserves another attempt before we give up.
  useEffect(() => {
    setImgError(false);
  }, [avatarSrc]);

  const dirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(original),
    [form, original],
  );

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setSocial = (key, value) =>
    setForm((f) => ({ ...f, socialLinks: { ...f.socialLinks, [key]: value } }));

  // ── AVATAR ─────────────────────────────────────────────────────────────

  const handleAvatarPick = async (e) => {
    const file = e.target.files?.[0];
    // Reset the input so picking the same file twice still fires onChange.
    if (e.target) e.target.value = "";
    if (!file) return;

    // Show the local preview right away — the upload pipeline still runs
    // in the background. If the upload fails we clear it in the catch.
    if (preview) URL.revokeObjectURL(preview);
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setAvatarStatus("uploading");
    setAvatarError(null);

    try {
      const updated = await authService.uploadAvatar(file);
      updateUser(updated);
      // Clear the blob preview so the render falls through to
      // user.avatarUrl (now the signed CloudFront URL from PATCH /me).
      URL.revokeObjectURL(objectUrl);
      setPreview(null);
      setAvatarStatus("uploaded");
      toast.success("Avatar uploaded");
    } catch (err) {
      const message = err?.message || "Avatar upload failed";
      setAvatarError(message);
      setAvatarStatus("error");
      // Drop the preview so the UI matches the persisted state.
      URL.revokeObjectURL(objectUrl);
      setPreview(null);
      toast.error(message);
    }
  };

  const handleAvatarRemove = async () => {
    if (!user?.avatarKey) return;
    setAvatarStatus("uploading");
    setAvatarError(null);
    try {
      // null clears the field on the backend (validator's `optional({values:'falsy'})`).
      const updated = await authService.updateProfile({ avatarKey: null });
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
      setAvatarStatus("idle");
      updateUser(updated);
      toast.success("Avatar removed");
    } catch (err) {
      const message = err?.message || "Could not remove avatar";
      setAvatarError(message);
      setAvatarStatus("error");
      toast.error(message);
    }
  };

  // ── EXPERTISE TAG INPUT ────────────────────────────────────────────────

  const [tagDraft, setTagDraft] = useState("");

  const addTag = (raw) => {
    const trimmed = String(raw || "").trim();
    if (!trimmed) return;
    if (trimmed.length > EXPERTISE_MAX_TAG_LEN) {
      setErrors((e) => ({
        ...e,
        expertise: `Tags must be ${EXPERTISE_MAX_TAG_LEN} characters or fewer`,
      }));
      return;
    }
    if (form.expertise.length >= EXPERTISE_MAX_TAGS) {
      setErrors((e) => ({
        ...e,
        expertise: `At most ${EXPERTISE_MAX_TAGS} tags`,
      }));
      return;
    }
    if (form.expertise.includes(trimmed)) return; // dedupe silently
    set("expertise", [...form.expertise, trimmed]);
    setErrors((e) => ({ ...e, expertise: undefined }));
    setTagDraft("");
  };

  const removeTag = (tag) => {
    set("expertise", form.expertise.filter((t) => t !== tag));
    setErrors((e) => ({ ...e, expertise: undefined }));
  };

  const handleTagKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagDraft);
    } else if (e.key === "Backspace" && !tagDraft && form.expertise.length) {
      removeTag(form.expertise[form.expertise.length - 1]);
    }
  };

  // ── SAVE ───────────────────────────────────────────────────────────────

  // Builds the PATCH payload from only the fields that actually changed —
  // keeps the request small and lets the backend's allowlist work cleanly.
  const buildPatch = () => {
    const patch = {};
    if (form.name !== original.name) patch.name = form.name.trim();
    if (form.title !== original.title) patch.title = form.title.trim();
    if (form.bio !== original.bio) patch.bio = form.bio;
    if (form.yearsOfExperience !== original.yearsOfExperience) {
      patch.yearsOfExperience =
        form.yearsOfExperience === ""
          ? null
          : Number.parseInt(form.yearsOfExperience, 10);
    }
    if (
      JSON.stringify(form.socialLinks) !== JSON.stringify(original.socialLinks)
    ) {
      patch.socialLinks = form.socialLinks;
    }
    if (
      JSON.stringify(form.expertise) !== JSON.stringify(original.expertise)
    ) {
      patch.expertise = form.expertise;
    }
    if (form.isVisibleOnHomePage !== original.isVisibleOnHomePage) {
      patch.isVisibleOnHomePage = form.isVisibleOnHomePage;
    }
    return patch;
  };

  const validate = () => {
    const next = {};
    if (form.name.trim().length < 2 || form.name.trim().length > 60) {
      next.name = "Name must be between 2 and 60 characters";
    }
    if (form.title.length > 100) next.title = "Title must be 100 characters or fewer";
    if (form.bio.length > BIO_MAX) next.bio = `Bio must be ${BIO_MAX} characters or fewer`;
    if (form.yearsOfExperience !== "") {
      const n = Number(form.yearsOfExperience);
      if (!Number.isInteger(n) || n < 0 || n > 100) {
        next.yearsOfExperience = "Must be a whole number between 0 and 100";
      }
    }
    for (const [k, v] of Object.entries(form.socialLinks)) {
      if (!isValidUrl(v)) {
        next[`social_${k}`] = "Enter a valid URL (https://...)";
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (saving || !dirty) return;
    if (!validate()) {
      toast.error("Fix the highlighted fields and try again");
      return;
    }

    const patch = buildPatch();
    setSaving(true);
    try {
      const updated = await authService.updateProfile(patch);
      updateUser(updated);
      setOriginal(seedFromUser(updated));
      setForm(seedFromUser(updated));
      toast.success("Profile saved");
    } catch (err) {
      toast.error(err?.message || "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  // ── RENDER ─────────────────────────────────────────────────────────────

  const initials = getInitials(user?.name || "Instructor");

  return (
    <form onSubmit={handleSave} className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Public details shown on Zeminent&apos;s home page when{" "}
          <span className="font-medium">Show on home page carousel</span> is on.
        </p>
      </header>

      {/* ─── AVATAR ──────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Photo
        </h2>
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <div className="relative">
            {avatarSrc && !imgError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarSrc}
                alt={user?.name || "Avatar"}
                onError={() => setImgError(true)}
                className="h-[120px] w-[120px] rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-700"
              />
            ) : (
              <div className="grid h-[120px] w-[120px] place-items-center rounded-full bg-brand-100 text-3xl font-semibold text-brand-700 ring-2 ring-slate-200 dark:bg-brand-500/20 dark:text-brand-300 dark:ring-slate-700">
                {initials}
              </div>
            )}
            {avatarStatus === "uploading" && (
              <div className="absolute inset-0 grid place-items-center rounded-full bg-black/40 text-xs font-medium text-white">
                Uploading…
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept={AVATAR_ACCEPT}
              onChange={handleAvatarPick}
              className="sr-only"
              id="avatar-input"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarStatus === "uploading"}
              >
                <UploadCloud className="mr-2 h-4 w-4" />
                {user?.avatarKey || preview ? "Replace photo" : "Upload photo"}
              </Button>
              {user?.avatarKey && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAvatarRemove}
                  disabled={avatarStatus === "uploading"}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove
                </Button>
              )}
            </div>
            <p className="text-xs text-slate-400">
              JPG, PNG, or WebP. Up to 5MB.
            </p>
            {avatarStatus === "uploaded" && !avatarError && (
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                Uploaded ✓
              </p>
            )}
            {avatarError && (
              <p className="flex items-center gap-1.5 text-xs font-medium text-red-500">
                <AlertCircle className="h-3.5 w-3.5" />
                {avatarError}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ─── BASIC INFO ──────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Basic info
        </h2>
        <div className="space-y-4">
          <Field
            label="Display name"
            htmlFor="profile-name"
            error={errors.name}
            required
          >
            <Input
              id="profile-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              maxLength={60}
              error={errors.name}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Title"
              htmlFor="profile-title"
              error={errors.title}
              hint="e.g. Senior Instructor, Founder, Staff Engineer"
            >
              <Input
                id="profile-title"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                maxLength={100}
                error={errors.title}
              />
            </Field>
            <Field
              label="Years of experience"
              htmlFor="profile-yoe"
              error={errors.yearsOfExperience}
              hint="Leave empty if you'd rather not say"
            >
              <Input
                id="profile-yoe"
                type="number"
                min={0}
                max={100}
                step={1}
                value={form.yearsOfExperience}
                onChange={(e) => set("yearsOfExperience", e.target.value)}
                error={errors.yearsOfExperience}
              />
            </Field>
          </div>
        </div>
      </section>

      {/* ─── BIO ─────────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Bio
        </h2>
        <Field htmlFor="profile-bio" error={errors.bio}>
          <Textarea
            id="profile-bio"
            value={form.bio}
            onChange={(e) => set("bio", e.target.value)}
            maxLength={BIO_MAX}
            rows={6}
            placeholder="A short, public-facing description of who you are and what you teach."
            error={errors.bio}
          />
          <div className="mt-1 flex justify-end text-xs text-slate-400">
            {form.bio.length}/{BIO_MAX}
          </div>
        </Field>
      </section>

      {/* ─── SOCIAL ──────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Social links
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/..." },
            { key: "twitter", label: "Twitter / X", placeholder: "https://x.com/..." },
            { key: "github", label: "GitHub", placeholder: "https://github.com/..." },
            { key: "website", label: "Website", placeholder: "https://..." },
          ].map(({ key, label, placeholder }) => (
            <Field
              key={key}
              label={label}
              htmlFor={`social-${key}`}
              error={errors[`social_${key}`]}
            >
              <Input
                id={`social-${key}`}
                type="url"
                value={form.socialLinks[key]}
                onChange={(e) => setSocial(key, e.target.value)}
                placeholder={placeholder}
                error={errors[`social_${key}`]}
              />
            </Field>
          ))}
        </div>
      </section>

      {/* ─── EXPERTISE ───────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Expertise
        </h2>
        <p className="mb-3 text-xs text-slate-400">
          Press Enter or comma to add. Up to {EXPERTISE_MAX_TAGS} tags,{" "}
          {EXPERTISE_MAX_TAG_LEN} characters each.
        </p>
        <div
          className={cn(
            "flex flex-wrap items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950",
            errors.expertise && "border-red-400",
          )}
          onClick={() => document.getElementById("expertise-input")?.focus()}
        >
          {form.expertise.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-2.5 py-1 text-xs font-medium text-brand-700 dark:bg-brand-500/20 dark:text-brand-300"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                aria-label={`Remove ${tag}`}
                className="text-brand-700/70 hover:text-brand-700 dark:text-brand-300/70 dark:hover:text-brand-300"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <input
            id="expertise-input"
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={handleTagKeyDown}
            onBlur={() => addTag(tagDraft)}
            maxLength={EXPERTISE_MAX_TAG_LEN}
            placeholder={
              form.expertise.length === 0 ? "React, Node.js, AWS…" : ""
            }
            className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </div>
        {errors.expertise && (
          <p className="mt-1 text-xs font-medium text-red-500">{errors.expertise}</p>
        )}
      </section>

      {/* ─── VISIBILITY ──────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Visibility
        </h2>
        <Toggle
          checked={form.isVisibleOnHomePage}
          onChange={(v) => set("isVisibleOnHomePage", v)}
          label="Show on home page carousel"
          description="When on, your profile appears in the instructor carousel on zeminent.com."
        />
      </section>

      {/* ─── SAVE BAR ────────────────────────────────────────────────── */}
      <div className="sticky bottom-0 -mx-4 flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:-mx-6 sm:px-6">
        {dirty ? (
          <span className="text-xs text-slate-400">Unsaved changes</span>
        ) : null}
        <Button type="submit" loading={saving} disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
