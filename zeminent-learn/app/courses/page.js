"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PlayCircleIcon,
  StarIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  LockIcon,
} from "@/app/components/Icons";

function truncate(text, max = 110) {
  if (!text) return "";
  const trimmed = String(text).trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

function Stars({ value = 0 }) {
  const clamped = Math.max(0, Math.min(5, Number(value) || 0));
  const filled = Math.round(clamped);
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${clamped.toFixed(1)} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <StarIcon
          key={i}
          width={13}
          height={13}
          className={i < filled ? "text-accent-2" : "text-muted"}
        />
      ))}
    </span>
  );
}

function normalizeSequentialLocks(list) {
  return [...list]
    .filter((course) => course && (course._id || course.id))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((course, index, ordered) => {
      const previous = index > 0 ? ordered[index - 1] : null;
      const unlocked =
        index === 0 || course.completed === true || previous?.completed === true;
      return { ...course, unlocked };
    });
}

function CourseCard({ course }) {
  const title = course.title || "Untitled course";
  const description = truncate(course.description);
  const rating = Number(course.rating) || 0;
  const ratingCount = Number(course.ratingCount) || 0;
  const thumb = course.thumbnail || course.thumbnailUrl || course.image || "";
  const courseId = course._id || course.id;
  const isCompleted = course.completed === true;
  const isUnlocked = course.unlocked === true;

  return (
    <article
      className={[
        "card overflow-hidden flex flex-col group",
        isUnlocked ? "" : "opacity-75",
      ].join(" ")}
    >
      <div className="relative aspect-video w-full bg-card-2 overflow-hidden">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-muted">
            <PlayCircleIcon width={36} height={36} />
          </div>
        )}
        <div className="absolute inset-0 glow-radial opacity-50 pointer-events-none" />
        {course.category ? (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-accent-2 px-2 py-1 rounded-full border border-border-strong bg-black/40 backdrop-blur-sm">
            {course.category}
          </span>
        ) : null}
        <span
          className={[
            "absolute top-3 right-3 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border backdrop-blur-sm",
            isCompleted
              ? "text-accent-2 border-accent-2/30 bg-black/40"
              : isUnlocked
                ? "text-white border-border-strong bg-black/40"
                : "text-muted-2 border-border bg-black/50",
          ].join(" ")}
        >
          {isCompleted ? (
            <CheckCircleIcon width={12} height={12} />
          ) : isUnlocked ? (
            <PlayCircleIcon width={12} height={12} />
          ) : (
            <LockIcon width={12} height={12} />
          )}
          {isCompleted ? "Completed" : isUnlocked ? "Unlocked" : "Locked"}
        </span>
      </div>

      <div className="flex flex-col gap-3 p-5 flex-1">
        <h3 className="font-display text-2xl leading-tight text-white">
          {title}
        </h3>
        <p className="text-sm text-muted-2 leading-relaxed min-h-[2.6rem]">
          {description || "A new course from the Zeminent team."}
        </p>

        <div className="flex items-center gap-2 pt-1">
          <Stars value={rating} />
          <span className="font-mono text-[11px] text-muted">
            {rating > 0
              ? `${rating.toFixed(1)}${ratingCount ? ` · ${ratingCount}` : ""}`
              : "new"}
          </span>
        </div>

        {!isUnlocked ? (
          <div className="mt-3 flex flex-col gap-1.5">
            <button
              type="button"
              disabled
              className="inline-flex items-center justify-center gap-2 bg-card-2 text-muted px-4 py-2 rounded-full text-sm cursor-not-allowed"
            >
              <LockIcon width={14} height={14} />
              Locked
            </button>
            <p className="text-xs text-muted text-center">
              Complete the previous course to unlock
            </p>
          </div>
        ) : courseId ? (
          <Link
            href={`/courses/${courseId}`}
            className="mt-3 inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-2 text-bg px-4 py-2 rounded-full text-sm transition-colors"
          >
            View Course
            <ArrowRightIcon width={14} height={14} />
          </Link>
        ) : (
          <span className="mt-3 inline-flex items-center justify-center gap-2 bg-card-2 text-muted px-4 py-2 rounded-full text-sm">
            Coming soon
          </span>
        )}
      </div>
    </article>
  );
}

function Skeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="aspect-video w-full bg-card-2 animate-pulse" />
      <div className="p-5 space-y-3">
        <div className="h-5 w-2/3 rounded bg-card-2 animate-pulse" />
        <div className="h-3 w-full rounded bg-card-2 animate-pulse" />
        <div className="h-3 w-4/5 rounded bg-card-2 animate-pulse" />
      </div>
    </div>
  );
}

// How often we silently re-fetch in the background to catch admin-side adds /
// edits. Short enough that "I just published a course" feels live, long enough
// to stay easy on the server.
const COURSES_POLL_MS = 5 * 60 * 1000;

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  // Tracks whether the component is still mounted across async loads so we
  // don't write to React state after unmount during polling.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadCourses = useCallback(async ({ silent } = { silent: false }) => {
    if (!silent) setStatus("loading");
    try {
      const res = await fetch("/api/path", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to load learning path");
      const list = json?.courses || json?.data?.courses || [];
      if (!mountedRef.current) return;
      setCourses(normalizeSequentialLocks(list));
      setError("");
      setStatus("ready");
    } catch (err) {
      if (!mountedRef.current) return;
      // On a silent (background) refresh, never knock the page into the error
      // state — keep the cached list visible and let the next tick try again.
      if (!silent) {
        setError(err.message || "Failed to load courses");
        setStatus("error");
      }
    }
  }, []);

  // Initial fetch.
  useEffect(() => {
    loadCourses({ silent: false });
  }, [loadCourses]);

  // Background polling + refresh-on-focus so new admin courses appear without
  // a manual reload.
  useEffect(() => {
    const id = setInterval(() => loadCourses({ silent: true }), COURSES_POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        loadCourses({ silent: true });
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [loadCourses]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter((c) =>
      [c.title, c.description, c.category]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [courses, query]);

  return (
    <div className="max-w-[1280px] mx-auto px-8 py-10 flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <div className="font-mono-label">browse</div>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <h1 className="font-display text-4xl md:text-5xl leading-[1.05]">
            Learning <span className="text-accent-2">path.</span>
          </h1>
          <div className="md:max-w-xs w-full">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search courses…"
              className="w-full bg-card border border-border rounded-full px-4 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-border-strong"
            />
          </div>
        </div>
      </header>

      {status === "error" ? (
        <div className="card p-6 text-sm text-red-300">
          {error}
        </div>
      ) : status === "loading" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center flex flex-col items-center gap-3">
          <PlayCircleIcon width={28} height={28} className="text-muted" />
          <div className="text-white">No courses yet</div>
          <p className="text-sm text-muted-2 max-w-sm">
            {query
              ? "Nothing matches your search. Try a different keyword."
              : "Your learning path is not ready yet. Check back soon."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((course) => (
            <CourseCard
              key={course._id || course.id || course.title}
              course={course}
            />
          ))}
        </div>
      )}
    </div>
  );
}
