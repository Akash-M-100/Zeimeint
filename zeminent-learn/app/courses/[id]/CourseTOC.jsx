"use client";

import { useMemo, useState } from "react";
import {
  CheckCircleIcon,
  LockIcon,
  PlayCircleIcon,
  PlayIcon,
} from "@/app/components/Icons";

function formatDuration(seconds) {
  const n = Math.max(0, Math.floor(Number(seconds) || 0));
  const m = Math.floor(n / 60);
  const s = n % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function sectionTotalSeconds(lectures) {
  return lectures.reduce((sum, l) => sum + (Number(l.duration) || 0), 0);
}

function formatSectionTotal(seconds) {
  const n = Math.floor(seconds);
  if (n <= 0) return "—";
  const m = Math.floor(n / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return `${h}h ${r}m`;
}

// Right-pane table of contents. Sections are collapsible; the section
// containing the active lecture is open by default.
export default function CourseTOC({ groups, activeId, onSelect, progressMap }) {
  const activeGroupId = useMemo(() => {
    for (const g of groups) {
      if (g.lectures.some((l) => String(l._id) === String(activeId))) return g.id;
    }
    return groups[0]?.id;
  }, [groups, activeId]);

  const [openIds, setOpenIds] = useState(() => new Set([activeGroupId].filter(Boolean)));

  const toggle = (id) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const totalLectures = groups.reduce((s, g) => s + g.lectures.length, 0);

  return (
    <aside className="w-full lg:w-[clamp(300px,30%,420px)] lg:shrink-0 flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <div className="font-mono-label">curriculum</div>
        <div className="text-xs text-muted">
          {totalLectures} {totalLectures === 1 ? "lecture" : "lectures"}
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        {groups.length === 0 ? (
          <div className="p-6 text-sm text-muted-2 text-center">
            No content yet.
          </div>
        ) : (
          groups.map((g) => {
            const isOpen = openIds.has(g.id) || activeGroupId === g.id;
            const total = sectionTotalSeconds(g.lectures);
            const completedCount = g.lectures.filter(
              (lec) => progressMap?.get(lec._id)?.completed,
            ).length;
            return (
              <div key={g.id} className="border-b border-border last:border-b-0">
                <button
                  type="button"
                  onClick={() => toggle(g.id)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-white">
                      {g.title}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-muted">
                      {g.lectures.length} · {formatSectionTotal(total)}
                      {completedCount > 0 && (
                        <span className="text-accent-2">
                          {" "}· {completedCount}/{g.lectures.length} watched
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={[
                      "shrink-0 text-muted-2 transition-transform",
                      isOpen ? "rotate-180" : "",
                    ].join(" ")}
                    aria-hidden="true"
                  >
                    ▾
                  </span>
                </button>

                {isOpen && (
                  <ul className="flex flex-col">
                    {g.lectures.map((lecture, i) => {
                      const isActive = String(lecture._id) === String(activeId);
                      const isLocked = lecture.locked || !lecture.videoUrl;
                      const progress = progressMap?.get(lecture._id);
                      const isCompleted = !!progress?.completed && !isLocked;
                      // Only show the thin in-progress bar for accessible
                      // lectures that have been started but not finished.
                      const percent =
                        progress &&
                        progress.durationSeconds > 0 &&
                        !progress.completed &&
                        !isLocked
                          ? Math.min(
                              100,
                              Math.round(
                                (progress.watchedSeconds /
                                  progress.durationSeconds) *
                                  100,
                              ),
                            )
                          : null;
                      return (
                        <li key={lecture._id}>
                          <button
                            type="button"
                            onClick={() => onSelect(lecture)}
                            className={[
                              "w-full text-left flex items-start gap-3 px-4 py-3 transition-colors",
                              isActive
                                ? "bg-accent-soft border-l-2 border-accent-2"
                                : "hover:bg-white/[0.03] border-l-2 border-transparent",
                            ].join(" ")}
                          >
                            <span className="mt-0.5 shrink-0">
                              {isActive ? (
                                <PlayIcon
                                  width={16}
                                  height={16}
                                  className="text-accent-2"
                                />
                              ) : isLocked ? (
                                <LockIcon
                                  width={16}
                                  height={16}
                                  className="text-muted"
                                />
                              ) : isCompleted ? (
                                <CheckCircleIcon
                                  width={16}
                                  height={16}
                                  className="text-accent-2"
                                />
                              ) : (
                                <PlayCircleIcon
                                  width={16}
                                  height={16}
                                  className="text-muted-2"
                                />
                              )}
                            </span>
                            <span className="flex-1 min-w-0">
                              <span
                                className={[
                                  "block text-sm leading-snug",
                                  isActive
                                    ? "text-white"
                                    : isLocked
                                    ? "text-muted-2"
                                    : "text-white",
                                ].join(" ")}
                              >
                                <span className="text-muted font-mono mr-2">
                                  {i + 1}.
                                </span>
                                {lecture.title}
                              </span>
                              <span className="mt-1 flex items-center gap-2 font-mono text-[11px] text-muted">
                                <span>{formatDuration(lecture.duration)}</span>
                                {lecture.freePreview && (
                                  <span className="px-1.5 py-0.5 rounded-full border border-border text-[10px] uppercase tracking-wider text-accent-2">
                                    preview
                                  </span>
                                )}
                                {isLocked && (
                                  <span className="text-muted">locked</span>
                                )}
                              </span>
                              {percent !== null && percent > 0 && (
                                <span className="mt-1.5 block h-1 bg-card-2 rounded-full overflow-hidden">
                                  <span
                                    className="block h-full bg-accent transition-all duration-300"
                                    style={{ width: `${percent}%` }}
                                  />
                                </span>
                              )}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
