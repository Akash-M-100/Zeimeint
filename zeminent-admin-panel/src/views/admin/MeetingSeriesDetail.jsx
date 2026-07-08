"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  ExternalLink,
  Users,
  Calendar,
  Video,
  Pencil,
  Ban,
} from "lucide-react";
import toast from "react-hot-toast";

import Badge from "@/components/common/Badge";
import Button from "@/components/common/Button";
import { Spinner } from "@/components/common/Spinner";
import Modal from "@/components/common/Modal";
import ConfirmDialog from "@/components/common/ConfirmDialog";

import SendRecordingForm from "@/components/admin/SendRecordingForm";
import { meetingSeriesService } from "@/api/meetingSeriesService";
import { formatDate } from "@/utils/format";

// Slice 16.5a: full meeting-series detail. Read-only at first.
// Slice 16.5c: wired up Edit + Cancel + Send Recording (per-occurrence)
// against the 16.4 backend endpoints.

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

const WEEKDAY_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function formatSchedule(series) {
  if (series.scheduleMode === "weekly") {
    const day = WEEKDAY_LONG[series.scheduleConfig?.dayOfWeek] || "?";
    const time = series.scheduleConfig?.time || "?";
    const count = series.scheduleConfig?.occurrenceCount || 0;
    const startDate = series.scheduleConfig?.startDate
      ? formatDate(series.scheduleConfig.startDate)
      : "?";
    return `Weekly every ${day} at ${time} IST · ${count} session${count === 1 ? "" : "s"} starting ${startDate}`;
  }
  const dates = series.scheduleConfig?.dates || [];
  return `${dates.length} specific date${dates.length === 1 ? "" : "s"}`;
}

function formatOccurrenceTime(d) {
  return new Date(d).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function occurrenceStatus(occ) {
  if (occ.statusOverride === "cancelled") return "cancelled";
  const start = new Date(occ.startTime).getTime();
  const end = start + (occ.durationMinutes || 0) * 60 * 1000;
  const now = Date.now();
  if (now < start) return "scheduled";
  if (now <= end) return "live";
  return "ended";
}

const STATUS_LABEL = {
  scheduled: "Scheduled",
  live: "Live",
  ended: "Ended",
  cancelled: "Cancelled",
};
const STATUS_TONE = {
  scheduled: "slate",
  live: "green",
  ended: "slate",
  cancelled: "red",
};

export default function MeetingSeriesDetail() {
  const params = useParams();
  const id = params?.id;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Slice 16.5c: cancel + recording modal state
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [recordingTarget, setRecordingTarget] = useState(null);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError("");
    meetingSeriesService
      .get(id)
      .then(setData)
      .catch((err) => setError(err.message || "Failed to load meeting series"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCancelConfirm = async () => {
    setCancelling(true);
    try {
      await meetingSeriesService.cancel(id);
      toast.success("Series cancelled. Cancellation emails are being sent.");
      setCancelOpen(false);
      load();
    } catch (err) {
      toast.error(err.message || "Failed to cancel series");
    } finally {
      setCancelling(false);
    }
  };

  const handleRecordingSubmit = async ({ recordingUrl, notify }) => {
    if (!recordingTarget) return;
    try {
      const result = await meetingSeriesService.sendRecording(recordingTarget._id, {
        recordingUrl,
        notify,
      });
      const sent = result?.sentCount ?? 0;
      toast.success(
        notify && sent > 0
          ? `Recording saved and emailed to ${sent} attendee(s)`
          : "Recording saved",
      );
      setRecordingTarget(null);
      load();
    } catch (err) {
      toast.error(err.message || "Failed to save recording");
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
  if (error || !data) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error || "Meeting series not found"}
        </div>
        <Button to="/admin/meetings" variant="ghost" icon={ArrowLeft} size="sm">
          Back to meetings
        </Button>
      </div>
    );
  }

  const { series, occurrences = [] } = data;
  const enrolled = series.attendees?.enrolledStudents || [];
  const external = series.attendees?.externalInvitees || [];
  const totalAttendees = enrolled.length + external.length;
  const isCancelled = series.status === "cancelled";

  return (
    <div className="space-y-6">
      <div>
        <Button to="/admin/meetings" variant="ghost" icon={ArrowLeft} size="sm">
          Back to meetings
        </Button>

        {/* Slice 16.5c action row */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            to={`/admin/meetings/${id}/edit`}
            icon={Pencil}
            variant="outline"
            size="sm"
            disabled={isCancelled}
            title={isCancelled ? "Cancelled series can't be edited" : "Edit series"}
          >
            Edit
          </Button>
          <Button
            onClick={() => setCancelOpen(true)}
            icon={Ban}
            variant="danger"
            size="sm"
            disabled={isCancelled}
            title={isCancelled ? "Already cancelled" : "Cancel series"}
          >
            Cancel series
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{series.title}</h1>
            {series.description && (
              <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                {series.description}
              </p>
            )}
            <p className="mt-1 text-sm text-slate-500">
              Created {formatDate(series.createdAt)}
              {series.createdBy?.name && ` · by ${series.createdBy.name}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={TYPE_TONES[series.meetingType] || "slate"}>
              {TYPE_LABELS[series.meetingType] || series.meetingType}
            </Badge>
            <Badge tone={isCancelled ? "red" : "green"}>
              {isCancelled ? "Cancelled" : "Active"}
            </Badge>
            {series.isPublished === false && (
              <Badge tone="amber">Unpublished</Badge>
            )}
          </div>
        </div>
      </div>

      <section className="card p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <CalendarClock className="h-5 w-5" /> Series Information
        </h2>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          {series.instructor && (
            <DLRow label="Instructor" value={series.instructor} />
          )}
          {series.course && (
            <DLRow label="Course" value={series.course.title || "—"} />
          )}
          {series.category && (
            <DLRow label="Category" value={series.category} />
          )}
          <DLRow
            label="Duration per session"
            value={`${series.durationMinutes} minutes`}
          />
          <div className="sm:col-span-2">
            <dt className="text-slate-500">Meeting URL</dt>
            <dd className="break-all">
              <a
                href={series.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-brand-600 hover:underline"
              >
                {series.meetingUrl}
                <ExternalLink className="h-3 w-3" />
              </a>
            </dd>
          </div>
        </dl>
      </section>

      <section className="card p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Calendar className="h-5 w-5" /> Schedule
        </h2>
        <p className="text-sm">{formatSchedule(series)}</p>
        <p className="mt-2 text-xs text-slate-500">
          {series.totalOccurrences} total session
          {series.totalOccurrences === 1 ? "" : "s"}
        </p>
      </section>

      <section className="card p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Users className="h-5 w-5" /> Attendees ({totalAttendees})
        </h2>

        {totalAttendees === 0 && (
          <p className="text-sm text-slate-500">No attendees invited.</p>
        )}

        {enrolled.length > 0 && (
          <div className="mb-4">
            <h3 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Enrolled students ({enrolled.length})
            </h3>
            <ul className="space-y-1 text-sm">
              {enrolled.map((s) => (
                <li key={s._id} className="flex flex-wrap justify-between gap-2">
                  <span>{s.name || "—"}</span>
                  <span className="text-slate-500">{s.email}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {external.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              External invitees ({external.length})
            </h3>
            <ul className="space-y-1 text-sm">
              {external.map((inv, i) => (
                <li
                  key={`${inv.email}-${i}`}
                  className="flex flex-wrap justify-between gap-2"
                >
                  <span>{inv.name || "—"}</span>
                  <span className="text-slate-500">{inv.email}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="card p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Video className="h-5 w-5" /> Recording
        </h2>
        <p className="text-sm">
          {series.recordingEnabled
            ? "Sessions in this series will be recorded."
            : "Recording is not enabled for this series."}
        </p>
      </section>

      <section className="card p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Calendar className="h-5 w-5" /> Sessions ({occurrences.length})
        </h2>
        {occurrences.length === 0 ? (
          <p className="text-sm text-slate-500">No occurrences yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-200 dark:border-slate-700">
                <tr className="text-left text-xs uppercase text-slate-500">
                  <th className="pb-2 pr-4">#</th>
                  <th className="pb-2 pr-4">Date &amp; Time (IST)</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Recording</th>
                  <th className="pb-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {occurrences.map((occ) => {
                  const status = occurrenceStatus(occ);
                  const isPast = new Date(occ.startTime).getTime() < Date.now();
                  const hasRecording = Boolean(occ.recordingUrl);
                  // Send-recording is meaningful only after the session
                  // has started — before then there's nothing to share.
                  // Cancelled series also disables it.
                  const recordingDisabled = !isPast || isCancelled;
                  const recordingTitle = isCancelled
                    ? "Cancelled"
                    : !isPast
                      ? "Session hasn't started yet"
                      : hasRecording
                        ? "Update recording URL"
                        : "Send recording";
                  return (
                    <tr
                      key={occ._id}
                      className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                    >
                      <td className="py-2 pr-4">{occ.occurrenceIndex ?? "—"}</td>
                      <td className="py-2 pr-4">
                        {formatOccurrenceTime(occ.startTime)}
                      </td>
                      <td className="py-2 pr-4">
                        <Badge tone={STATUS_TONE[status]}>
                          {STATUS_LABEL[status]}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4">
                        {occ.recordingUrl ? (
                          <a
                            href={occ.recordingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
                          >
                            View
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        <Button
                          onClick={() => setRecordingTarget(occ)}
                          variant="ghost"
                          size="sm"
                          icon={Video}
                          disabled={recordingDisabled}
                          title={recordingTitle}
                        >
                          {hasRecording ? "Update" : "Send"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={handleCancelConfirm}
        title="Cancel this meeting series?"
        confirmLabel="Yes, cancel"
        danger
        loading={cancelling}
        description={
          `All future sessions will be cancelled and all attendees ` +
          `(${totalAttendees} ${totalAttendees === 1 ? "person" : "people"}) ` +
          `will receive a cancellation email with an ICS update that removes ` +
          `the events from their calendars. Past sessions will be preserved. ` +
          `This action cannot be undone.`
        }
      />

      <Modal
        open={Boolean(recordingTarget)}
        onClose={() => setRecordingTarget(null)}
        title={
          recordingTarget?.recordingUrl ? "Update recording" : "Send recording"
        }
        size="md"
      >
        {recordingTarget && (
          <SendRecordingForm
            occurrence={recordingTarget}
            onSubmit={handleRecordingSubmit}
            onCancel={() => setRecordingTarget(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function DLRow({ label, value }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="break-words">{value}</dd>
    </div>
  );
}
