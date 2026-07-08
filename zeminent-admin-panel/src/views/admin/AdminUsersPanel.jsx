"use client";

import { useEffect, useState, useCallback } from "react";
import { ShieldCheck, UserPlus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import PageHeader from "@/components/admin/PageHeader";
import StatCard from "@/components/admin/StatCard";
import DataTable from "@/components/admin/DataTable";
import Button from "@/components/common/Button";
import Modal from "@/components/common/Modal";
import ConfirmDialog from "@/components/common/ConfirmDialog";

import AddAdminForm from "@/components/admin/AddAdminForm";

import { adminUserService } from "@/api/adminUserService";
import { useAuth } from "@/context/AuthContext";
import { getId } from "@/utils/entity";
import { formatDate } from "@/utils/format";

// Admin user management — UI for backend PR #15. Lets logged-in admins
// list/create/revoke other admins. Self-revoke is gated on both sides
// (backend 400 + the Revoke button is disabled on your own row) and
// the backend additionally refuses a revoke that would leave 0 admins.
export default function AdminUsersPanel() {
  const { user: currentUser } = useAuth();

  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [addOpen, setAddOpen] = useState(false);

  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revoking, setRevoking] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    adminUserService
      .listAdmins()
      .then((data) => setAdmins(data?.admins || []))
      .catch((err) => setError(err.message || "Failed to load admins"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAddSubmit = async ({ name, email, password }) => {
    try {
      await adminUserService.createAdmin({ name, email, password });
      load(); // refresh to pick up server-assigned createdAt for sort
      toast.success(`${name} added as admin`);
      setAddOpen(false);
    } catch (err) {
      // Re-throw so the form can stop its spinner while staying open;
      // toast surfaces the backend message (e.g. 409 duplicate email).
      toast.error(err.message || "Failed to create admin");
      throw err;
    }
  };

  const handleRevokeConfirm = async () => {
    if (!revokeTarget) return;
    const id = getId(revokeTarget);
    setRevoking(true);
    try {
      await adminUserService.revokeAdmin(id);
      setAdmins((prev) => prev.filter((a) => getId(a) !== id));
      toast.success(`${revokeTarget.name} is no longer an admin`);
      setRevokeTarget(null);
    } catch (err) {
      toast.error(err.message || "Failed to revoke admin status");
    } finally {
      setRevoking(false);
    }
  };

  const columns = [
    {
      key: "name",
      header: "Name",
      render: (row) => (
        <div>
          <div className="font-medium text-slate-800 dark:text-slate-100">
            {row.name}
          </div>
          <div className="text-xs text-slate-400">{row.email}</div>
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "Added",
      render: (row) => formatDate(row.createdAt),
    },
    {
      key: "isEmailVerified",
      header: "Email verified",
      render: (row) => (row.isEmailVerified ? "Yes" : "No"),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (row) => {
        const isSelf = getId(row) === getId(currentUser);
        return (
          <Button
            variant="ghost"
            size="sm"
            icon={Trash2}
            onClick={() => setRevokeTarget(row)}
            disabled={isSelf}
            title={
              isSelf
                ? "Cannot revoke your own admin status"
                : "Revoke admin"
            }
          >
            Revoke
          </Button>
        );
      },
    },
  ];

  const revokeDescription = revokeTarget
    ? `${revokeTarget.name} (${revokeTarget.email}) will lose admin access. They can still log in as a regular user. This action takes effect immediately.`
    : "";

  return (
    <div>
      <PageHeader
        title="Admins"
        subtitle="Manage admin user accounts for the Zeminent panel."
        actions={
          <Button onClick={() => setAddOpen(true)} icon={UserPlus}>
            Add Admin
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={ShieldCheck}
          label="Total admins"
          value={admins.length}
          tone="brand"
        />
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
          <button type="button" onClick={load} className="ml-3 underline">
            Retry
          </button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={admins}
          loading={loading}
          rowKey={(row) => getId(row)}
          emptyTitle="No admins yet"
          emptyDescription="This shouldn't be possible — at least one admin must exist. Reload or contact support."
          emptyIcon={ShieldCheck}
        />
      )}

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add new admin"
        size="md"
      >
        <AddAdminForm
          onSubmit={handleAddSubmit}
          onCancel={() => setAddOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(revokeTarget)}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevokeConfirm}
        title="Revoke admin status?"
        description={revokeDescription}
        confirmLabel="Revoke admin"
        loading={revoking}
      />
    </div>
  );
}
