"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftIcon, LockIcon } from "@/app/components/Icons";
import VideoPlayer from "./VideoPlayer";
import YouTubePlayer from "./YouTubePlayer";
import CourseTOC from "./CourseTOC";

// Synthetic group name shown above lectures that don't yet belong to a section.
const ORPHAN_GROUP_TITLE = "Course content";

// Slice 11: single Full Access package replaces per-course pricing. Backend
// is the authority (src/config/product.js); kept in sync manually for now.
const FULL_ACCESS_PRICE_DISPLAY = "₹39,999";

// Flatten sections + orphans into one ordered list so we can walk
// next / previous and find the first unlocked lecture.
function flatten(sections, orphanLectures) {
  const groups = [];
  for (const s of sections) {
    if (s.lectures?.length) {
      groups.push({ id: s._id, title: s.title, lectures: s.lectures });
    }
  }
  if (orphanLectures?.length) {
    groups.push({ id: "__orphans__", title: ORPHAN_GROUP_TITLE, lectures: orphanLectures });
  }
  const ordered = groups.flatMap((g) => g.lectures.map((l) => ({ ...l, _group: g.id })));
  return { groups, ordered };
}

function firstWatchableId(ordered) {
  const first = ordered.find((l) => !l.locked && l.videoUrl);
  if (first) return first._id;
  // Fall back to the very first lecture even if locked — the player will show
  // a "Buy to unlock" overlay rather than a blank screen.
  return ordered[0]?._id ?? null;
}

// The lecture the student most recently watched (across all sections), so a
// course reopens on the video they left off at — not the first one.
function lastWatchedId(ordered) {
  let best = null;
  let bestAt = -1;
  for (const l of ordered) {
    if (l.locked || !l.videoUrl) continue;
    const touched = (l.watchedSeconds || 0) > 0 || l.completed;
    if (!touched) continue;
    const at = l.progressUpdatedAt ? new Date(l.progressUpdatedAt).getTime() : 0;
    if (at >= bestAt) {
      bestAt = at;
      best = l;
    }
  }
  return best?._id ?? null;
}

export default function CoursePlayer({
  course,
  sections,
  orphanLectures,
  viewerState,
  viewerHasFullAccess,
}) {
  const { groups, ordered } = useMemo(
    () => flatten(sections, orphanLectures),
    [sections, orphanLectures],
  );

  // Honor ?lecture=<id> from the URL (used by the dashboard's "Resume" link
  // to deep-link into the last-watched lecture). Only applied at first mount;
  // navigating within the course updates activeId via handleSelect instead.
  const searchParams = useSearchParams();
  const requestedLectureId = searchParams.get("lecture");

  const [activeId, setActiveId] = useState(() => {
    // 1) explicit ?lecture deep-link (e.g. dashboard "Resume") wins
    if (requestedLectureId) {
      const target = ordered.find(
        (l) => String(l._id) === String(requestedLectureId),
      );
      if (target && !target.locked && target.videoUrl) {
        return target._id;
      }
    }
    // 2) otherwise resume on the last lecture the student watched
    // 3) finally fall back to the first watchable lecture
    return lastWatchedId(ordered) ?? firstWatchableId(ordered);
  });
  // Per-lecture progress map — seeded from the bundle's embedded fields,
  // updated by VideoPlayer's onProgressSync callback. Phase 3 will consume
  // this in CourseTOC for completion checkmarks.
  const [progressMap, setProgressMap] = useState(() => {
    const map = new Map();
    const collect = (lec) => {
      if (lec && lec.watchedSeconds != null) {
        map.set(lec._id, {
          watchedSeconds: lec.watchedSeconds,
          durationSeconds: lec.durationSeconds || 0,
          completed: !!lec.completed,
        });
      }
    };
    for (const s of sections || []) for (const l of s.lectures || []) collect(l);
    for (const l of orphanLectures || []) collect(l);
    return map;
  });
  const router = useRouter();
  const completionPostedRef = useRef(false);

  const active = useMemo(
    () => ordered.find((l) => String(l._id) === String(activeId)) || null,
    [ordered, activeId],
  );

  // Seed the player's resume position from the live progress map (falling back
  // to whatever the bundle embedded). Shared by both the S3 and YouTube players.
  const activeInitialProgress = active
    ? {
        watchedSeconds:
          progressMap.get(active._id)?.watchedSeconds ?? active.watchedSeconds ?? 0,
        durationSeconds:
          progressMap.get(active._id)?.durationSeconds ?? active.durationSeconds ?? 0,
        completed: progressMap.get(active._id)?.completed ?? active.completed ?? false,
      }
    : null;
  // A lecture is YouTube-hosted when the backend tags it as such (or it carries
  // a youtubeUrl) — those play through the embed instead of the S3 player.
  const activeIsYouTube =
    !!active && (active.videoType === "youtube" || !!active.youtubeUrl);

  // Buy CTA only renders for authed viewers who don't yet have Full Access.
  // Anonymous viewers get the Sign-in CTA in LockedPoster instead. Per-course
  // price no longer gates: the package covers every course at one fixed price.
  const showBuyCTA = viewerState === "authenticated" && !viewerHasFullAccess;

  const handleSelect = useCallback((lecture) => {
    setActiveId(lecture._id);
  }, []);

  const handleProgressSync = useCallback(
    (lectureId, { watchedSeconds, completed }) => {
      setProgressMap((prev) => {
        const next = new Map(prev);
        const existing = next.get(lectureId) || { durationSeconds: 0 };
        next.set(lectureId, { ...existing, watchedSeconds, completed });
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    const courseId = course?._id || course?.id;
    if (!courseId || completionPostedRef.current) return;

    const lectureIds = ordered
      .filter((lecture) => !lecture.locked)
      .map((lecture) => lecture._id)
      .filter(Boolean);

    if (lectureIds.length === 0) return;

    const allCompleted = lectureIds.every(
      (lectureId) => progressMap.get(lectureId)?.completed === true,
    );
    if (!allCompleted) return;

    completionPostedRef.current = true;
    fetch(`/api/path/complete/${encodeURIComponent(courseId)}`, {
      method: "POST",
    })
      .then(async (res) => {
        if (res.ok) {
          await fetch("/api/path", { cache: "no-store" }).catch(() => {});
          router.refresh();
        }
      })
      .catch(() => {
        completionPostedRef.current = false;
      });
  }, [course, ordered, progressMap, router]);

  // Slice 12: Razorpay trigger moved to /checkout. The CTAs here just
  // navigate; the dedicated checkout surface shows the breakdown + billing
  // info before opening the modal.
  const handleBuyClick = useCallback(() => {
    router.push("/checkout");
  }, [router]);

  const handleEnded = useCallback(() => {
    const idx = ordered.findIndex((l) => String(l._id) === String(activeId));
    for (let i = idx + 1; i < ordered.length; i += 1) {
      const next = ordered[i];
      if (!next.locked && next.videoUrl) {
        setActiveId(next._id);
        return;
      }
    }
  }, [ordered, activeId]);

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-6 md:py-10 flex flex-col gap-6">
      <div className="flex items-center gap-3 text-sm">
        <Link
          href="/courses"
          className="inline-flex items-center gap-1.5 text-muted-2 hover:text-white transition-colors"
        >
          <ArrowLeftIcon width={14} height={14} />
          All courses
        </Link>
        <span className="text-muted">·</span>
        <span className="font-mono text-[12px] text-muted-2">
          {course.category}
        </span>
      </div>

      <h1 className="font-display text-3xl md:text-4xl leading-tight">
        {course.title}
      </h1>

      {showBuyCTA && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            type="button"
            onClick={handleBuyClick}
            className="inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-2 text-bg px-6 py-3 rounded-full text-base font-medium transition-colors"
          >
            Get Full Access ({FULL_ACCESS_PRICE_DISPLAY})
          </button>
          <span className="text-sm text-muted-2">
            One purchase unlocks every course on Zeminent
          </span>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left ~70%: video + lecture meta */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {active ? (
            active.locked || !active.videoUrl ? (
              <LockedPoster
                lecture={active}
                viewerState={viewerState}
                onBuyClick={handleBuyClick}
              />
            ) : activeIsYouTube ? (
              <YouTubePlayer
                key={active._id}
                videoId={active._id}
                src={active.youtubeUrl || active.videoUrl}
                title={active.title}
                onEnded={handleEnded}
                initialProgress={activeInitialProgress}
                onProgressSync={handleProgressSync}
              />
            ) : (
              <VideoPlayer
                key={active._id}
                videoId={active._id}
                src={active.videoUrl}
                title={active.title}
                onEnded={handleEnded}
                initialProgress={activeInitialProgress}
                onProgressSync={handleProgressSync}
              />
            )
          ) : (
            <div className="aspect-video w-full rounded-2xl bg-card border border-border grid place-items-center text-muted">
              No lectures in this course yet.
            </div>
          )}

          {active && (
            <div className="flex flex-col gap-2">
              <h2 className="font-display text-xl md:text-2xl leading-snug">
                {active.title}
              </h2>
              {active.description && (
                <p className="text-sm text-muted-2 leading-relaxed max-w-3xl">
                  {active.description}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right ~30%: sectioned table of contents */}
        <CourseTOC
          groups={groups}
          activeId={activeId}
          onSelect={handleSelect}
          progressMap={progressMap}
        />
      </div>
    </div>
  );
}

function LockedPoster({ lecture, viewerState, onBuyClick }) {
  const pathname = usePathname();
  const isAnonymous = viewerState === "anonymous";

  return (
    <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-card border border-border grid place-items-center">
      <div className="absolute inset-0 glow-radial opacity-70" />
      <div className="relative z-10 flex flex-col items-center gap-3 text-center px-6">
        <span className="size-14 rounded-full bg-card-2 border border-border-strong grid place-items-center">
          <LockIcon width={22} height={22} />
        </span>
        <div className="font-display text-xl">{lecture.title}</div>
        <p className="text-sm text-muted-2 max-w-md">
          {isAnonymous
            ? "Sign in to get Full Access — one purchase unlocks every course on Zeminent."
            : "Get Full Access to unlock every course on Zeminent."}
        </p>
        {isAnonymous ? (
          <Link
            href={`/login?from=${encodeURIComponent(pathname || "")}`}
            className="mt-2 inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-2 text-bg px-5 py-2.5 rounded-full text-sm font-medium transition-colors"
          >
            Sign in to unlock
          </Link>
        ) : (
          <button
            type="button"
            onClick={onBuyClick}
            className="mt-2 inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-2 text-bg px-5 py-2.5 rounded-full text-sm font-medium transition-colors"
          >
            Get Full Access ({FULL_ACCESS_PRICE_DISPLAY})
          </button>
        )}
      </div>
    </div>
  );
}
