"use client";

import { useState } from "react";
import {
  Field,
  Input,
  Textarea,
  Select,
  Toggle,
} from "@/components/common/FormControls";
import Button from "@/components/common/Button";
import { LIVE_CLASS_CATEGORIES } from "@/config/constants";

/**
 * Convert an ISO date string (UTC) to the `YYYY-MM-DDTHH:mm` value expected by
 * <input type="datetime-local">. We render the wall-clock time the admin sees
 * in their local zone — the inverse `toIso` re-applies the local zone.
 */
function isoToLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function localInputToIso(value) {
  if (!value) return "";
  // The browser interprets datetime-local as the user's local zone, which is
  // exactly what we want for "starts at 5pm my time".
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

const DEFAULT_VALUES = {
  title: "",
  description: "",
  instructor: "",
  category: "General",
  startTime: "",
  durationMinutes: 60,
  meetingUrl: "",
  thumbnail: "",
  isPublished: true,
  statusOverride: "none",
};

export default function LiveClassForm({
  initialValues = {},
  onSubmit,
  loading = false,
  submitLabel = "Save",
  onCancel,
  showCancelToggle = false,
}) {
  const [form, setForm] = useState({
    ...DEFAULT_VALUES,
    ...initialValues,
    startTime: isoToLocalInput(initialValues.startTime),
    durationMinutes:
      initialValues.durationMinutes ?? DEFAULT_VALUES.durationMinutes,
  });
  const [errors, setErrors] = useState({});

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const validate = () => {
    const next = {};
    if (!form.title.trim()) next.title = "Title is required";
    else if (form.title.length > 150) next.title = "Max 150 characters";
    if (!form.description.trim())
      next.description = "Description is required";
    if (!form.instructor.trim())
      next.instructor = "Instructor name is required";
    if (!form.startTime) next.startTime = "Start time is required";
    const duration = Number(form.durationMinutes);
    if (!Number.isFinite(duration) || duration < 5 || duration > 600) {
      next.durationMinutes = "Duration must be 5–600 minutes";
    }
    if (!form.meetingUrl.trim()) next.meetingUrl = "Meeting URL is required";
    else if (!/^https?:\/\//i.test(form.meetingUrl.trim()))
      next.meetingUrl = "Must start with http:// or https://";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      instructor: form.instructor.trim(),
      category: form.category || "General",
      startTime: localInputToIso(form.startTime),
      durationMinutes: Number(form.durationMinutes),
      meetingUrl: form.meetingUrl.trim(),
      thumbnail: form.thumbnail.trim(),
      isPublished: Boolean(form.isPublished),
    };
    if (showCancelToggle) payload.statusOverride = form.statusOverride;

    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field label="Session title" htmlFor="title" error={errors.title} required>
        <Input
          id="title"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="e.g. useEffect deep dive"
          error={errors.title}
        />
      </Field>

      <Field
        label="Description"
        htmlFor="description"
        error={errors.description}
        required
      >
        <Textarea
          id="description"
          rows={4}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="What will students cover? Who is it for?"
          error={errors.description}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Instructor"
          htmlFor="instructor"
          error={errors.instructor}
          required
        >
          <Input
            id="instructor"
            value={form.instructor}
            onChange={(e) => set("instructor", e.target.value)}
            placeholder="Anika Rao"
            error={errors.instructor}
          />
        </Field>

        <Field label="Category" htmlFor="category">
          <Select
            id="category"
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
          >
            {LIVE_CLASS_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Start time"
          htmlFor="startTime"
          error={errors.startTime}
          hint="Uses your local time zone."
          required
        >
          <Input
            id="startTime"
            type="datetime-local"
            value={form.startTime}
            onChange={(e) => set("startTime", e.target.value)}
            error={errors.startTime}
          />
        </Field>

        <Field
          label="Duration (minutes)"
          htmlFor="durationMinutes"
          error={errors.durationMinutes}
          required
        >
          <Input
            id="durationMinutes"
            type="number"
            min="5"
            max="600"
            step="5"
            value={form.durationMinutes}
            onChange={(e) => set("durationMinutes", e.target.value)}
            error={errors.durationMinutes}
          />
        </Field>
      </div>

      <Field
        label="Meeting URL"
        htmlFor="meetingUrl"
        error={errors.meetingUrl}
        hint="Zoom, Google Meet, or any join link."
        required
      >
        <Input
          id="meetingUrl"
          type="url"
          value={form.meetingUrl}
          onChange={(e) => set("meetingUrl", e.target.value)}
          placeholder="https://meet.google.com/abc-defg-hij"
          error={errors.meetingUrl}
        />
      </Field>

      <Field
        label="Thumbnail URL"
        htmlFor="thumbnail"
        hint="Optional image URL shown on the student card."
      >
        <Input
          id="thumbnail"
          type="url"
          value={form.thumbnail}
          onChange={(e) => set("thumbnail", e.target.value)}
          placeholder="https://res.cloudinary.com/..."
        />
      </Field>

      <Field label="Visibility">
        <Toggle
          checked={form.isPublished}
          onChange={(v) => set("isPublished", v)}
          label={form.isPublished ? "Published" : "Draft"}
          description="Published sessions appear in the student schedule."
        />
      </Field>

      {showCancelToggle && (
        <Field label="Cancel session">
          <Toggle
            checked={form.statusOverride === "cancelled"}
            onChange={(v) =>
              set("statusOverride", v ? "cancelled" : "none")
            }
            label={
              form.statusOverride === "cancelled"
                ? "Cancelled"
                : "Active"
            }
            description="Cancelled sessions remain visible but cannot be joined."
          />
        </Field>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
