"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Radio,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Plus,
  ExternalLink,
  Ban,
  RotateCcw,
} from "lucide-react";

import { liveClassService } from "@/api/liveClassService";
import PageHeader from "@/components/admin/PageHeader";
import DataTable from "@/components/admin/DataTable";
import StatCard from "@/components/admin/StatCard";
import Badge from "@/components/common/Badge";
import Button from "@/components/common/Button";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { getId } from "@/utils/entity";
import { formatDate } from "@/utils/format";

// Derive the live-cycle status from startTime/duration so the table reflects
// reality even if the server's `status` virtual went stale between requests.
function deriveStatus(item, now = Date.now()) {
  if (item.statusOverride === "cancelled" || item.status === "cancelled")
    return "cancelled";
  const start = new Date(item.startTime).getTime();
  const end = start + (item.durationMinutes || 0) * 60 * 1000;
  if (Number.isNaN(start)) return "scheduled";
  if (now < start) return "scheduled";
  if (now <= end) return "live";
  return "ended";
}

const STATUS_TONE = {
  live: "green",
  scheduled: "brand",
  ended: "slate",
  cancelled: "red",
};

const STATUS_LABEL = {
  live: "Live now",
  scheduled: "Scheduled",
  ended: "Ended",
  cancelled: "Cancelled",
};

function formatWhen(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdminLiveClasses() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [filter, setFilter] = useState("all");
  // Re-derive status every 30s so a "scheduled" row promotes to "live" without
  // requiring a manual refresh.
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30 * 1000);
    return () => clearInterval(id);
  }, []);

  const load = () => {
    setLoading(true);
    liveClassService
      .list()
      .then((data) => {
        const list = Array.isArray(data)
          ? data
          : data?.liveClasses || data?.items || [];
        setItems(list);
        setError("");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const enriched = useMemo(
    () => items.map((it) => ({ ...it, _status: deriveStatus(it) })),
    [items],
  );

  const counts = useMemo(() => {
    const c = {
      all: enriched.length,
      live: 0,
      scheduled: 0,
      ended: 0,
      cancelled: 0,
    };
    enriched.forEach((it) => {
      c[it._status] = (c[it._status] || 0) + 1;
    });
    return c;
  }, [enriched]);

  const filtered = useMemo(() => {
    const base = filter === "all" ? enriched : enriched.filter((i) => i._status === filter);
    // Live first, then upcoming chronological, then ended reverse-chrono.
    const order = { live: 0, scheduled: 1, ended: 2, cancelled: 3 };
    return [...base].sort((a, b) => {
      const oa = order[a._status] ?? 9;
      const ob = order[b._status] ?? 9;
      if (oa !== ob) return oa - ob;
      const ta = new Date(a.startTime).getTime() || 0;
      const tb = new Date(b.startTime).getTime() || 0;
      return a._status === "ended" ? tb - ta : ta - tb;
    });
  }, [enriched, filter]);

  const handleTogglePublish = async (row) => {
    const id = getId(row);
    setBusyId(id);
    try {
      await liveClassService.togglePublish(id, !row.isPublished);
      setItems((prev) =>
        prev.map((i) =>
          getId(i) === id ? { ...i, isPublished: !i.isPublished } : i,
        ),
      );
      toast.success(row.isPublished ? "Unpublished" : "Published");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleCancel = async (row) => {
    const id = getId(row);
    const nextCancelled = row.statusOverride !== "cancelled";
    setBusyId(id);
    try {
      await liveClassService.setCancelled(id, nextCancelled);
      setItems((prev) =>
        prev.map((i) =>
          getId(i) === id
            ? { ...i, statusOverride: nextCancelled ? "cancelled" : "none" }
            : i,
        ),
      );
      toast.success(nextCancelled ? "Session cancelled" : "Session reinstated");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await liveClassService.remove(getId(deleteTarget));
      setItems((prev) => prev.filter((i) => getId(i) !== getId(deleteTarget)));
      toast.success("Live class deleted");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: "title",
      header: "Session",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-800 dark:text-slate-100">
            {row.title}
          </p>
          <p className="text-xs text-slate-400">
            {row.instructor} · {row.category || "General"}
          </p>
        </div>
      ),
    },
    {
      key: "startTime",
      header: "Starts",
      render: (row) => (
        <div className="text-sm text-slate-700 dark:text-slate-200">
          <div>{formatWhen(row.startTime)}</div>
          <div className="text-xs text-slate-400">
            {row.durationMinutes} min
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge tone={STATUS_TONE[row._status]}>
          {STATUS_LABEL[row._status]}
        </Badge>
      ),
    },
    {
      key: "visibility",
      header: "Visibility",
      render: (row) =>
        row.isPublished ? (
          <Badge tone="green">Published</Badge>
        ) : (
          <Badge tone="amber">Draft</Badge>
        ),
    },
    {
      key: "createdAt",
      header: "Created",
      render: (row) => (
        <span className="text-xs text-slate-400">
          {formatDate(row.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (row) => {
        const id = getId(row);
        const cancelled = row.statusOverride === "cancelled";
        return (
          <div className="flex items-center justify-end gap-1">
            {row.meetingUrl && (
              <a
                href={row.meetingUrl}
                target="_blank"
                rel="noreferrer"
                title="Open meeting URL"
                className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            <Link
              href={`/admin/live-classes/${id}/edit`}
              title="Edit"
              className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"
            >
              <Pencil className="h-4 w-4" />
            </Link>
            <button
              type="button"
              title={row.isPublished ? "Unpublish" : "Publish"}
              disabled={busyId === id}
              onClick={() => handleTogglePublish(row)}
              className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-amber-600 disabled:opacity-50 dark:hover:bg-slate-800"
            >
              {row.isPublished ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              title={cancelled ? "Reinstate session" : "Cancel session"}
              disabled={busyId === id}
              onClick={() => handleToggleCancel(row)}
              className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-red-600 disabled:opacity-50 dark:hover:bg-slate-800"
            >
              {cancelled ? (
                <RotateCcw className="h-4 w-4" />
              ) : (
                <Ban className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              title="Delete"
              onClick={() => setDeleteTarget(row)}
              className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      },
    },
  ];

  const tabs = [
    { id: "all", label: "All" },
    { id: "live", label: "Live" },
    { id: "scheduled", label: "Upcoming" },
    { id: "ended", label: "Ended" },
    { id: "cancelled", label: "Cancelled" },
  ];

  return (
    <div>
      <PageHeader
        title="Live classes"
        subtitle="View and manage existing live class sessions. New sessions are scheduled via the Meetings page."
        actions={
          <Button to="/admin/meetings/new" icon={Plus}>
            New live class
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Live now"
          value={counts.live}
          icon={Radio}
          tone="green"
        />
        <StatCard label="Upcoming" value={counts.scheduled} icon={Radio} />
        <StatCard label="Ended" value={counts.ended} icon={Radio} />
        <StatCard label="Cancelled" value={counts.cancelled} icon={Radio} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
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
            <span className="ml-1.5 text-xs opacity-70">
              {counts[t.id] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          loading={loading}
          emptyIcon={Radio}
          emptyTitle="No live classes yet"
          emptyDescription="Schedule your first session to fill the cohort calendar."
          rowKey={(row) => getId(row)}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete live class"
        description={`"${deleteTarget?.title}" will be permanently removed.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
