"use client";

import { useState } from "react";
import { BadgeCheck } from "lucide-react";

import Button from "@/components/common/Button";
import { Field, Input } from "@/components/common/FormControls";

// Slice 14 B.6: collects placement outcome fields when an admin marks
// an enrollment as 'placed'. EnrollmentDetail wires this through the
// same PATCH /enrollments/:id endpoint with all four fields in one
// payload — the backend whitelists them (placement.enrollment.service)
// and auto-stamps `placedAt` server-side on the status transition.
export default function MarkAsPlacedForm({ onSubmit, onCancel }) {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [salary, setSalary] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isValid =
    company.trim() && role.trim() && salary !== "" && Number(salary) > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({
        placedAtCompany: company.trim(),
        placedAtRole: role.trim(),
        placedAtSalary: salary,
      });
    } catch {
      // Parent toast-surfaced; just unblock.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Mark this student as successfully placed. This sets the status to
        &apos;placed&apos; and stamps the placement date.
      </p>

      <Field label="Company" required>
        <Input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="e.g. Acme Corp"
          disabled={submitting}
          maxLength={200}
          required
        />
      </Field>

      <Field label="Role" required>
        <Input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="e.g. Software Engineer L1"
          disabled={submitting}
          maxLength={200}
          required
        />
      </Field>

      <Field label="Annual salary (INR)" required>
        <Input
          type="number"
          value={salary}
          onChange={(e) => setSalary(e.target.value)}
          placeholder="e.g. 1200000"
          disabled={submitting}
          min="0"
          step="1"
          required
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
          variant="primary"
          icon={BadgeCheck}
          loading={submitting}
          disabled={!isValid}
        >
          Mark as Placed
        </Button>
      </div>
    </form>
  );
}
