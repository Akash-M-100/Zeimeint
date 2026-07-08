"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PlayIcon, RotateIcon } from "@/app/components/Icons";

// Resume rules mirror the S3 VideoPlayer so the behaviour is identical no matter
// where a lecture is hosted.
const RESUME_MIN_SECONDS = 1;
const RESUME_END_PAD_SECONDS = 2;
const SAVE_INTERVAL_MS = 4000;
const SERVER_SYNC_INTERVAL_MS = 15000;
// How often we poll the YouTube player for its current position. The IFrame API
// has no timeupdate event, so we sample on an interval while playing.
const POLL_INTERVAL_MS = 1000;

// Pull the 11-char video id out of any of the YouTube link shapes the backend
// accepts (watch?v=, youtu.be/, /embed/, /shorts/), or accept a bare id.
function parseYouTubeId(url) {
  if (!url) return null;
  if (/^[\w-]{11}$/.test(url)) return url;
  const patterns = [
    /[?&]v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
  ];
  for (const re of patterns) {
    const m = String(url).match(re);
    if (m) return m[1];
  }
  return null;
}

// Loads the YouTube IFrame Player API exactly once per page and resolves with
// the global `YT` namespace when it's ready.
let ytApiPromise = null;
function loadYouTubeApi() {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previous === "function") previous();
      resolve(window.YT);
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return ytApiPromise;
}

// Plays a YouTube-hosted lecture inside an embedded IFrame player, while keeping
// the same resume + progress-sync behaviour as the S3 <VideoPlayer>. Shares the
// `zlms:vprog:<videoId>` localStorage key and the /api/progress endpoint so a
// lecture resumes from the same place regardless of its host.
export default function YouTubePlayer({
  src,
  title,
  videoId,
  onEnded,
  initialProgress,
  onProgressSync,
}) {
  const mountRef = useRef(null);
  const playerRef = useRef(null);
  const pollRef = useRef(null);
  const lastSaveRef = useRef(0);
  const lastSyncedRef = useRef(0);
  const resumeCheckedRef = useRef(false);
  const endedRef = useRef(false);

  const [resumePrompt, setResumePrompt] = useState(null); // null | { time }

  const ytId = parseYouTubeId(src);
  const storageKey = videoId ? `zlms:vprog:${videoId}` : null;

  /* ---- Resume persistence (shared with the S3 player) ---- */

  const loadProgress = useCallback(() => {
    if (!storageKey) return null;
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [storageKey]);

  const saveProgress = useCallback(
    (t, d) => {
      if (!storageKey || !(t >= 1)) return;
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ t, d: d || 0, at: Date.now() }),
        );
      } catch {
        /* storage full / blocked — ignore */
      }
    },
    [storageKey],
  );

  const clearProgress = useCallback(() => {
    if (!storageKey) return;
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  // Debounced server sync, identical contract to the S3 player: throttled during
  // steady play, force-flushed at edges (pause / hidden / ended).
  const syncToServer = useCallback(
    async (opts = {}) => {
      const p = playerRef.current;
      if (!p || !videoId || typeof p.getCurrentTime !== "function") return;
      const watchedSeconds = Math.floor(p.getCurrentTime() || 0);
      const durationSeconds = Math.floor(p.getDuration() || 0);
      if (watchedSeconds <= 0 && !opts.completionFlush) return;
      if (
        !opts.flush &&
        Date.now() - lastSyncedRef.current < SERVER_SYNC_INTERVAL_MS
      ) {
        return;
      }
      lastSyncedRef.current = Date.now();
      try {
        const res = await fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lectureId: videoId, watchedSeconds, durationSeconds }),
        });
        if (!res.ok) return;
        const json = await res.json().catch(() => ({}));
        const completed = Boolean(json?.data?.progress?.completed);
        if (onProgressSync) onProgressSync(videoId, { watchedSeconds, completed });
      } catch {
        // Silent — localStorage already holds the position; next tick retries.
      }
    },
    [videoId, onProgressSync],
  );

  const handleEnded = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    clearProgress();
    syncToServer({ flush: true, completionFlush: true });
    if (onEnded) onEnded();
  }, [clearProgress, syncToServer, onEnded]);

  /* ---- Position polling while playing ---- */

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(() => {
      const p = playerRef.current;
      if (!p || typeof p.getCurrentTime !== "function") return;
      const t = p.getCurrentTime() || 0;
      const d = p.getDuration() || 0;
      if (Date.now() - lastSaveRef.current > SAVE_INTERVAL_MS) {
        lastSaveRef.current = Date.now();
        saveProgress(t, d);
      }
      syncToServer();
    }, POLL_INTERVAL_MS);
  }, [saveProgress, syncToServer]);

  /* ---- Player setup ---- */

  useEffect(() => {
    let cancelled = false;
    if (!ytId || !mountRef.current) return undefined;

    loadYouTubeApi().then((YT) => {
      if (cancelled || !mountRef.current) return;
      playerRef.current = new YT.Player(mountRef.current, {
        videoId: ytId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onReady: (e) => {
            const player = e.target;
            const dur = player.getDuration() || 0;
            // Decide whether to resume. Server progress wins over localStorage.
            const saved = loadProgress();
            let candidateTime = 0;
            if (initialProgress?.watchedSeconds > 0) {
              candidateTime = Number(initialProgress.watchedSeconds);
            } else if (saved?.t > 0) {
              candidateTime = saved.t;
            }
            const canResume =
              candidateTime >= RESUME_MIN_SECONDS &&
              (dur === 0 || candidateTime < dur - RESUME_END_PAD_SECONDS);

            resumeCheckedRef.current = true;
            if (canResume) {
              setResumePrompt({ time: candidateTime });
            } else {
              player.playVideo();
            }
          },
          onStateChange: (e) => {
            // 1 = playing, 2 = paused, 0 = ended (YT.PlayerState)
            if (e.data === 1) {
              startPolling();
            } else if (e.data === 2) {
              stopPolling();
              const p = playerRef.current;
              if (p) saveProgress(p.getCurrentTime(), p.getDuration());
              syncToServer({ flush: true });
            } else if (e.data === 0) {
              stopPolling();
              handleEnded();
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      stopPolling();
      // Flush the last known position before tearing the player down.
      const p = playerRef.current;
      if (p && typeof p.getCurrentTime === "function" && !endedRef.current) {
        saveProgress(p.getCurrentTime(), p.getDuration());
        syncToServer({ flush: true });
      }
      if (p && typeof p.destroy === "function") p.destroy();
      playerRef.current = null;
    };
    // Re-create the player when the lecture (videoId/ytId) changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ytId, videoId]);

  // Flush progress when the tab is hidden or the page unloads.
  useEffect(() => {
    const flush = () => {
      const p = playerRef.current;
      if (p && typeof p.getCurrentTime === "function" && !endedRef.current) {
        saveProgress(p.getCurrentTime(), p.getDuration());
        syncToServer({ flush: true });
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", flush);
    };
  }, [saveProgress, syncToServer]);

  /* ---- Resume prompt actions ---- */

  const handleResume = () => {
    const target = Math.max(0, resumePrompt?.time || 0);
    setResumePrompt(null);
    const p = playerRef.current;
    if (p) {
      p.seekTo(target, true);
      p.playVideo();
    }
  };

  const handleStartOver = () => {
    setResumePrompt(null);
    clearProgress();
    const p = playerRef.current;
    if (p) {
      p.seekTo(0, true);
      p.playVideo();
    }
  };

  /* ---- Render ---- */

  if (!ytId) {
    return (
      <div className="aspect-video w-full rounded-2xl bg-card border border-border grid place-items-center text-muted text-sm px-4 text-center">
        This YouTube link can&apos;t be played. Ask the instructor to re-add it.
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-border">
      {/* The YT API replaces this node with the player iframe. */}
      <div className="absolute inset-0 h-full w-full">
        <div ref={mountRef} className="h-full w-full" title={title} />
      </div>

      {resumePrompt && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-black/70 backdrop-blur-sm px-4">
          <div className="card max-w-sm w-full p-6 text-center">
            <h3 className="font-display text-2xl leading-tight mb-3">
              Resume watching
            </h3>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={handleResume}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-2 text-bg px-4 py-2.5 rounded-full text-sm font-medium transition-colors"
              >
                <PlayIcon width={16} height={16} />
                Resume
              </button>
              <button
                type="button"
                onClick={handleStartOver}
                className="flex-1 inline-flex items-center justify-center gap-2 border border-border-strong hover:bg-white/5 text-white px-4 py-2.5 rounded-full text-sm font-medium transition-colors"
              >
                <RotateIcon width={16} height={16} />
                Start over
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
