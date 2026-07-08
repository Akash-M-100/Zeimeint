"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BroadcastIcon,
  CalendarIcon,
  ClockIcon,
  UsersIcon,
  ArrowRightIcon,
} from "../../components/Icons";

// ─── helpers ────────────────────────────────────────────────────────────────

function deriveStatus(c, now = Date.now()) {
  if (c.statusOverride === "cancelled" || c.status === "cancelled") return "cancelled";
  const start = new Date(c.startTime).getTime();
  const end = start + (c.durationMinutes || 0) * 60 * 1000;
  if (now < start) return "scheduled";
  if (now <= end) return "live";
  return "ended";
}

function relativeTime(target, now = Date.now()) {
  const diff = new Date(target).getTime() - now;
  const abs = Math.abs(diff);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const inFuture = diff > 0;

  let label;
  if (abs < minute) label = "just now";
  else if (abs < hour) label = `${Math.round(abs / minute)} min`;
  else if (abs < day) label = `${Math.round(abs / hour)} hr`;
  else label = `${Math.round(abs / day)} day${Math.round(abs / day) === 1 ? "" : "s"}`;

  if (abs < minute) return label;
  return inFuture ? `in ${label}` : `${label} ago`;
}

function fmtClock(ms) {
  if (ms <= 0) return "00:00";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = m.toString().padStart(2, "0");
  const ss = sec.toString().padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function fmtDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function toGoogleCalendarDate(date) {
  const value = new Date(date);
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function buildGoogleCalendarUrl(session) {
  const start = new Date(session.startTime);
  const end = new Date(start.getTime() + (session.durationMinutes || 0) * 60 * 1000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: session.title || "Zeminent Live Class",
    dates: `${toGoogleCalendarDate(start)}/${toGoogleCalendarDate(end)}`,
    details: session.description || "",
    location: session.meetingUrl || "",
    trp: "false",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// ─── top bar ────────────────────────────────────────────────────────────────

function TopBar({ liveCount, onShowUpcoming }) {
  return (
    <header className="flex items-start justify-between gap-6">
      <div className="min-w-0">
        <div className="font-mono-label mb-3 flex items-center gap-2">
          <BroadcastIcon className="text-accent-2" width={14} height={14} />
          live classes
        </div>
        <h1 className="font-display text-4xl md:text-5xl leading-[1.05]">
          {liveCount > 0 ? (
            <>
              <span className="text-accent-2">{liveCount}</span> session
              {liveCount === 1 ? "" : "s"} live right now.
            </>
          ) : (
            <>Sessions, scheduled and live.</>
          )}
        </h1>
        <p className="text-sm text-muted-2 mt-3 max-w-xl leading-relaxed">
          Join live workshops, office hours, and AMAs with cohort instructors.
          Recordings show up here within a few hours.
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
        <a
          href="https://calendar.google.com/calendar/u/0/r/eventedit"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-white/[0.03] px-4 py-2 text-sm text-white hover:border-border-strong transition-colors"
        >
          <CalendarIcon width={14} height={14} />
          Add a class
        </a>
        <button
          type="button"
          onClick={onShowUpcoming}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-accent-soft px-4 py-2 text-sm text-white hover:border-border-strong transition-colors"
        >
          Upcoming
        </button>
      </div>
    </header>
  );
}

// ─── on-air hero ────────────────────────────────────────────────────────────

function OnAirHero({ session }) {
  const start = new Date(session.startTime).getTime();
  const end = start + (session.durationMinutes || 0) * 60 * 1000;
  const [remaining, setRemaining] = useState(Math.max(0, end - Date.now()));

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(Math.max(0, end - Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, [end]);

  return (
    <section className="card relative overflow-hidden p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-6">
      <div className="absolute inset-0 glow-radial opacity-60 pointer-events-none" />
      <div className="relative flex-1 min-w-0">
        <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-300/30 bg-emerald-300/10">
          <span className="relative size-1.5 rounded-full bg-emerald-400">
            <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
          </span>
          on air
        </span>
        <h2 className="font-display text-3xl md:text-4xl mt-3 leading-tight">
          {session.title}
        </h2>
        <p className="text-sm text-muted-2 mt-2 max-w-xl leading-relaxed">
          {session.description}
        </p>
        <div className="flex flex-wrap items-center gap-3 mt-4 font-mono text-[12px] text-muted-2">
          <span className="inline-flex items-center gap-1.5">
            <UsersIcon width={13} height={13} /> {session.attendees ?? 0}{" "}
            watching
          </span>
          <span className="text-muted">·</span>
          <span>{session.instructor}</span>
          <span className="text-muted">·</span>
          <span>{session.category}</span>
        </div>
      </div>
      <div className="relative flex md:flex-col items-center md:items-end gap-3 shrink-0">
        <div className="text-right">
          <div className="font-mono-label">ends in</div>
          <div className="font-display text-3xl text-white tabular-nums">
            {fmtClock(remaining)}
          </div>
        </div>
        <a
          href={session.meetingUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 bg-accent hover:bg-accent-2 text-bg px-5 py-3 rounded-full text-sm transition-colors"
        >
          Join live <ArrowRightIcon width={14} height={14} />
        </a>
      </div>
    </section>
  );
}

// ─── stats strip ────────────────────────────────────────────────────────────

function StatsStrip({ liveCount, upcomingCount, nextSession }) {
  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <article className="card p-5 flex items-center gap-4">
        <div className="size-11 rounded-xl bg-emerald-300/10 text-emerald-300 grid place-items-center shrink-0">
          <BroadcastIcon width={20} height={20} />
        </div>
        <div className="min-w-0">
          <div className="font-mono-label">live now</div>
          <div className="text-2xl text-white leading-tight mt-0.5">
            {liveCount}
          </div>
        </div>
      </article>
      <article className="card p-5 flex items-center gap-4">
        <div className="size-11 rounded-xl bg-accent-soft text-accent-2 grid place-items-center shrink-0">
          <CalendarIcon width={20} height={20} />
        </div>
        <div className="min-w-0">
          <div className="font-mono-label">upcoming</div>
          <div className="text-2xl text-white leading-tight mt-0.5">
            {upcomingCount}
          </div>
        </div>
      </article>
      <article className="card p-5 flex items-center gap-4">
        <div className="size-11 rounded-xl bg-white/5 text-muted-2 grid place-items-center shrink-0">
          <ClockIcon width={20} height={20} />
        </div>
        <div className="min-w-0">
          <div className="font-mono-label">next session</div>
          <div className="text-sm text-white leading-tight mt-1 truncate">
            {nextSession
              ? relativeTime(nextSession.startTime)
              : "Nothing scheduled"}
          </div>
        </div>
      </article>
    </section>
  );
}

// ─── session card ───────────────────────────────────────────────────────────

const STATUS_TINT = {
  live: "text-emerald-300 border-emerald-300/30 bg-emerald-300/10",
  scheduled: "text-accent-2 border-accent-2/30 bg-accent-soft",
  ended: "text-muted-2 border-border bg-white/[0.03]",
  cancelled: "text-rose-300 border-rose-300/30 bg-rose-300/10",
};

const STATUS_LABEL = {
  live: "Live now",
  scheduled: "Scheduled",
  ended: "Ended",
  cancelled: "Cancelled",
};

function SessionCard({ session }) {
  const status = deriveStatus(session);
  // Recordings aren't surfaced yet, so ended sessions get a passive footer
  // instead of a CTA. Cancelled gets the same treatment.
  const hasAction = status === "live" || status === "scheduled";
  const cta = status === "live" ? "Join live" : "Remind me";
  const calendarUrl = buildGoogleCalendarUrl(session);

  return (
    <article className="card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <span
          className={[
            "inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border",
            STATUS_TINT[status],
          ].join(" ")}
        >
          {status === "live" ? (
            <span className="relative size-1.5 rounded-full bg-emerald-400">
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
            </span>
          ) : null}
          {STATUS_LABEL[status]}
        </span>
        <span className="font-mono text-[11px] text-muted-2">
          {session.category || "General"}
        </span>
      </div>

      <div>
        <h3 className="text-lg text-white leading-snug">{session.title}</h3>
        <p className="text-sm text-muted-2 mt-1.5 line-clamp-2 leading-relaxed">
          {session.description}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-[12px] font-mono text-muted-2">
        <div className="flex items-center gap-1.5">
          <CalendarIcon width={13} height={13} />
          {fmtDateTime(session.startTime)}
        </div>
        <div className="flex items-center gap-1.5">
          <ClockIcon width={13} height={13} />
          {session.durationMinutes} min
        </div>
        <div className="flex items-center gap-1.5 col-span-2 truncate">
          <UsersIcon width={13} height={13} />
          <span className="truncate">{session.instructor}</span>
          {status === "live" && session.attendees > 0 ? (
            <>
              <span className="text-muted">·</span>
              <span>{session.attendees} watching</span>
            </>
          ) : status !== "live" ? (
            <>
              <span className="text-muted">·</span>
              <span>{relativeTime(session.startTime)}</span>
            </>
          ) : null}
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 flex-wrap">
        {hasAction ? (
          <div className="flex items-center gap-2 flex-wrap">
            {status === "live" ? (
              <a
                href={session.meetingUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] bg-accent hover:bg-accent-2 text-bg transition-colors"
              >
                {cta}
                <ArrowRightIcon width={12} height={12} />
              </a>
            ) : (
              <button
                type="button"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] border border-border text-muted-2 hover:text-white hover:border-border-strong transition-colors"
              >
                {cta}
                <ArrowRightIcon width={12} height={12} />
              </button>
            )}
            <a
              href={calendarUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] border border-border text-muted-2 hover:text-white hover:border-border-strong transition-colors"
              aria-label={`Add ${session.title} to Google Calendar`}
            >
              <CalendarIcon width={12} height={12} />
              Add to calendar
            </a>
          </div>
        ) : (
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] border border-border text-muted font-mono">
            {status === "cancelled" ? "Cancelled" : "Session ended"}
          </span>
        )}
      </div>
    </article>
  );
}

// ─── filter tabs ────────────────────────────────────────────────────────────

function FilterTabs({ value, onChange, counts }) {
  const tabs = [
    { id: "all", label: "All", count: counts.all },
    { id: "live", label: "Live", count: counts.live },
    { id: "scheduled", label: "Upcoming", count: counts.scheduled },
  ];
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={[
            "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[13px] transition-colors",
            value === t.id
              ? "bg-accent-soft text-white border border-border-strong"
              : "border border-border text-muted-2 hover:text-white hover:border-border-strong",
          ].join(" ")}
        >
          {t.label}
          <span className="font-mono text-[11px] text-muted">{t.count}</span>
        </button>
      ))}
    </div>
  );
}

// ─── page ───────────────────────────────────────────────────────────────────

// Background refresh interval. New / cancelled / edited sessions show up on
// their own within this window.
const SESSIONS_POLL_MS = 2 * 60 * 1000;
// Status re-derive interval. Tight enough that a session flips from "live" to
// "ended" within ~5s of its scheduled end time.
const STATUS_TICK_MS = 5 * 1000;

export default function LiveClassesPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reachable, setReachable] = useState(true);
  const [filter, setFilter] = useState("all");
  const [, forceTick] = useState(0);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Re-derive statuses on a short tick so the UI keeps moving with the wall
  // clock — live → ended transitions don't wait for a re-fetch.
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), STATUS_TICK_MS);
    return () => clearInterval(id);
  }, []);

  const loadSessions = useCallback(async ({ silent } = { silent: false }) => {
    try {
      const res = await fetch("/api/live-classes", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      const items = data?.data?.liveClasses;
      if (!mountedRef.current) return;
      // 503 from our proxy = backend unreachable. Anything else (including
      // an empty list) is the real source of truth.
      if (res.status === 503) {
        // On silent refreshes, keep the cached list visible rather than
        // flipping the page into the unreachable state on a single hiccup.
        if (!silent) {
          setReachable(false);
          setSessions([]);
        }
      } else {
        setReachable(true);
        setSessions(Array.isArray(items) ? items : []);
      }
    } catch {
      if (!mountedRef.current) return;
      if (!silent) {
        setReachable(false);
        setSessions([]);
      }
    } finally {
      if (mountedRef.current && !silent) setLoading(false);
    }
  }, []);

  // Initial load.
  useEffect(() => {
    loadSessions({ silent: false });
  }, [loadSessions]);

  // Background polling + refresh-on-focus so new admin-scheduled classes (and
  // cancellations / edits) appear without a manual reload.
  useEffect(() => {
    const id = setInterval(() => loadSessions({ silent: true }), SESSIONS_POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        loadSessions({ silent: true });
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [loadSessions]);

  const withStatus = useMemo(
    () => sessions.map((s) => ({ ...s, _status: deriveStatus(s) })),
    [sessions]
  );

  // Ended sessions are intentionally hidden — once a live class is over it
  // disappears from the schedule entirely (no recording surface yet).
  const visibleSessions = useMemo(
    () => withStatus.filter((s) => s._status !== "ended"),
    [withStatus]
  );

  const counts = useMemo(() => {
    const c = { all: visibleSessions.length, live: 0, scheduled: 0, cancelled: 0 };
    for (const s of visibleSessions) {
      if (s._status in c) c[s._status] += 1;
    }
    return c;
  }, [visibleSessions]);

  const liveSession = visibleSessions.find((s) => s._status === "live");
  const nextSession = visibleSessions
    .filter((s) => s._status === "scheduled")
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))[0];

  const filtered = useMemo(() => {
    if (filter === "all") return visibleSessions;
    return visibleSessions.filter((s) => s._status === filter);
  }, [visibleSessions, filter]);

  const sortedForList = useMemo(() => {
    const order = { live: 0, scheduled: 1, cancelled: 2 };
    return [...filtered].sort((a, b) => {
      const oa = order[a._status] ?? 9;
      const ob = order[b._status] ?? 9;
      if (oa !== ob) return oa - ob;
      const ta = new Date(a.startTime).getTime() || 0;
      const tb = new Date(b.startTime).getTime() || 0;
      return ta - tb;
    });
  }, [filtered]);

  return (
    <div className="max-w-300 mx-auto px-8 py-10 flex flex-col gap-8">
      <TopBar liveCount={counts.live} onShowUpcoming={() => setFilter("scheduled")} />

      {liveSession ? <OnAirHero session={liveSession} /> : null}

      <StatsStrip
        liveCount={counts.live}
        upcomingCount={counts.scheduled}
        nextSession={nextSession}
      />

      <section className="flex flex-col gap-5">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="font-mono-label">all sessions</div>
            <h2 className="font-display text-3xl mt-1 leading-tight">
              Schedule
            </h2>
          </div>
          <FilterTabs value={filter} onChange={setFilter} counts={counts} />
        </div>

        {loading ? (
          <div className="card p-10 text-center text-muted-2 font-mono-label">
            loading sessions…
          </div>
        ) : !reachable ? (
          <div className="card p-10 text-center">
            <div className="size-12 mx-auto mb-4 rounded-full bg-rose-300/10 text-rose-300 grid place-items-center">
              <BroadcastIcon width={22} height={22} />
            </div>
            <div className="font-mono-label mb-2 text-rose-300">
              service unreachable
            </div>
            <p className="text-sm text-muted-2 max-w-md mx-auto">
              We couldn't reach the live-classes service. Try again in a
              moment.
            </p>
          </div>
        ) : visibleSessions.length === 0 ? (
          <div className="card p-10 text-center">
            <div className="size-12 mx-auto mb-4 rounded-full bg-accent-soft text-accent-2 grid place-items-center">
              <CalendarIcon width={22} height={22} />
            </div>
            <div className="font-mono-label mb-2">no sessions scheduled</div>
            <p className="text-sm text-muted-2 max-w-md mx-auto">
              Your cohort doesn't have any live classes on the calendar yet.
              Once an instructor schedules one, it'll show up right here.
            </p>
          </div>
        ) : sortedForList.length === 0 ? (
          <div className="card p-10 text-center text-muted-2">
            <div className="font-mono-label mb-2">nothing in this view</div>
            <p className="text-sm">
              No sessions match this filter. Try a different tab.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sortedForList.map((s) => (
              <SessionCard key={s._id || s.id} session={s} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
