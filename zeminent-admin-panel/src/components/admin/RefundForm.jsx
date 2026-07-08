"use client";

import { useState } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

import Button from "@/components/common/Button";
import { Field, Textarea } from "@/components/common/FormControls";
import { formatPrice } from "@/utils/format";

// Slice 14 B.6: refund-confirmation form, rendered inside <Modal> by
// EnrollmentDetail. Owns its own form state; calls onSubmit(...) which
// the parent wires through placementService.refund — the parent is also
// responsible for the toast + the modal close on success.
//
// The parent passes errors back by re-throwing inside its onSubmit so
// the form can stop the spinner without closing. We don't render the
// error inline because the parent already pops a toast for it.
export default function RefundForm({ enrollment, onSubmit, onCancel }) {
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const amount = enrollment?.paymentId?.amount || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!reason.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({ reason: reason.trim(), notes: notes.trim() });
    } catch {
      // Parent surfaced the error via toast; just unblock the form.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="text-sm text-amber-900 dark:text-amber-200">
          <p className="font-medium">
            This will issue a full refund of {formatPrice(amount)}.
          </p>
          <p className="mt-1 text-amber-700 dark:text-amber-300/80">
            The refund is processed via Razorpay and cannot be undone. The
            enrollment status will be set to &apos;refunded&apos;.
          </p>
        </div>
      </div>

      <Field label="Refund reason" required>
        <Textarea
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. 'Student requested refund — no placement secured within 6 months'"
          required
          disabled={submitting}
          maxLength={500}
        />
      </Field>

      <Field label="Internal notes (optional)">
        <Textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any internal notes about this refund…"
          disabled={submitting}
          maxLength={2000}
        />
      </Field>

      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="danger"
          icon={RotateCcw}
          loading={submitting}
          disabled={!reason.trim()}
        >
          Refund {formatPrice(amount)}
        </Button>
      </div>
    </form>
  );
}
