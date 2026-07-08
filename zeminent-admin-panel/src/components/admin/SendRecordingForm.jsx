"use client";

import { useState } from "react";
import { Video } from "lucide-react";

import Button from "@/components/common/Button";
import { Field, Input, Toggle } from "@/components/common/FormControls";

// Slice 16.5c: modal body for POST /api/live-classes/:id/send-recording.
// The toggle defaults to ON because the typical use is "session ended,
// share the recording with attendees." Admin can flip it off to backfill
// a URL silently (audit / re-review scenarios).
export default function SendRecordingForm({ occurrence, onSubmit, onCancel }) {
  const [recordingUrl, setRecordingUrl] = useState(occurrence?.recordingUrl || "");
  const [notify, setNotify] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const isValidUrl = (() => {
    const trimmed = recordingUrl.trim();
    if (!trimmed) return false;
    try {
      // eslint-disable-next-line no-new
      new URL(trimmed);
      return true;
    } catch {
      return false;
    }
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValidUrl || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({ recordingUrl: recordingUrl.trim(), notify });
    } catch {
      // Parent surfaces a toast; we just clear the spinner.
    } finally {
      setSubmitting(false);
    }
  };

  const hasExisting = Boolean(occurrence?.recordingUrl);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        {hasExisting
          ? "Update the recording URL for this session. If 'Notify attendees' stays on, they'll receive a new email."
          : "Paste the recording URL for this session. By default, attendees will be emailed the link."}
      </p>

      <Field label="Recording URL" required>
        <Input
          type="url"
          value={recordingUrl}
          onChange={(e) => setRecordingUrl(e.target.value)}
          placeholder="https://drive.google.com/...   or   https://youtu.be/..."
          disabled={submitting}
          required
        />
      </Field>

      <Field label="Notify attendees">
        <Toggle
          checked={notify}
          onChange={(v) => setNotify(v)}
          disabled={submitting}
          label={notify ? "Email attendees the recording link" : "Save URL only (no email)"}
        />
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
          icon={Video}
          loading={submitting}
          disabled={!isValidUrl}
        >
          {notify ? "Save & send" : "Save URL"}
        </Button>
      </div>
    </form>
  );
}
