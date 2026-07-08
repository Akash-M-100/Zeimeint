"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  GraduationCap,
  Users,
  Briefcase,
  Plus,
  Eye,
} from "lucide-react";

import PageHeader from "@/components/admin/PageHeader";
import StatCard from "@/components/admin/StatCard";
import DataTable from "@/components/admin/DataTable";
import Badge from "@/components/common/Badge";
import Button from "@/components/common/Button";

import { meetingSeriesService } from "@/api/meetingSeriesService";
import { getId } from "@/utils/entity";
import { formatDate } from "@/utils/format";

// Slice 16.5a: read-only meetings list. Filter tabs + stats + DataTable —
// same shape as AdminEnrollments / AdminLiveClasses. Create flow ships in
// 16.5b; the "Schedule meeting" button is disabled with a tooltip for now.

const TYPE_TABS = [
  { id: "all", label: "All" },
  { id: "live_class", label: "Live Classes" },
  { id: "internal", label: "Internal" },
  { id: "other", label: "Other" },
];

const TYPE_TONES = {
  live_class: "brand",
  internal: "amber",
  other: "slate",
};

const TYPE_LABELS = {
  live_class: "Live Class",
  internal: "Internal",
  other: "Other",
};

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatScheduleSummary(series) {
  if (series.scheduleMode === "weekly") {
    const day = WEEKDAY_SHORT[series.scheduleConfig?.dayOfWeek] || "?";
    const time = series.scheduleConfig?.time || "";
    return `Weekly · ${day} ${time} IST`;
  }
  return `${series.totalOccurrences} dates`;
}

// The list endpoint doesn't include the child occurrences, so for weekly
// series we surface the scheduleConfig.startDate as a "starts" proxy and
// for manual-dates series we pick the first future date (or the first
// date if all dates are in the past).
function findNextOccurrenceDate(series) {
  if (series.scheduleMode === "weekly") {
    return series.scheduleConfig?.startDate || null;
  }
  const dates = series.scheduleConfig?.dates || [];
  if (dates.length === 0) return null;
  const now = Date.now();
  const future = dates
    .map((d) => new Date(d).getTime())
    .filter((t) => t > now)
    .sort((a, b) => a - b);
  return future[0] ? new Date(future[0]) : new Date(dates[0]);
}

export default function AdminMeetingSeries() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  // Filter is client-side (cheap, keeps tab counts live without a fetch
  // per toggle); `load` is named so the error-state Retry button can
  // re-trigger it without rebuilding the effect.
  const load = useCallback(() => {
    setLoading(true);
    setError("");
    meetingSeriesService
      .list()
      .then((data) => setItems(data?.series || []))
      .catch((err) => setError(err.message || "Failed to load meetings"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const c = { all: items.length };
    for (const it of items) {
      c[it.meetingType] = (c[it.meetingType] || 0) + 1;
    }
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((i) => i.meetingType === filter);
  }, [items, filter]);

  const columns = [
    {
      key: "title",
      header: "Title",
      render: (row) => (
        <div>
          <div className="font-medium text-slate-800 dark:text-slate-100">
            {row.title}
          </div>
          <div className="text-xs text-slate-400">
            {row.course?.title || row.instructor || "—"}
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (row) => (
        <Badge tone={TYPE_TONES[row.meetingType] || "slate"}>
          {TYPE_LABELS[row.meetingType] || row.meetingType}
        </Badge>
      ),
    },
    {
      key: "schedule",
      header: "Schedule",
      render: (row) => (
        <div className="text-sm">
          <div>{formatScheduleSummary(row)}</div>
          <div className="text-xs text-slate-400">
            {row.totalOccurrences} session
            {row.totalOccurrences === 1 ? "" : "s"} · {row.durationMinutes} min
            each
          </div>
        </div>
      ),
    },
    {
      key: "starts",
      header: "Starts",
      render: (row) => {
        const next = findNextOccurrenceDate(row);
        return next ? formatDate(next) : "—";
      },
    },
    {
      key: "attendees",
      header: "Attendees",
      render: (row) => {
        const enrolled = row.attendees?.enrolledStudents?.length || 0;
        const external = row.attendees?.externalInvitees?.length || 0;
        const total = enrolled + external;
        return (
          <div className="text-sm">
            <div>{total}</div>
            {total > 0 && (
              <div className="text-xs text-slate-400">
                {enrolled > 0 && `${enrolled} enrolled`}
                {enrolled > 0 && external > 0 && " · "}
                {external > 0 && `${external} external`}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge tone={row.status === "cancelled" ? "red" : "green"}>
          {row.status === "cancelled" ? "Cancelled" : "Active"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (row) => (
        <Button
          to={`/admin/meetings/${getId(row)}`}
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
        title="Meetings"
        subtitle="Scheduled live classes and internal team meetings."
        actions={
          <Button
            to="/admin/meetings/new"
            icon={Plus}
            variant="primary"
          >
            Schedule meeting
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={CalendarClock}
          label="Total series"
          value={counts.all || 0}
          tone="brand"
        />
        <StatCard
          icon={GraduationCap}
          label="Live classes"
          value={counts.live_class || 0}
          tone="brand"
        />
        <StatCard
          icon={Users}
          label="Internal meetings"
          value={counts.internal || 0}
          tone="amber"
        />
        <StatCard
          icon={Briefcase}
          label="Other"
          value={counts.other || 0}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TYPE_TABS.map((t) => (
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
          emptyTitle={
            filter === "all"
              ? "No meetings scheduled yet"
              : `No ${TYPE_LABELS[filter] || filter} meetings`
          }
          emptyDescription={
            filter === "all"
              ? "Schedule live classes or internal team meetings to see them here."
              : `Filter shows zero meetings of type "${TYPE_LABELS[filter] || filter}".`
          }
          emptyIcon={CalendarClock}
        />
      )}
    </div>
  );
}
