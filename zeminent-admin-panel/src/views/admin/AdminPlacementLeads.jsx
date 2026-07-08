"use client";

import { useEffect, useMemo, useState } from "react";
import { Users, Phone, Clock } from "lucide-react";
import toast from "react-hot-toast";

import PageHeader from "@/components/admin/PageHeader";
import StatCard from "@/components/admin/StatCard";
import DataTable from "@/components/admin/DataTable";
import { Select } from "@/components/common/FormControls";

import { placementService } from "@/api/placementService";
import { getId } from "@/utils/entity";
import { formatDate } from "@/utils/format";

// Slice 14 B.6: legacy Phase A lead-capture viewer + inline status
// editor. The student-facing lead form was removed in B.5 (replaced
// by direct enrollment), but the backend endpoint stays alive so any
// pre-B.5 leads remain triagable from this surface.

const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "contacted", label: "Contacted" },
  { id: "enrolled", label: "Enrolled" },
  { id: "rejected", label: "Rejected" },
  { id: "archived", label: "Archived" },
];

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "enrolled", label: "Enrolled" },
  { value: "rejected", label: "Rejected" },
  { value: "archived", label: "Archived" },
];

export default function AdminPlacementLeads() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    setLoading(true);
    setError("");
    placementService
      .listLeads()
      .then((data) => setItems(data?.leads || []))
      .catch((err) => setError(err.message || "Failed to load leads"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const counts = useMemo(() => {
    const c = { all: items.length };
    for (const it of items) {
      c[it.status] = (c[it.status] || 0) + 1;
    }
    return c;
  }, [items]);

  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter((i) => i.status === filter)),
    [items, filter],
  );

  const handleStatusChange = async (lead, newStatus) => {
    const id = getId(lead);
    if (newStatus === lead.status) return;
    setBusyId(id);
    try {
      const result = await placementService.updateLead(id, { status: newStatus });
      setItems((prev) =>
        prev.map((l) => (getId(l) === id ? result.lead : l)),
      );
      toast.success(`Status updated to "${newStatus}"`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const columns = [
    {
      key: "lead",
      header: "Lead",
      render: (row) => (
        <div>
          <div className="font-medium text-slate-800 dark:text-slate-100">
            {row.userId?.name || "—"}
          </div>
          <div className="text-xs text-slate-400">{row.userId?.email}</div>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      render: (row) => (
        <div className="text-sm">
          <div className="flex items-center gap-1.5">
            <Phone className="h-3 w-3" />
            {row.phone || "—"}
          </div>
          {row.preferredCallTime && (
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="h-3 w-3" />
              {row.preferredCallTime}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "courses",
      header: "Eligible courses",
      render: (row) => {
        const courses = row.completedCourseIds || [];
        if (courses.length === 0) return "—";
        const first = courses.slice(0, 2);
        const extra = courses.length - first.length;
        return (
          <div className="text-xs">
            {first.map((c) => (
              <div key={c._id || c}>{c.title || "…"}</div>
            ))}
            {extra > 0 && (
              <div className="text-slate-500">+{extra} more</div>
            )}
          </div>
        );
      },
    },
    {
      key: "createdAt",
      header: "Created",
      render: (row) => formatDate(row.createdAt),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => {
        const id = getId(row);
        return (
          <Select
            value={row.status}
            onChange={(e) => handleStatusChange(row, e.target.value)}
            disabled={busyId === id}
            className="min-w-[140px]"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Placement Leads"
        subtitle="Legacy leads from the Phase A capture form. New interest since B.5 enters via direct enrollment."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard icon={Users} label="All leads" value={counts.all || 0} />
        <StatCard label="New" value={counts.new || 0} tone="brand" />
        <StatCard label="Contacted" value={counts.contacted || 0} tone="amber" />
        <StatCard label="Enrolled" value={counts.enrolled || 0} tone="green" />
        <StatCard
          label="Archived / Rejected"
          value={(counts.archived || 0) + (counts.rejected || 0)}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {STATUS_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setFilter(t.id)}
            className={
              filter === t.id
                ? "rounded-full bg-brand-600 px-3.5 py-1.5 text-sm font-medium text-white"
                : "rounded-full border border-slate-200 px-3.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            }
          >
            {t.label}
            <span className="ml-1.5 text-xs opacity-70">{counts[t.id] ?? 0}</span>
          </button>
        ))}
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
          data={filtered}
          loading={loading}
          rowKey={(row) => getId(row)}
          emptyTitle="No leads"
          emptyDescription={
            filter === "all"
              ? "The Phase A capture form was retired in B.5. Any pre-B.5 leads would appear here."
              : `No leads with status "${filter}".`
          }
          emptyIcon={Users}
        />
      )}
    </div>
  );
}
