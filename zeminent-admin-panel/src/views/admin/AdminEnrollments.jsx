"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Briefcase, BadgeCheck, RotateCcw, Eye } from "lucide-react";

import PageHeader from "@/components/admin/PageHeader";
import StatCard from "@/components/admin/StatCard";
import DataTable from "@/components/admin/DataTable";
import Badge from "@/components/common/Badge";
import Button from "@/components/common/Button";

import { placementService } from "@/api/placementService";
import { getId } from "@/utils/entity";
import { formatDate, formatPrice } from "@/utils/format";

// Slice 14 B.6: admin enrollments dashboard. Mirrors AdminLiveClasses
// (filter tabs + stats + DataTable) — see ../admin/AdminLiveClasses.jsx
// for the canonical pattern.

const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "placement_in_progress", label: "In Progress" },
  { id: "placed", label: "Placed" },
  { id: "refunded", label: "Refunded" },
  { id: "completed", label: "Completed" },
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

export default function AdminEnrollments() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Fetch on mount + whenever the search box changes. Search is delegated
  // to the backend (which does in-memory filter post-populate); status
  // filter is applied client-side below so the tab counts stay live as
  // the user toggles between them without re-fetching. `load` is named
  // (not inlined into the effect) so the error-state Retry button can
  // re-trigger the same fetch.
  const load = useCallback(() => {
    setLoading(true);
    setError("");
    placementService
      .listEnrollments({ search: search || undefined })
      .then((data) => setItems(data?.enrollments || []))
      .catch((err) => setError(err.message || "Failed to load enrollments"))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const c = { all: items.length };
    for (const it of items) {
      c[it.status] = (c[it.status] || 0) + 1;
    }
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((i) => i.status === filter);
  }, [items, filter]);

  const columns = [
    {
      key: "student",
      header: "Student",
      render: (row) => (
        <div>
          <div className="font-medium text-slate-800 dark:text-slate-100">
            {row.userId?.name || "—"}
          </div>
          <div className="text-xs text-slate-400">{row.userId?.email || ""}</div>
        </div>
      ),
    },
    {
      key: "payment",
      header: "Payment",
      render: (row) => (
        <div>
          <div className="font-mono text-sm">{formatPrice(row.paymentId?.amount || 0)}</div>
          <div className="text-xs text-slate-400">
            {row.paymentId?.invoiceNumber || "No invoice"}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge tone={STATUS_TONES[row.status] || "slate"}>
          {formatStatus(row.status)}
        </Badge>
      ),
    },
    {
      key: "enrolled",
      header: "Enrolled",
      render: (row) => formatDate(row.enrolledAt),
    },
    {
      key: "refundEligibleUntil",
      header: "Refund eligible until",
      render: (row) => {
        if (!row.refundEligibleUntil) return "—";
        const passed = new Date(row.refundEligibleUntil) < new Date();
        return (
          <span className={passed ? "text-red-500" : ""}>
            {formatDate(row.refundEligibleUntil)}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (row) => (
        <Button
          to={`/admin/enrollments/${getId(row)}`}
          variant="ghost"
          size="sm"
          icon={Eye}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Placement Enrollments"
        subtitle="Manage student enrollments, track placements, process refunds."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Briefcase}
          label="Active"
          value={(counts.active || 0) + (counts.placement_in_progress || 0)}
          tone="brand"
        />
        <StatCard
          icon={BadgeCheck}
          label="Placed"
          value={counts.placed || 0}
          tone="green"
        />
        <StatCard
          icon={RotateCcw}
          label="Refunded"
          value={counts.refunded || 0}
          tone="red"
        />
        <StatCard
          label="Total enrollments"
          value={counts.all || 0}
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

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by student name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-base w-full max-w-md"
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
          data={filtered}
          loading={loading}
          rowKey={(row) => getId(row)}
          emptyTitle="No enrollments yet"
          emptyDescription={
            filter === "all"
              ? "Enrollments will appear here once students enroll in the Placement Guarantee Program."
              : `No enrollments with status "${formatStatus(filter)}".`
          }
          emptyIcon={Briefcase}
        />
      )}
    </div>
  );
}
