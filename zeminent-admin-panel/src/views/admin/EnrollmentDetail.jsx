"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  RotateCcw,
  User,
  CreditCard,
  FileText,
  MessageSquare,
} from "lucide-react";
import toast from "react-hot-toast";

import Badge from "@/components/common/Badge";
import Button from "@/components/common/Button";
import Modal from "@/components/common/Modal";
import { Field, Textarea, Select } from "@/components/common/FormControls";
import { Spinner } from "@/components/common/Spinner";

import RefundForm from "@/components/admin/RefundForm";
import MarkAsPlacedForm from "@/components/admin/MarkAsPlacedForm";

import { placementService } from "@/api/placementService";
import { formatDate, formatPrice } from "@/utils/format";

// Slice 14 B.6: full enrollment detail. Status dropdown saves on change
// EXCEPT 'placed' which opens a modal to collect company/role/salary
// first (the backend whitelists those fields and auto-stamps placedAt
// when status flips to 'placed' — see B.4 placementEnrollmentService).
// Notes save on blur — coalesces a long edit into one PATCH rather than
// per-keystroke. Refund + mark-as-placed are both gated on the current
// status to mirror the backend's own gate logic (no point showing a
// button the server will 400 anyway).

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "placement_in_progress", label: "Placement In Progress" },
  { value: "placed", label: "Placed" },
  { value: "refund_requested", label: "Refund Requested" },
  { value: "refunded", label: "Refunded" },
  { value: "completed", label: "Completed" },
];

const STATUS_TONES = {
  active: "brand",
  placement_in_progress: "amber",
  placed: "green",
  refunded: "red",
  completed: "slate",
  refund_requested: "amber",
};

function formatStatus(s) {
  return String(s || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function EnrollmentDetail() {
  const params = useParams();
  const id = params?.id;

  const [enrollment, setEnrollment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [refundOpen, setRefundOpen] = useState(false);
  const [placedOpen, setPlacedOpen] = useState(false);

  const [savingStatus, setSavingStatus] = useState(false);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError("");
    placementService
      .getEnrollment(id)
      .then((data) => {
        const e = data?.enrollment;
        setEnrollment(e);
        setNotes(e?.notes || "");
      })
      .catch((err) => setError(err.message || "Failed to load enrollment"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(load, [load]);

  const handleStatusChange = async (newStatus) => {
    if (!enrollment || newStatus === enrollment.status) return;
    // 'placed' needs company/role/salary in the same PATCH — backend
    // accepts the bare status change, but skipping the outcome fields
    // would leave the placement card blank. Route through the modal.
    if (newStatus === "placed") {
      setPlacedOpen(true);
      return;
    }
    setSavingStatus(true);
    try {
      const result = await placementService.updateEnrollment(id, {
        status: newStatus,
      });
      setEnrollment(result.enrollment);
      toast.success("Status updated");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingStatus(false);
    }
  };

  const handleNotesSave = async () => {
    if (!enrollment || notes === (enrollment.notes || "")) return;
    setSavingNotes(true);
    try {
      const result = await placementService.updateEnrollment(id, { notes });
      setEnrollment(result.enrollment);
      toast.success("Notes saved");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleRefundSubmit = async ({ reason, notes: refundNotes }) => {
    const paymentId = enrollment.paymentId?._id || enrollment.paymentId;
    try {
      await placementService.refund({ paymentId, reason, notes: refundNotes });
      toast.success("Refund processed");
      setRefundOpen(false);
      load();
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  const handlePlacedSubmit = async ({
    placedAtCompany,
    placedAtRole,
    placedAtSalary,
  }) => {
    try {
      const result = await placementService.updateEnrollment(id, {
        status: "placed",
        placedAtCompany,
        placedAtRole,
        placedAtSalary: Number(placedAtSalary),
      });
      setEnrollment(result.enrollment);
      toast.success("Marked as placed");
      setPlacedOpen(false);
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }
  if (error || !enrollment) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error || "Enrollment not found"}
        </div>
        <Button to="/admin/enrollments" variant="ghost" icon={ArrowLeft} size="sm">
          Back to enrollments
        </Button>
      </div>
    );
  }

  const payment = enrollment.paymentId;
  const lead = enrollment.placementLeadId;
  const user = enrollment.userId;
  const isRefunded = enrollment.status === "refunded";
  // 'completed' is the terminal post-placement status — once a student
  // has been placed, neither refund nor re-mark-as-placed should fire.
  const isPlaced =
    enrollment.status === "placed" || enrollment.status === "completed";

  return (
    <div className="space-y-6">
      <div>
        <Button
          to="/admin/enrollments"
          variant="ghost"
          icon={ArrowLeft}
          size="sm"
        >
          Back to enrollments
        </Button>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {user?.name || "Unknown user"}
            </h1>
            <p className="text-sm text-slate-500">{user?.email || ""}</p>
            <p className="mt-1 text-sm text-slate-500">
              Enrolled {formatDate(enrollment.enrolledAt)}
            </p>
          </div>
          <Badge tone={STATUS_TONES[enrollment.status] || "slate"}>
            {formatStatus(enrollment.status)}
          </Badge>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => setPlacedOpen(true)}
          variant="primary"
          icon={BadgeCheck}
          disabled={isPlaced || isRefunded}
        >
          Mark as Placed
        </Button>
        <Button
          onClick={() => setRefundOpen(true)}
          variant="danger"
          icon={RotateCcw}
          disabled={isPlaced || isRefunded}
        >
          Process Refund
        </Button>
      </div>

      <section className="card p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <MessageSquare className="h-5 w-5" /> Status & Notes
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status">
            <Select
              value={enrollment.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={savingStatus}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Refund eligible until">
            <input
              type="text"
              value={formatDate(enrollment.refundEligibleUntil)}
              readOnly
              className="input-base bg-slate-50 dark:bg-slate-800/60"
              aria-readonly="true"
            />
          </Field>
        </div>
        <Field
          label="Admin notes"
          hint={savingNotes ? "Saving…" : "Saves when you click away from the field."}
          className="mt-4"
        >
          <Textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleNotesSave}
            placeholder="Internal notes about this enrollment…"
            maxLength={2000}
          />
        </Field>
      </section>

      <section className="card p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <CreditCard className="h-5 w-5" /> Payment
        </h2>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <DLRow label="Amount" value={formatPrice(payment?.amount || 0)} mono />
          <DLRow label="Status" value={payment?.paymentStatus || "—"} />
          <DLRow label="Invoice Number" value={payment?.invoiceNumber || "—"} mono />
          <DLRow
            label="Invoice Issued"
            value={payment?.invoiceIssuedAt ? formatDate(payment.invoiceIssuedAt) : "—"}
          />
          <DLRow
            label="Razorpay Payment ID"
            value={payment?.razorpayPaymentId || "—"}
            mono
            small
          />
          <DLRow
            label="Payment Method"
            value={payment?.receiptMeta?.paymentMethod || "—"}
          />
          {payment?.refund?.refundId && (
            <>
              <DLRow
                label="Refund ID"
                value={payment.refund.refundId}
                mono
                small
              />
              <DLRow
                label="Refunded At"
                value={formatDate(payment.refund.refundedAt)}
              />
              <DLRow
                label="Refund Reason"
                value={payment.refund.reason || "—"}
                wide
              />
            </>
          )}
        </dl>
      </section>

      <section className="card p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <FileText className="h-5 w-5" /> Terms Acceptance
        </h2>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <DLRow
            label="Version"
            value={enrollment.termsAccepted?.version || "—"}
            mono
          />
          <DLRow
            label="Accepted At"
            value={
              enrollment.termsAccepted?.acceptedAt
                ? formatDate(enrollment.termsAccepted.acceptedAt)
                : "—"
            }
          />
          <DLRow
            label="IP Address"
            value={enrollment.termsAccepted?.ipAddress || "—"}
            mono
            small
          />
          <DLRow
            label="User Agent"
            value={enrollment.termsAccepted?.userAgent || "—"}
            small
          />
        </dl>
      </section>

      {lead && (
        <section className="card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <User className="h-5 w-5" /> Original Lead
          </h2>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <DLRow label="Phone" value={lead.phone || "—"} />
            <DLRow
              label="Preferred Call Time"
              value={lead.preferredCallTime || "—"}
            />
            {lead.message && (
              <DLRow label="Message" value={`"${lead.message}"`} wide italic />
            )}
          </dl>
        </section>
      )}

      {isPlaced && (
        <section className="card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <BadgeCheck className="h-5 w-5 text-emerald-600" /> Placement Details
          </h2>
          <dl className="grid gap-4 text-sm sm:grid-cols-3">
            <DLRow
              label="Company"
              value={enrollment.placedAtCompany || "—"}
              bold
            />
            <DLRow
              label="Role"
              value={enrollment.placedAtRole || "—"}
              bold
            />
            <DLRow
              label="Salary"
              value={
                enrollment.placedAtSalary
                  ? formatPrice(enrollment.placedAtSalary)
                  : "—"
              }
              mono
            />
            <DLRow
              label="Placed At"
              value={enrollment.placedAt ? formatDate(enrollment.placedAt) : "—"}
              wide
            />
          </dl>
        </section>
      )}

      <Modal
        open={refundOpen}
        onClose={() => setRefundOpen(false)}
        title="Process Refund"
        size="md"
      >
        <RefundForm
          enrollment={enrollment}
          onSubmit={handleRefundSubmit}
          onCancel={() => setRefundOpen(false)}
        />
      </Modal>

      <Modal
        open={placedOpen}
        onClose={() => setPlacedOpen(false)}
        title="Mark as Placed"
        size="md"
      >
        <MarkAsPlacedForm
          onSubmit={handlePlacedSubmit}
          onCancel={() => setPlacedOpen(false)}
        />
      </Modal>
    </div>
  );
}

// Small helper to keep the definition-list rows visually consistent
// without repeating 9 nearly-identical <div><dt><dd></div> blocks.
function DLRow({ label, value, mono, small, wide, bold, italic }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <dt className="text-slate-500">{label}</dt>
      <dd
        className={[
          mono && "font-mono",
          small && "text-xs",
          bold && "font-medium",
          italic && "italic",
          "break-words",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {value}
      </dd>
    </div>
  );
}
