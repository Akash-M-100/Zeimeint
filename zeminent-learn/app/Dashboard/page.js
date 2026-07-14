"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  SearchIcon,
  BellIcon,
  ArrowRightIcon,
  ClockIcon,
  CalendarIcon,
  BookIcon,
  PlayCircleIcon,
  LockIcon,
  BroadcastIcon,
  CheckCircleIcon,
  MedalIcon,
  DownloadIcon,
  GraduationCapIcon,
} from "../components/Icons";
import { useAuth } from "../components/AuthProvider";

// ─── live-data plumbing ───────────────────────────────────────────────────────
//
// Every surface on this dashboard is driven by real sources:
//   • enrolled courses        → /api/me (purchasedCourses)
//   • learning path courses    → /api/path (completed/unlocked from backend)
//   • per-course progress      → /api/progress/summary (percent, watched/total)
//   • upcoming live sessions   → /api/live-classes
// Derived metrics (completed, certificates, learning hours) are computed from
// the above — no fabricated sample data.

const POLL_MS = 2 * 60 * 1000;

// ─── small helpers ────────────────────────────────────────────────────────────

// Real watch time → H:MM:SS. Source is the summed `watchedSeconds` from the
// learner's progress records (per-lecture furthest-watched position).
function fmtHMS(totalSeconds) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${h}:${pad(m)}:${pad(sec)}`;
}

function relativeWhen(iso, now = Date.now()) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const diff = t - now;
  if (diff <= 0) {
    const ago = Math.round(-diff / 60000);
    if (ago < 1) return "just now";
    if (ago < 60) return `${ago}m ago`;
    const hrs = Math.round(ago / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.round(hrs / 24);
    return `${days}d ago`;
  }
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `in ${hrs}h`;
  const days = Math.round(hrs / 24);
  return `in ${days}d`;
}

function fmtDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtSessionDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function deriveLiveStatus(c, now = Date.now()) {
  if (c.statusOverride === "cancelled" || c.status === "cancelled") return "cancelled";
  const start = new Date(c.startTime).getTime();
  const end = start + (c.durationMinutes || 0) * 60000;
  if (now < start) return "scheduled";
  if (now >= start && now <= end) return "live";
  return "ended";
}

function statusFor(course) {
  if (course.percent >= 100) return "completed";
  if (course.percent > 0 || course.watched > 0) return "in_progress";
  return "not_started";
}

function resumeHref(course) {
  if (!course.id) return "/courses";
  if (course.locked) return "/Dashboard";
  return course.lastLectureId
    ? `/courses/${course.id}?lecture=${course.lastLectureId}`
    : `/courses/${course.id}`;
}

function sequentialUnlocks(list) {
  const unlockedById = new Map();
  const ordered = [...list]
    .filter((course) => course && (course._id || course.id))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  for (let index = 0; index < ordered.length; index += 1) {
    const course = ordered[index];
    const id = String(course._id || course.id);
    const previous = index > 0 ? ordered[index - 1] : null;
    const previousCompleted = previous?.completed === true;
    unlockedById.set(id, index === 0 || course.completed === true || previousCompleted);
  }

  return unlockedById;
}

// ─── the data hook ────────────────────────────────────────────────────────────

function useDashboardData() {
  const [enrolled, setEnrolled] = useState(null); // null = loading
  const [pathCourses, setPathCourses] = useState([]);
  const [liveClasses, setLiveClasses] = useState([]);
  const [progress, setProgress] = useState([]);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    const [meRes, coursesRes, liveRes, progressRes] = await Promise.allSettled([
      fetch("/api/me", { cache: "no-store" }),
      fetch("/api/path", { cache: "no-store" }),
      fetch("/api/live-classes", { cache: "no-store" }),
      fetch("/api/progress/summary", { cache: "no-store" }),
    ]);

    if (!mounted.current) return;

    if (meRes.status === "fulfilled") {
      if (meRes.value.ok) {
        const json = await meRes.value.json().catch(() => ({}));
        const courses = json?.data?.user?.purchasedCourses ?? json?.user?.purchasedCourses;
        setEnrolled(Array.isArray(courses) ? courses : []);
      } else {
        setEnrolled([]);
      }
    } else if (meRes.status === "rejected") {
      setEnrolled([]);
    }

    if (coursesRes.status === "fulfilled" && coursesRes.value.ok) {
      const json = await coursesRes.value.json().catch(() => ({}));
      const list = json?.courses || json?.data?.courses || [];
      if (mounted.current && Array.isArray(list)) setPathCourses(list);
    }

    if (liveRes.status === "fulfilled" && liveRes.value.status !== 503) {
      const json = await liveRes.value.json().catch(() => ({}));
      const list = json?.data?.liveClasses;
      if (mounted.current && Array.isArray(list)) setLiveClasses(list);
    }

    if (progressRes.status === "fulfilled" && progressRes.value.ok) {
      const json = await progressRes.value.json().catch(() => ({}));
      const list = json?.data?.summary;
      if (mounted.current && Array.isArray(list)) setProgress(list);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  return { enrolled, pathCourses, liveClasses, progress };
}

// ─── 1 · header ───────────────────────────────────────────────────────────────

function TopBar({ query, setQuery, taskCount }) {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] ?? "there";
  const initial = (user?.name?.[0] ?? "?").toUpperCase();

  const [now, setNow] = useState(null);
  useEffect(() => {
    setNow(new Date());
  }, []);
  const dateLabel = now
    ? now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
    : "";

  return (
    <header className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono-label">{dateLabel || "loading…"}</span>
          {user?.hasFullAccess && (
            <span className="font-mono text-[10px] uppercase tracking-wider text-accent-2 bg-accent-soft px-2 py-0.5 rounded-full border border-accent-2/30">
              Full Access
            </span>
          )}
        </div>
        <h1 className="font-display text-2xl md:text-3xl text-white leading-tight">
          Welcome back, <span className="text-accent">{firstName}</span> 👋
        </h1>
        <p className="text-sm text-muted-2 mt-1">Here&apos;s what&apos;s happening with your learning today.</p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <label className="relative flex items-center">
          <span className="absolute left-3.5 text-muted-2 pointer-events-none">
            <SearchIcon width={16} height={16} />
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your courses…"
            className="w-full sm:w-64 pl-10 pr-4 py-2.5 rounded-full bg-card border border-border text-sm text-white placeholder:text-muted focus:outline-none focus:border-border-strong transition-colors"
          />
        </label>

        <button
          type="button"
          aria-label="Notifications"
          className="relative size-11 rounded-full border border-border bg-card grid place-items-center text-muted-2 hover:text-white hover:border-border-strong transition-colors"
        >
          <BellIcon width={18} height={18} />
          {taskCount > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full bg-accent-violet text-bg text-[11px] font-medium grid place-items-center">
              {taskCount}
            </span>
          ) : null}
        </button>

        <Link
          href="/Profile"
          aria-label="Your profile"
          className="size-11 rounded-full grid place-items-center text-bg font-semibold shrink-0 bg-gradient-to-br from-accent to-accent-violet hover:opacity-90 transition-opacity"
        >
          {initial}
        </Link>
      </div>
    </header>
  );
}

// ─── 2 · statistics cards ─────────────────────────────────────────────────────

const STAT_TINTS = {
  violet: "bg-accent-violet/15 text-accent-violet",
  teal: "bg-accent-soft text-accent-2",
  warm: "bg-accent-warm/15 text-accent-warm",
};

function StatCard({ icon: Icon, value, label, tint = "violet", loading }) {
  return (
    <article className="card p-5 flex items-center gap-4">
      <div className={`size-12 rounded-2xl grid place-items-center shrink-0 ${STAT_TINTS[tint]}`}>
        <Icon width={22} height={22} />
      </div>
      <div className="min-w-0">
        <div className="text-2xl md:text-3xl font-semibold text-white leading-none tabular-nums whitespace-nowrap">
          {loading ? <span className="inline-block h-7 w-10 rounded bg-card-2 animate-pulse align-middle" /> : value}
        </div>
        <div className="text-xs text-muted-2 mt-1.5">{label}</div>
      </div>
    </article>
  );
}

function StatsRow({ stats, loading }) {
  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard icon={BookIcon} value={stats.enrolled} label="Enrolled Courses" tint="violet" loading={loading} />
      <StatCard icon={CheckCircleIcon} value={stats.completed} label="Completed Courses" tint="teal" loading={loading} />
      <StatCard icon={MedalIcon} value={stats.certificates} label="Certificates Earned" tint="warm" loading={loading} />
      <StatCard icon={ClockIcon} value={stats.time} label="Learning Hours" tint="violet" loading={loading} />
    </section>
  );
}

// ─── shared bits ──────────────────────────────────────────────────────────────

function ProgressBar({ percent }) {
  return (
    <div className="h-1.5 bg-card-2 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-r from-accent to-accent-violet transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}

function Thumb({ src, className = "" }) {
  return (
    <div className={`overflow-hidden bg-card-2 grid place-items-center shrink-0 ${className}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <BookIcon width={22} height={22} className="text-muted" />
      )}
    </div>
  );
}

const STATUS_BADGE = {
  completed: "text-accent-2 border-accent-2/30 bg-accent-soft",
  in_progress: "text-accent-violet border-accent-violet/30 bg-accent-violet/10",
  not_started: "text-muted-2 border-border bg-white/5",
};
const STATUS_LABEL = {
  completed: "Completed",
  in_progress: "In Progress",
  not_started: "Not Started",
};

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border ${STATUS_BADGE[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function LockedBadge() {
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border border-border bg-white/5 text-muted-2">
      <LockIcon width={12} height={12} />
      Locked
    </span>
  );
}

function SectionHead({ label, title, href, cta }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <div className="font-mono-label">{label}</div>
        <h2 className="font-display text-lg text-white mt-0.5">{title}</h2>
      </div>
      {href ? (
        <Link
          href={href}
          className="font-mono text-[12px] text-accent-2 hover:text-white transition-colors inline-flex items-center gap-1 shrink-0"
        >
          {cta || "View all"} <ArrowRightIcon width={12} height={12} />
        </Link>
      ) : null}
    </div>
  );
}

// ─── 3 · continue learning ────────────────────────────────────────────────────

function ContinueLearning({ courses, loading }) {
  return (
    <section className="flex flex-col gap-4">
      <SectionHead label="pick up where you left off" title="Continue Learning" href="/courses" cta="Browse" />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card h-64 animate-pulse" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="card p-8 flex flex-col items-center text-center gap-3">
          <PlayCircleIcon width={28} height={28} className="text-muted" />
          <p className="text-sm text-muted-2 max-w-xs">
            Nothing in progress yet. Explore the catalogue and start your first lesson.
          </p>
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent-2 text-bg px-4 py-2 rounded-full text-sm font-medium transition-colors"
          >
            Browse courses <ArrowRightIcon width={14} height={14} />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {courses.map((c) => (
            <article key={c.id} className="card overflow-hidden flex flex-col group">
              <Thumb src={c.thumbnail} className="aspect-[16/9] w-full rounded-none" />
              <div className="p-5 flex flex-col gap-4 flex-1">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-white truncate">{c.title}</h3>
                  <p className="text-xs text-muted-2 mt-1">{c.instructor}</p>
                </div>
                {c.locked ? (
                  <div className="rounded-xl border border-border bg-white/[0.02] px-3 py-2 text-xs text-muted-2 flex items-center gap-2">
                    <LockIcon width={14} height={14} />
                    Complete the previous course to unlock
                  </div>
                ) : null}
                <div className="mt-auto flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-2">Progress</span>
                    <span className="text-white font-medium">{c.percent}%</span>
                  </div>
                  <ProgressBar percent={c.percent} />
                </div>
                {c.locked ? (
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center justify-center gap-2 bg-card-2 text-muted px-4 py-2.5 rounded-full text-sm font-medium cursor-not-allowed"
                  >
                    Locked <LockIcon width={14} height={14} />
                  </button>
                ) : (
                  <Link
                    href={resumeHref(c)}
                    className="inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-2 text-bg px-4 py-2.5 rounded-full text-sm font-medium transition-colors"
                  >
                    {c.completed ? "Review" : "Continue Learning"} <ArrowRightIcon width={14} height={14} />
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

// ─── 4 · my courses (table on desktop, cards on mobile) ───────────────────────

function MyCourses({ courses, loading }) {
  return (
    <section className="flex flex-col gap-4">
      <SectionHead label="your library" title="My Courses" href="/courses" />

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-6 flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-card-2 animate-pulse" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-2">
            No courses match. Once you enrol, they&apos;ll appear here.
          </p>
        ) : (
          <>
            {/* desktop table */}
            <table className="hidden md:table w-full text-sm">
              <thead>
                <tr className="text-left font-mono-label border-b border-border">
                  <th className="font-normal px-6 py-3">Course</th>
                  <th className="font-normal px-6 py-3">Instructor</th>
                  <th className="font-normal px-6 py-3 w-48">Progress</th>
                  <th className="font-normal px-6 py-3">Status</th>
                  <th className="font-normal px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-b-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <Thumb src={c.thumbnail} className="size-10 rounded-lg" />
                        <span className="text-white truncate max-w-[220px]">{c.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-2">{c.instructor}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <ProgressBar percent={c.percent} />
                        </div>
                        <span className="text-xs text-muted-2 w-9 text-right">{c.percent}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {c.locked ? <LockedBadge /> : <StatusBadge status={statusFor(c)} />}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {c.locked ? (
                        <button
                          type="button"
                          disabled
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-mono border border-border text-muted cursor-not-allowed"
                        >
                          Locked <LockIcon width={12} height={12} />
                        </button>
                      ) : (
                        <Link
                          href={resumeHref(c)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-mono border border-border text-muted-2 hover:text-white hover:border-border-strong transition-colors"
                        >
                          {statusFor(c) === "completed" ? "Review" : statusFor(c) === "not_started" ? "Start" : "Resume"}
                          <ArrowRightIcon width={12} height={12} />
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* mobile cards */}
            <ul className="md:hidden divide-y divide-border">
              {courses.map((c) => (
                <li key={c.id} className="p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Thumb src={c.thumbnail} className="size-11 rounded-lg" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-white truncate">{c.title}</div>
                      <div className="text-xs text-muted-2 truncate">{c.instructor}</div>
                    </div>
                    {c.locked ? <LockedBadge /> : <StatusBadge status={statusFor(c)} />}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <ProgressBar percent={c.percent} />
                    </div>
                    <span className="text-xs text-muted-2">{c.percent}%</span>
                    {c.locked ? (
                      <button
                        type="button"
                        disabled
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-mono border border-border text-muted cursor-not-allowed"
                      >
                        Locked
                      </button>
                    ) : (
                      <Link
                        href={resumeHref(c)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-mono border border-border text-muted-2"
                      >
                        {statusFor(c) === "completed" ? "Review" : statusFor(c) === "not_started" ? "Start" : "Resume"}
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}

// ─── 5 · curriculum roadmap ───────────────────────────────────────────────────

function Curriculum({ courses, loading }) {
  const visible = courses.slice(0, 4);
  const total = courses.length;
  const completed = courses.filter((c) => c.percent >= 100).length;
  const avg = courses.length
    ? Math.round(courses.reduce((sum, c) => sum + (c.percent || 0), 0) / courses.length)
    : 0;
  const ringStyle = { background: `conic-gradient(#5ce6d0 ${avg * 3.6}deg, rgba(255,255,255,0.08) 0deg)` };

  return (
    <section id="curriculum" className="flex flex-col gap-4 scroll-mt-8">
      <SectionHead label="course path" title="Curriculum" />
      <div className="card overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr_280px]">
        <div className="p-5 md:p-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <h3 className="text-sm font-semibold text-white">Curriculum Roadmap</h3>
            <span className="rounded-full bg-accent text-bg text-[11px] font-medium px-3 py-1">
              Learn Completion
            </span>
          </div>

          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-card-2 animate-pulse" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <p className="text-sm text-muted-2 py-6">Your curriculum will appear after you enrol in a course.</p>
          ) : (
            <ol className="relative flex flex-col gap-3 before:absolute before:left-4 before:top-4 before:bottom-4 before:w-px before:bg-accent/25">
              {visible.map((c, i) => {
                const status = statusFor(c);
                const active = !c.locked && status !== "not_started";
                return (
                  <li key={c.id} className="relative grid grid-cols-[32px_1fr] gap-3">
                    <span
                      className={`relative z-10 mt-4 size-8 rounded-full border grid place-items-center ${
                        c.locked
                          ? "border-border bg-card-2 text-muted"
                          : active
                            ? "border-accent bg-accent-soft text-accent-2 shadow-[0_0_18px_rgba(92,230,208,0.25)]"
                            : "border-accent/40 bg-card text-accent-2"
                      }`}
                    >
                      {c.locked ? <LockIcon width={13} height={13} /> : <CheckCircleIcon width={14} height={14} />}
                    </span>
                    <div
                      className={`rounded-xl border p-4 ${
                        active
                          ? "border-accent/50 bg-accent-soft/50"
                          : c.locked
                            ? "border-border bg-white/[0.02]"
                            : "border-border bg-card/70"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-white truncate">
                            Week {i + 1}: {c.title}
                          </h4>
                          <p className="text-[11px] text-muted-2 mt-1">
                            {c.locked ? "Complete previous course to unlock" : `${c.watched}/${c.total || "?"} lessons complete`}
                          </p>
                        </div>
                        <span className="font-mono text-[11px] text-accent-2 shrink-0">{c.percent}%</span>
                      </div>
                      <div className="mt-3">
                        <ProgressBar percent={c.percent} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <aside className="border-t lg:border-t-0 lg:border-l border-border bg-accent-soft/20 p-6 flex flex-col items-center justify-center gap-6">
          <div className="size-36 rounded-full p-3 shadow-[0_0_30px_rgba(92,230,208,0.22)]" style={ringStyle}>
            <div className="size-full rounded-full bg-card grid place-items-center text-center">
              <div>
                <div className="text-[11px] text-muted-2">Course Completion</div>
                <div className="text-3xl font-semibold text-accent-2 tabular-nums">{avg}%</div>
              </div>
            </div>
          </div>
          <div className="w-full">
            <h3 className="text-sm font-semibold text-white mb-3">Unlocked Milestones</h3>
            <div className="rounded-xl border border-accent-2/20 bg-accent-soft p-3 flex items-center gap-3">
              <span className="size-10 rounded-lg bg-accent-warm/15 text-accent-warm grid place-items-center">
                <MedalIcon width={21} height={21} />
              </span>
              <div className="min-w-0">
                <div className="text-sm text-white truncate">{completed > 0 ? "Course Hero" : "Getting Started"}</div>
                <div className="text-[11px] text-muted-2">{completed}/{total} courses complete</div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

// ─── 6 · recent activity (timeline) ───────────────────────────────────────────

const ACTIVITY_ICON = {
  certificate: { Icon: MedalIcon, tint: STAT_TINTS.warm },
  completed: { Icon: CheckCircleIcon, tint: STAT_TINTS.teal },
  lesson: { Icon: PlayCircleIcon, tint: STAT_TINTS.violet },
};

function RecentActivity({ items }) {
  return (
    <section className="card p-6 flex flex-col gap-5 h-full">
      <SectionHead label="timeline" title="Recent Activity" />
      {items.length === 0 ? (
        <div className="flex flex-col items-center text-center gap-2 py-8">
          <ClockIcon width={22} height={22} className="text-muted" />
          <p className="text-sm text-muted-2">No activity yet. Start a lesson to begin your timeline.</p>
        </div>
      ) : (
        <ul className="flex flex-col">
          {items.map((a, i) => {
            const { Icon, tint } = ACTIVITY_ICON[a.type] ?? ACTIVITY_ICON.lesson;
            const last = i === items.length - 1;
            return (
              <li key={a.id} className="flex gap-4">
                {/* rail */}
                <div className="flex flex-col items-center">
                  <span className={`size-9 rounded-full grid place-items-center shrink-0 ${tint}`}>
                    <Icon width={16} height={16} />
                  </span>
                  {!last ? <span className="w-px flex-1 bg-border my-1" /> : null}
                </div>
                <div className={`min-w-0 flex-1 ${last ? "" : "pb-5"}`}>
                  <div className="text-sm text-white">{a.title}</div>
                  <div className="font-mono text-[11px] text-muted-2 mt-0.5">
                    {a.detail}
                    {a.detail && a.when ? " · " : ""}
                    {a.when ? relativeWhen(a.when) : ""}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ─── 6 · upcoming tasks ───────────────────────────────────────────────────────

function UpcomingTasks({ sessions }) {
  return (
    <section className="card p-6 flex flex-col gap-5 h-full">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono-label">what&apos;s next</div>
          <h2 className="font-display text-lg text-white mt-0.5">Upcoming Tasks</h2>
        </div>
        <CalendarIcon className="text-muted-2" width={18} height={18} />
      </div>
      {sessions.length === 0 ? (
        <div className="flex flex-col items-center text-center gap-2 py-8">
          <BroadcastIcon width={22} height={22} className="text-muted" />
          <p className="text-sm text-muted-2">No live sessions or deadlines scheduled right now.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {sessions.map((d) => {
            const live = d._status === "live";
            return (
              <li
                key={d._id}
                className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-border-strong transition-colors"
              >
                <span
                  className={`size-9 rounded-lg grid place-items-center shrink-0 ${
                    live ? "bg-rose-300/10 text-rose-300" : STAT_TINTS.violet
                  }`}
                >
                  <BroadcastIcon width={16} height={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white truncate">{d.title}</div>
                  <div className="font-mono text-[11px] text-muted-2 mt-0.5">
                    {live ? "Live class · happening now" : `${d.category || "Live class"} · ${fmtSessionDate(d.startTime)}`}
                  </div>
                </div>
                <span
                  className={`font-mono text-[11px] shrink-0 px-2.5 py-1 rounded-full border ${
                    live ? "text-rose-300 border-rose-300/30 bg-rose-300/10" : "text-accent-2 border-accent-2/30 bg-accent-soft"
                  }`}
                >
                  {live ? "Join" : relativeWhen(d.startTime)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ─── 7 · certificates ─────────────────────────────────────────────────────────

function Certificates({ certs }) {
  return (
    <section className="flex flex-col gap-4">
      <SectionHead label="your achievements" title="Certificates" href="/Dashboard/Certificate" cta="View all" />
      {certs.length === 0 ? (
        <div className="card p-8 flex flex-col items-center text-center gap-3">
          <GraduationCapIcon width={28} height={28} className="text-muted" />
          <p className="text-sm text-muted-2 max-w-sm">
            Complete a course to earn your first verifiable certificate. They&apos;ll show up here, ready to download.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {certs.map((c) => (
            <article key={c.id} className="card p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <span className="size-11 rounded-2xl grid place-items-center bg-accent-warm/15 text-accent-warm shrink-0">
                  <MedalIcon width={22} height={22} />
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border border-accent-2/30 bg-accent-soft text-accent-2">
                  Earned
                </span>
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-white">{c.title}</h3>
                <p className="font-mono text-[11px] text-muted-2 mt-1">
                  Completed {c.date ? fmtDate(c.date) : "recently"}
                </p>
              </div>
              <Link
                href="/Dashboard/Certificate"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-border text-sm text-muted-2 hover:text-white hover:border-border-strong transition-colors"
              >
                <DownloadIcon width={14} height={14} /> Download
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { enrolled, pathCourses, liveClasses, progress } = useDashboardData();
  const [query, setQuery] = useState("");
  const loading = enrolled === null;

  // Slice 12: /checkout's 409 path (user already owns Full Access) redirects
  // here with ?toast=already-have-full-access. Read it once on mount, show
  // an accent-tinted pill, then strip the param from the URL so a reload
  // doesn't re-fire the toast.
  const searchParams = useSearchParams();
  const [toast, setToast] = useState(null);
  useEffect(() => {
    const t = searchParams.get("toast");
    if (t === "already-have-full-access") {
      setToast("You already have Full Access");
      const url = new URL(window.location.href);
      url.searchParams.delete("toast");
      window.history.replaceState(null, "", url.toString());
    }
  }, [searchParams]);
  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  // Merge enrolled courses with catalogue metadata (instructor, thumbnail) and
  // per-course progress into one shape the UI components consume.
  //
  // The list is the UNION of enrolled (purchased) courses and any course the
  // viewer has progress on — watching a free/preview video records progress
  // without enrolment, and that course (and its completion) should still show
  // up here.
  const courses = useMemo(() => {
    if (!enrolled) return [];
    const pathById = new Map(pathCourses.map((c) => [String(c._id || c.id), c]));
    const progById = new Map(progress.map((p) => [String(p.courseId), p]));
    const sequentialUnlockedById = sequentialUnlocks(pathCourses);

    return pathCourses
      .map((course) => {
        const id = String(course._id || course.id || "");
        const pathCourse = pathById.get(id) || {};
        const prog = progById.get(id) || {};
        const unlocked = sequentialUnlockedById.get(id) === true;
        return {
          id,
          enrolled: true,
          title: pathCourse.title || prog.title || "Untitled course",
          instructor: pathCourse.createdBy?.name || "Zeminent Faculty",
          category: pathCourse.category || "",
          order: pathCourse.order ?? 0,
          thumbnail: pathCourse.thumbnail || "",
          completed: pathCourse.completed === true,
          unlocked,
          locked: !unlocked,
          percent: pathCourse.completed ? 100 : Math.min(100, Math.max(0, prog.percent ?? 0)),
          watched: prog.watchedLectures ?? 0,
          total: prog.totalLectures ?? pathCourse.lectures?.length ?? 0,
          lastLectureId: prog.lastLectureId || null,
          lastWatchedAt: prog.lastWatchedAt || null,
        };
      })
      // Drop entries we can't name — deleted courses (orphaned purchase or
      // progress) surface as "Untitled course" and shouldn't be shown.
      .filter((c) => c.title && c.title !== "Untitled course");
  }, [enrolled, pathCourses, progress]);

  const q = query.trim().toLowerCase();
  const matches = useCallback(
    (c) => !q || c.title.toLowerCase().includes(q) || c.instructor.toLowerCase().includes(q),
    [q],
  );

  // Stat tiles — all derived from real progress.
  const stats = useMemo(() => {
    const completed = courses.filter((c) => c.percent >= 100).length;
    const totalSeconds = progress.reduce((a, p) => a + (p.watchedSeconds || 0), 0);
    return {
      enrolled: courses.length,
      completed,
      certificates: completed, // certificate is issued at 100% completion
      time: fmtHMS(totalSeconds), // real watch time, H:MM:SS
    };
  }, [courses, progress]);

  // Continue learning: in-progress first; fall back to anything enrolled.
  const continueCourses = useMemo(() => {
    const inProgress = courses.filter((c) => !c.locked && c.percent > 0 && c.percent < 100);
    const pool = inProgress.length ? inProgress : courses.filter((c) => c.percent < 100);
    return pool.filter(matches).slice(0, 3);
  }, [courses, matches]);

  const myCourses = useMemo(() => courses.filter(matches), [courses, matches]);

  // Recent activity from real per-course timestamps.
  const activityItems = useMemo(() => {
    return progress
      .filter((p) => p.lastWatchedAt)
      .sort((a, b) => new Date(b.lastWatchedAt) - new Date(a.lastWatchedAt))
      .slice(0, 5)
      .map((p) => {
        const done = (p.percent ?? 0) >= 100;
        return {
          id: p.courseId,
          type: done ? "certificate" : "lesson",
          title: done ? `Completed “${p.title || "a course"}”` : `Watched a lecture in “${p.title || "a course"}”`,
          detail: done ? "Certificate earned" : `${p.watchedLectures}/${p.totalLectures} lessons`,
          when: p.lastWatchedAt,
        };
      });
  }, [progress]);

  // Upcoming live sessions (real).
  const upcomingSessions = useMemo(() => {
    const now = Date.now();
    return liveClasses
      .map((c) => ({ ...c, _status: deriveLiveStatus(c, now) }))
      .filter((c) => c._status === "live" || c._status === "scheduled")
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
      .slice(0, 5);
  }, [liveClasses]);

  // Certificates from completed courses.
  const certs = useMemo(
    () =>
      courses
        .filter((c) => c.percent >= 100)
        .map((c) => ({ id: c.id, title: c.title, date: c.lastWatchedAt })),
    [courses],
  );

  return (
    <div className="max-w-300 mx-auto px-6 md:px-8 py-8 md:py-10 flex flex-col gap-8">
      <TopBar query={query} setQuery={setQuery} taskCount={upcomingSessions.length} />

      <StatsRow stats={stats} loading={loading} />

      <ContinueLearning courses={continueCourses} loading={loading} />

      <MyCourses courses={myCourses} loading={loading} />

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity items={activityItems} />
        <UpcomingTasks sessions={upcomingSessions} />
      </section>

      <Certificates certs={certs} />

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-accent-soft border border-accent-2/30 text-sm text-accent-2 shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
