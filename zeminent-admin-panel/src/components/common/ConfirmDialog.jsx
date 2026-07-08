"use client";

import { AlertTriangle } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";

// Confirmation prompt for destructive actions (delete course / lecture, etc.).
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Are you sure?",
  description = "This action cannot be undone.",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading = false,
  danger = true,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        {danger && (
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red-50 dark:bg-red-500/10">
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
        )}
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {description}
        </p>
      </div>
    </Modal>
  );
}
