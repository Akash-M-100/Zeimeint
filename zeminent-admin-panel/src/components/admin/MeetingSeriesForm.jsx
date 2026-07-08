"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Calendar,
  Users,
  Video,
  GraduationCap,
  Briefcase,
  Building2,
  Plus,
  X,
} from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import toast from "react-hot-toast";

import Badge from "@/components/common/Badge";
import Button from "@/components/common/Button";
import {
  Field,
  Input,
  Textarea,
  Select,
  Toggle,
} from "@/components/common/FormControls";
import { Spinner } from "@/components/common/Spinner";

import { courseService } from "@/api/courseService";

// Slice 16.5c (post-cleanup): backend 16.4 deprecated weekly recurrence
// on new POSTs. The form's schedule UI is now a single calendar
// multi-select (DayPicker) + one HH:MM time-of-day that applies to
// every picked date. Edit-mode keeps the read-only summary which still
// handles both legacy weekly and manual_dates shapes.

const MEETING_TYPES = [
  {
    id: "live_class",
    label: "Live Class",
    description: "Student-facing class — supports course linkage",
    icon: GraduationCap,
  },
  {
    id: "internal",
    label: "Internal Meeting",
    description: "Team meeting — no instructor required",
    icon: Building2,
  },
  {
    id: "other",
    label: "Other",
    description: "Anything else — partner calls, webinars",
    icon: Briefcase,
  },
];

const TYPE_LABELS = {
  live_class: "Live Class",
  internal: "Internal",
  other: "Other",
};
const TYPE_TONES = {
  live_class: "brand",
  internal: "amber",
  other: "slate",
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

// Edit-mode read-only summary. Handles both legacy weekly and
// manual_dates shapes — server-side weekly series still exist from
// pre-16.4 days even though new ones are blocked.
function formatLegacySchedule(series) {
  if (!series) return "";
  if (series.scheduleMode === "weekly") {
    const day = WEEKDAY_LONG[series.scheduleConfig?.dayOfWeek] || "?";
    const time = series.scheduleConfig?.time || "?";
    const count = series.scheduleConfig?.occurrenceCount || series.totalOccurrences || 0;
    return `Weekly every ${day} at ${time} IST · ${count} session${count === 1 ? "" : "s"}`;
  }
  const dates = (series.scheduleConfig?.dates || []).slice().sort((a, b) => new Date(a) - new Date(b));
  if (dates.length === 0) return "No dates";
  const first = new Date(dates[0]).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const last = new Date(dates[dates.length - 1]).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return dates.length === 1
    ? `1 date: ${first}`
    : `${dates.length} dates: ${first} → ${last}`;
}

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HHMM_RX = /^\d{2}:\d{2}$/;

export default function MeetingSeriesForm({
  mode = "create",
  initialValues = null,
  onSubmit,
  onCancel,
  submitLabel = "Create series",
}) {
  const isEdit = mode === "edit";
  const iv = initialValues || {};

  /* ---- meeting type + basic info ---- */
  const [meetingType, setMeetingType] = useState(iv.meetingType || "live_class");
  const [title, setTitle] = useState(iv.title || "");
  const [description, setDescription] = useState(iv.description || "");
  const [category, setCategory] = useState(iv.category || "");

  /* ---- instructor + course (live_class only) ---- */
  const [instructor, setInstructor] = useState(iv.instructor || "");
  const [courseId, setCourseId] = useState(iv.course?._id || iv.course || "");

  /* ---- meeting details ---- */
  const [meetingUrl, setMeetingUrl] = useState(iv.meetingUrl || "");
  const [durationMinutes, setDurationMinutes] = useState(iv.durationMinutes ?? 60);

  /* ---- schedule (create-mode only) — calendar multi-select + one time ---- */
  const [selectedDates, setSelectedDates] = useState([]);
  const [meetingTime, setMeetingTime] = useState("18:00");

  /* ---- attendees ---- */
  const [enrolledStudentIds, setEnrolledStudentIds] = useState(() => {
    const initial = iv.attendees?.enrolledStudents || [];
    return new Set(initial.map((s) => (typeof s === "string" ? s : s?._id)).filter(Boolean));
  });
  const [externalInvitees, setExternalInvitees] = useState(
    iv.attendees?.externalInvitees || [],
  );
  const [newExternalEmail, setNewExternalEmail] = useState("");
  const [newExternalName, setNewExternalName] = useState("");

  /* ---- recording ---- */
  const [recordingEnabled, setRecordingEnabled] = useState(
    Boolean(iv.recordingEnabled),
  );

  /* ---- async / external data ---- */
  const [courses, setCourses] = useState([]);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  /* ---- form lifecycle ---- */
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Sort selected dates each render — DayPicker doesn't promise order.
  const sortedSelectedDates = useMemo(
    () => (selectedDates ? [...selectedDates].sort((a, b) => a.getTime() - b.getTime()) : []),
    [selectedDates],
  );

  useEffect(() => {
    courseService
      .getCourses({ limit: 200 })
      .then((data) => setCourses(data?.courses || data || []))
      .catch((err) => {
        console.warn("Could not load courses for picker:", err.message);
      });
  }, []);

  useEffect(() => {
    if (!courseId || meetingType !== "live_class") {
      setEnrolledStudents([]);
      setEnrolledStudentIds(new Set());
      return;
    }
    setLoadingStudents(true);
    courseService
      .listStudents(courseId)
      .then((data) => setEnrolledStudents(data?.students || []))
      .catch((err) => {
        toast.error(err.message || "Could not load enrolled students");
        setEnrolledStudents([]);
      })
      .finally(() => setLoadingStudents(false));
  }, [courseId, meetingType]);

  const handleMeetingTypeChange = (newType) => {
    if (isEdit) return;
    setMeetingType(newType);
    if (newType !== "live_class") {
      setCourseId("");
      setInstructor("");
    }
  };

  const handleAddExternal = () => {
    const email = newExternalEmail.trim().toLowerCase();
    const name = newExternalName.trim();
    if (!email) return toast.error("Enter an email");
    if (!EMAIL_RX.test(email)) return toast.error("Enter a valid email");
    if (externalInvitees.some((inv) => inv.email === email)) {
      return toast.error("This email is already added");
    }
    setExternalInvitees((prev) => [...prev, name ? { email, name } : { email }]);
    setNewExternalEmail("");
    setNewExternalName("");
  };

  const removeSelectedDate = (d) => {
    setSelectedDates((prev) =>
      (prev || []).filter((x) => x.getTime() !== d.getTime()),
    );
  };

  const toggleEnrolledStudent = (id) => {
    setEnrolledStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllStudents = () =>
    setEnrolledStudentIds(new Set(enrolledStudents.map((s) => s._id)));
  const clearAllStudents = () => setEnrolledStudentIds(new Set());

  const allStudentsSelected =
    enrolledStudents.length > 0 &&
    enrolledStudentIds.size === enrolledStudents.length;

  const totalAttendees = enrolledStudentIds.size + externalInvitees.length;

  const validate = useCallback(() => {
    const errs = {};
    if (!title.trim()) errs.title = "Required";
    else if (title.trim().length > 300) errs.title = "Max 300 characters";

    if (meetingType === "live_class" && !instructor.trim()) {
      errs.instructor = "Required for live classes";
    }

    if (!meetingUrl.trim()) {
      errs.meetingUrl = "Required";
    } else {
      try {
        // eslint-disable-next-line no-new
        new URL(meetingUrl.trim());
      } catch {
        errs.meetingUrl = "Must be a valid URL";
      }
    }

    const dm = Number(durationMinutes);
    if (!Number.isFinite(dm) || dm < 5 || dm > 480) {
      errs.durationMinutes = "5–480 minutes";
    }

    // Schedule validation only runs in create mode. Edit mode keeps
    // the existing scheduleConfig unchanged + the parent strips it
    // before PATCH, so it never reaches the server.
    if (!isEdit) {
      if (sortedSelectedDates.length === 0) {
        errs.schedule = "Pick at least one date on the calendar";
      }
      if (!meetingTime || !HHMM_RX.test(meetingTime)) {
        errs.time = "Required (HH:MM)";
      }
    }

    return errs;
  }, [
    title,
    meetingType,
    instructor,
    meetingUrl,
    durationMinutes,
    sortedSelectedDates,
    meetingTime,
    isEdit,
  ]);

  // CREATE-mode payload: combine each calendar date with the single
  // time-of-day in IST (dev machine is IST; for non-IST admins this is
  // the same caveat the backend already documented for weekly mode).
  const buildScheduleConfig = () => {
    const [hh, mm] = meetingTime.split(":").map(Number);
    const datesAsIso = sortedSelectedDates.map((d) => {
      const dt = new Date(d);
      dt.setHours(hh, mm, 0, 0);
      return dt.toISOString();
    });
    return { dates: datesAsIso };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast.error("Please fix the highlighted fields");
      return;
    }
    setSubmitting(true);
    setErrors({});

    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        meetingType,
        instructor:
          meetingType === "live_class" ? instructor.trim() : undefined,
        course: meetingType === "live_class" && courseId ? courseId : null,
        meetingUrl: meetingUrl.trim(),
        durationMinutes: Number(durationMinutes),
        // Always manual_dates now — weekly was retired in 16.4.
        scheduleMode: "manual_dates",
        scheduleConfig: buildScheduleConfig(),
        attendees: {
          enrolledStudents: Array.from(enrolledStudentIds),
          externalInvitees,
        },
        recordingEnabled,
      };
      await onSubmit(payload);
    } catch {
      // Parent shows toast; we just stop the spinner.
    } finally {
      setSubmitting(false);
    }
  };

  const isLiveClass = meetingType === "live_class";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-28">
      {/* ---- Section 1: Meeting type ---- */}
      <section className="card p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <CalendarClock className="h-5 w-5" /> Meeting Type
        </h2>
        {isEdit ? (
          <div className="flex items-center gap-3">
            <Badge tone={TYPE_TONES[meetingType] || "slate"}>
              {TYPE_LABELS[meetingType] || meetingType}
            </Badge>
            <p className="text-xs text-slate-500">
              Meeting type cannot be changed after creation.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {MEETING_TYPES.map((t) => {
              const selected = meetingType === t.id;
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleMeetingTypeChange(t.id)}
                  className={
                    selected
                      ? "rounded-xl border-2 border-brand-500 bg-brand-50 p-4 text-left dark:bg-brand-500/10"
                      : "rounded-xl border-2 border-slate-200 p-4 text-left hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
                  }
                >
                  <Icon
                    className={
                      selected
                        ? "h-5 w-5 text-brand-600"
                        : "h-5 w-5 text-slate-400"
                    }
                  />
                  <div className="mt-2 text-sm font-medium">{t.label}</div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {t.description}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ---- Section 2: Basic info ---- */}
      <section className="card p-6">
        <h2 className="mb-4 text-lg font-semibold">Basic Information</h2>
        <div className="space-y-5">
          <Field label="Title" htmlFor="title" error={errors.title} required>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Weekly Engineering Standup"
              error={errors.title}
              maxLength={300}
            />
          </Field>

          <Field
            label="Description"
            htmlFor="description"
            hint="Shown in the invite email and on the meeting detail page."
          >
            <Textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this meeting about?"
              maxLength={5000}
            />
          </Field>

          <Field
            label="Category"
            htmlFor="category"
            hint="Optional label for grouping (e.g. Engineering, Marketing)."
          >
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              maxLength={100}
            />
          </Field>
        </div>
      </section>

      {/* ---- Section 3: Instructor + course (live_class only) ---- */}
      {isLiveClass && (
        <section className="card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <GraduationCap className="h-5 w-5" /> Instructor &amp; Course
          </h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Instructor"
              htmlFor="instructor"
              error={errors.instructor}
              required
            >
              <Input
                id="instructor"
                value={instructor}
                onChange={(e) => setInstructor(e.target.value)}
                placeholder="Anika Rao"
                error={errors.instructor}
                maxLength={200}
              />
            </Field>

            <Field
              label="Course"
              htmlFor="course"
              hint="Optional — pick a course to auto-suggest enrolled students."
            >
              <Select
                id="course"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
              >
                <option value="">No course (standalone)</option>
                {courses.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.title}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </section>
      )}

      {/* ---- Section 4: Meeting details ---- */}
      <section className="card p-6">
        <h2 className="mb-4 text-lg font-semibold">Meeting Details</h2>
        <div className="space-y-5">
          <Field
            label="Meeting URL"
            htmlFor="meetingUrl"
            error={errors.meetingUrl}
            hint="Zoom, Google Meet, or any join link."
            required
          >
            <Input
              id="meetingUrl"
              type="url"
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              placeholder="https://meet.google.com/abc-defg-hij"
              error={errors.meetingUrl}
              maxLength={1000}
            />
          </Field>

          <Field
            label="Duration (minutes)"
            htmlFor="durationMinutes"
            error={errors.durationMinutes}
            required
          >
            <Input
              id="durationMinutes"
              type="number"
              min="5"
              max="480"
              step="5"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              error={errors.durationMinutes}
              className="max-w-xs"
            />
          </Field>
        </div>
      </section>

      {/* ---- Section 5: Schedule ---- */}
      <section className="card p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Calendar className="h-5 w-5" /> Schedule
        </h2>

        {isEdit ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/40">
            <p className="text-sm">{formatLegacySchedule(iv)}</p>
            <p className="mt-2 text-xs text-slate-500">
              To change the schedule, cancel this series and create a new one.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                Pick dates
              </h3>
              <div className="rdp-host rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <DayPicker
                  mode="multiple"
                  selected={selectedDates}
                  onSelect={(dates) => setSelectedDates(dates || [])}
                  disabled={{ before: new Date() }}
                  weekStartsOn={1}
                  showOutsideDays
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Click dates to add or remove from the schedule. Past dates are disabled.
              </p>
            </div>

            {sortedSelectedDates.length > 0 && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/40">
                <p className="mb-2 text-sm font-medium">
                  Selected: {sortedSelectedDates.length} session
                  {sortedSelectedDates.length === 1 ? "" : "s"}
                </p>
                <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
                  {sortedSelectedDates.map((d) => (
                    <li
                      key={d.getTime()}
                      className="flex items-center justify-between gap-3"
                    >
                      <span>
                        {d.toLocaleDateString("en-IN", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeSelectedDate(d)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {errors.schedule && (
              <p className="text-xs font-medium text-red-500">{errors.schedule}</p>
            )}

            <Field
              label="Time (IST)"
              htmlFor="meetingTime"
              error={errors.time}
              hint="All selected dates will use this time. 24-hour clock."
              required
            >
              <Input
                id="meetingTime"
                type="time"
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.target.value)}
                step="900"
                error={errors.time}
                className="max-w-xs"
                required
              />
            </Field>
          </div>
        )}
      </section>

      {/* ---- Section 6: Attendees ---- */}
      <section className="card p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Users className="h-5 w-5" /> Attendees ({totalAttendees})
        </h2>

        {isLiveClass && courseId && (
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Enrolled students ({enrolledStudents.length})
              </h3>
              {enrolledStudents.length > 0 && (
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={selectAllStudents}
                    className="text-brand-600 hover:underline"
                  >
                    Select all
                  </button>
                  <span className="text-slate-300">·</span>
                  <button
                    type="button"
                    onClick={clearAllStudents}
                    className="text-slate-500 hover:underline"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {loadingStudents ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Spinner size="sm" /> Loading students…
              </div>
            ) : enrolledStudents.length === 0 ? (
              <p className="text-xs text-slate-500">
                No students enrolled in this course yet.
              </p>
            ) : (
              <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
                {enrolledStudents.map((s) => {
                  const checked = enrolledStudentIds.has(s._id);
                  return (
                    <label
                      key={s._id}
                      className="flex cursor-pointer items-center gap-3 border-b border-slate-100 px-3 py-2 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleEnrolledStudent(s._id)}
                        className="h-4 w-4"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm">{s.name}</div>
                        <div className="truncate text-xs text-slate-500">
                          {s.email}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
            {allStudentsSelected && enrolledStudents.length > 0 && (
              <p className="mt-2 text-xs text-emerald-600">
                All {enrolledStudents.length} enrolled students selected.
              </p>
            )}
          </div>
        )}

        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            External invitees ({externalInvitees.length})
          </h3>

          {externalInvitees.length > 0 && (
            <ul className="mb-3 space-y-1.5 text-sm">
              {externalInvitees.map((inv) => (
                <li
                  key={inv.email}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{inv.name || "—"}</div>
                    <div className="truncate text-xs text-slate-500">
                      {inv.email}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setExternalInvitees((prev) =>
                        prev.filter((i) => i.email !== inv.email),
                      )
                    }
                    className="text-slate-400 hover:text-red-500"
                    aria-label="Remove invitee"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <Input
              type="email"
              placeholder="email@example.com"
              value={newExternalEmail}
              onChange={(e) => setNewExternalEmail(e.target.value)}
            />
            <Input
              type="text"
              placeholder="Name (optional)"
              value={newExternalName}
              onChange={(e) => setNewExternalName(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              icon={Plus}
              onClick={handleAddExternal}
            >
              Add
            </Button>
          </div>
        </div>
      </section>

      {/* ---- Section 7: Recording ---- */}
      <section className="card p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Video className="h-5 w-5" /> Recording
        </h2>
        <Toggle
          checked={recordingEnabled}
          onChange={setRecordingEnabled}
          label={recordingEnabled ? "Recording enabled" : "Recording disabled"}
          description="When enabled, attendees are told in the invite email that the session will be recorded."
        />
      </section>

      {/* ---- Sticky submit bar ---- */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900 lg:left-64">
        <div className="mx-auto flex max-w-5xl items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={submitting}>
            {submitting ? "Saving…" : submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
