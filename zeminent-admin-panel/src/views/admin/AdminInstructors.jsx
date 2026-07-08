"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { UserCog, Plus, Pencil, Trash2 } from "lucide-react";

import { instructorService } from "@/api/instructorService";
import PageHeader from "@/components/admin/PageHeader";
import DataTable from "@/components/admin/DataTable";
import InstructorForm from "@/components/admin/InstructorForm";
import Modal from "@/components/common/Modal";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import Button from "@/components/common/Button";
import { formatDate, getInitials } from "@/utils/format";
import { getId } from "@/utils/entity";

export default function AdminInstructors() {
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    instructorService
      .getInstructors()
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.instructors || [];
        setInstructors(list);
        setError("");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (instructor) => {
    setEditing(instructor);
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
    setEditing(null);
  };

  const handleSubmit = async (payload) => {
    setSaving(true);
    try {
      if (editing) {
        await instructorService.updateInstructor(getId(editing), payload);
        toast.success("Instructor updated");
      } else {
        await instructorService.createInstructor(payload);
        toast.success("Instructor created");
      }
      setFormOpen(false);
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.message || "Could not save instructor");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await instructorService.deleteInstructor(getId(deleteTarget));
      setInstructors((prev) => prev.filter((i) => getId(i) !== getId(deleteTarget)));
      toast.success("Instructor removed");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.message || "Could not remove instructor");
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: "name",
      header: "Instructor",
      render: (row) => (
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
            {getInitials(row.name)}
          </span>
          <span className="font-medium text-slate-800 dark:text-slate-100">
            {row.name || "Unknown"}
          </span>
        </div>
      ),
    },
    {
      key: "email",
      header: "Email",
      render: (row) => <span className="text-slate-500">{row.email || "—"}</span>,
    },
    {
      key: "createdAt",
      header: "Added",
      render: (row) => formatDate(row.createdAt),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            title="Edit instructor"
            onClick={() => openEdit(row)}
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Remove instructor"
            onClick={() => setDeleteTarget(row)}
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Instructors"
        subtitle="Create and manage instructor accounts. Instructors can manage course lectures and sections."
        actions={
          <Button icon={Plus} onClick={openCreate}>
            Add instructor
          </Button>
        }
      />

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={instructors}
          loading={loading}
          emptyIcon={UserCog}
          emptyTitle="No instructors yet"
          emptyDescription="Add your first instructor to let them manage course content."
          rowKey={(row) => getId(row)}
        />
      )}

      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editing ? "Edit instructor" : "Add instructor"}
        size="md"
      >
        <InstructorForm
          key={editing ? getId(editing) : "new-instructor"}
          initialValues={editing || {}}
          onSubmit={handleSubmit}
          onCancel={closeForm}
          loading={saving}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Remove instructor"
        description={`"${deleteTarget?.name}" will lose access to the instructor panel. This can't be undone.`}
        confirmLabel="Remove instructor"
      />
    </div>
  );
}
