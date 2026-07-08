"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  PlayIcon,
  PauseIcon,
  VolumeIcon,
  ExpandIcon,
  RotateIcon,
} from "@/app/components/Icons";

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

// Resume rules: offer to resume from as little as 1 second in (any video, no
// matter how briefly watched), unless the viewer is basically at the very end.
// Resume continues from the exact saved position — no rewind.
const RESUME_MIN_SECONDS = 1;
const RESUME_END_PAD_SECONDS = 2;
const SAVE_INTERVAL_MS = 4000;
// Server sync runs alongside the localStorage save but on a slower cadence —
// localStorage is the fast resume path; the server write is for cross-device.
const SERVER_SYNC_INTERVAL_MS = 15000;

function formatTime(seconds) {
  const n = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(n / 3600);
  const m = Math.floor((n % 3600) / 60);
  const s = n % 60;
  const pad = (x) => String(x).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

// Self-contained HTML5 video player with a Udemy-style control bar.
// Controls: play/pause, seek bar with buffered range, time, mute + volume slider,
// playback rate, cosmetic quality menu, fullscreen. Keyboard: Space, ←/→, ↑/↓,
// F (fullscreen), M (mute). Click toggles play/pause; double-click toggles
// fullscreen.
//
// Also persists the watch position per lecture in localStorage and, on return,
// prompts to resume from exactly where the viewer left off, or start over.
// `videoId` (the stable lecture _id) is the storage key — signed `src` URLs
// rotate, so they can't be used.
export default function VideoPlayer({
  src,
  title,
  videoId,
  onEnded,
  initialProgress,
  onProgressSync,
}) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const hideTimerRef = useRef(null);
  const lastSaveRef = useRef(0);
  const lastSyncedRef = useRef(0);
  const resumeCheckedRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [rateMenuOpen, setRateMenuOpen] = useState(false);
  const [qualityMenuOpen, setQualityMenuOpen] = useState(false);
  const [resumePrompt, setResumePrompt] = useState(null); // null | { time }

  /* ---- Resume persistence (localStorage, survives days/weeks) ---- */

  const storageKey = videoId ? `zlms:vprog:${videoId}` : null;

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

  // Debounced server sync. Throttled to SERVER_SYNC_INTERVAL_MS during steady
  // play; pass { flush: true } at edges (pause / visibility-hidden / unload /
  // ended) to bypass the throttle. Failures are silent — localStorage is the
  // local-resume fallback.
  const syncToServer = useCallback(
    async (opts = {}) => {
      const v = videoRef.current;
      if (!v || !videoId) return;
      const watchedSeconds = Math.floor(v.currentTime || 0);
      const durationSeconds = Math.floor(v.duration || 0);
      // Skip pre-metadata / zero-position writes unless this is the completion
      // flush (which deliberately confirms watchedSeconds=duration).
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
          body: JSON.stringify({
            lectureId: videoId,
            watchedSeconds,
            durationSeconds,
          }),
        });
        if (!res.ok) return;
        const json = await res.json().catch(() => ({}));
        const completed = Boolean(json?.data?.progress?.completed);
        if (onProgressSync) {
          onProgressSync(videoId, { watchedSeconds, completed });
        }
      } catch {
        // Silent — next tick will retry, localStorage already has the position.
      }
    },
    [videoId, onProgressSync],
  );

  /* ---- Player ↔ DOM sync ---- */

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = volume;
    v.muted = muted;
  }, [volume, muted]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = rate;
  }, [rate]);

  // Listen for fullscreen changes from any source (button, Esc, etc.).
  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Persist progress (local + server) when the tab is hidden / closed, and on
  // unmount. The server flush is fire-and-forget; we don't await on unload.
  useEffect(() => {
    const flush = () => {
      const v = videoRef.current;
      if (v && !v.ended) {
        saveProgress(v.currentTime, v.duration);
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
      flush();
    };
  }, [saveProgress, syncToServer]);

  /* ---- Video element event handlers ---- */

  const onLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration || 0);

    if (resumeCheckedRef.current) return;
    resumeCheckedRef.current = true;

    const dur = v.duration || 0;
    const saved = loadProgress();

    // Resume priority: server > localStorage > none. Server is cross-device
    // authoritative; localStorage is the offline / pre-sync fallback.
    let candidateTime = 0;
    if (initialProgress?.watchedSeconds > 0) {
      candidateTime = Number(initialProgress.watchedSeconds);
    } else if (saved?.t > 0) {
      candidateTime = saved.t;
    }

    const canResume =
      candidateTime >= RESUME_MIN_SECONDS &&
      (dur === 0 || candidateTime < dur - RESUME_END_PAD_SECONDS);

    if (canResume) {
      // Wait for the viewer's choice — keep it paused behind the prompt.
      setResumePrompt({ time: candidateTime });
    } else {
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    }
  };

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime || 0);
    if (
      !resumePrompt &&
      !v.paused &&
      Date.now() - lastSaveRef.current > SAVE_INTERVAL_MS
    ) {
      lastSaveRef.current = Date.now();
      saveProgress(v.currentTime, v.duration);
    }
    // Server sync runs on its own SERVER_SYNC_INTERVAL_MS (15s) cadence,
    // gated internally by syncToServer's throttle.
    if (!resumePrompt && !v.paused) {
      syncToServer();
    }
  };

  const onProgress = () => {
    const v = videoRef.current;
    if (!v || v.buffered.length === 0) return;
    setBuffered(v.buffered.end(v.buffered.length - 1));
  };

  const onPlay = () => setIsPlaying(true);
  const onPause = () => {
    setIsPlaying(false);
    const v = videoRef.current;
    if (v && !v.ended) {
      saveProgress(v.currentTime, v.duration);
      syncToServer({ flush: true });
    }
  };

  const handleEnded = () => {
    clearProgress();
    // Confirm completion server-side — watchedSeconds=duration crosses the
    // 95% threshold and flips the `completed` flag (idempotent if already set).
    syncToServer({ flush: true, completionFlush: true });
    if (onEnded) onEnded();
  };

  const onVolumeChangeNative = () => {
    const v = videoRef.current;
    if (!v) return;
    setVolume(v.volume);
    setMuted(v.muted);
  };

  /* ---- User actions ---- */

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } else {
      v.pause();
    }
  }, []);

  const seekTo = (sec) => {
    const v = videoRef.current;
    if (!v || !Number.isFinite(sec)) return;
    v.currentTime = Math.max(0, Math.min(sec, v.duration || sec));
  };

  const onSeekInput = (e) => seekTo(Number(e.target.value));

  const toggleMute = () => setMuted((m) => !m);

  const onVolumeInput = (e) => {
    const next = Number(e.target.value);
    setVolume(next);
    if (next > 0) setMuted(false);
  };

  const toggleFullscreen = useCallback(async () => {
    const root = containerRef.current;
    if (!root) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
    } else {
      await root.requestFullscreen().catch(() => {});
    }
  }, []);

  /* ---- Resume prompt actions ---- */

  const handleResume = () => {
    // Continue from the exact saved position — no rewind.
    const target = Math.max(0, resumePrompt?.time || 0);
    setResumePrompt(null);
    seekTo(target);
    const p = videoRef.current?.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  };

  const handleStartOver = () => {
    setResumePrompt(null);
    clearProgress();
    seekTo(0);
    const p = videoRef.current?.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  };

  /* ---- Controls auto-hide ---- */

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      // Don't hide while a menu is open or while paused.
      const v = videoRef.current;
      if (v && !v.paused && !rateMenuOpen && !qualityMenuOpen) {
        setControlsVisible(false);
      }
    }, 2200);
  }, [rateMenuOpen, qualityMenuOpen]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  /* ---- Keyboard shortcuts (scoped to this player) ---- */

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return undefined;
    const onKey = (e) => {
      // Ignore typing inside any contenteditable / inputs the user may add.
      if (
        e.target instanceof HTMLElement &&
        ["INPUT", "TEXTAREA"].includes(e.target.tagName)
      ) {
        return;
      }
      // While the resume prompt is up, swallow shortcuts — the choice comes first.
      if (resumePrompt) return;
      switch (e.key) {
        case " ":
        case "k":
        case "K":
          e.preventDefault();
          togglePlay();
          showControls();
          break;
        case "ArrowRight":
          e.preventDefault();
          seekTo((videoRef.current?.currentTime || 0) + 5);
          showControls();
          break;
        case "ArrowLeft":
          e.preventDefault();
          seekTo((videoRef.current?.currentTime || 0) - 5);
          showControls();
          break;
        case "ArrowUp":
          e.preventDefault();
          setVolume((v) => Math.min(1, +(v + 0.1).toFixed(2)));
          setMuted(false);
          showControls();
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolume((v) => Math.max(0, +(v - 0.1).toFixed(2)));
          showControls();
          break;
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
        case "M":
          e.preventDefault();
          toggleMute();
          showControls();
          break;
        default:
          break;
      }
    };
    root.addEventListener("keydown", onKey);
    return () => root.removeEventListener("keydown", onKey);
  }, [togglePlay, toggleFullscreen, showControls, resumePrompt]);

  /* ---- Render ---- */

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;
  const volumePct = (muted ? 0 : volume) * 100;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onMouseMove={showControls}
      onMouseLeave={() => {
        if (videoRef.current && !videoRef.current.paused) {
          setControlsVisible(false);
        }
      }}
      className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-border focus:outline-none group"
    >
      <video
        ref={videoRef}
        src={src}
        title={title}
        className="absolute inset-0 h-full w-full"
        onLoadedMetadata={onLoadedMetadata}
        onTimeUpdate={onTimeUpdate}
        onProgress={onProgress}
        onPlay={onPlay}
        onPause={onPause}
        onEnded={handleEnded}
        onVolumeChange={onVolumeChangeNative}
        onClick={resumePrompt ? undefined : togglePlay}
        onDoubleClick={resumePrompt ? undefined : toggleFullscreen}
        playsInline
        preload="metadata"
      />

      {/* Resume / Start over prompt */}
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

      {/* Center play affordance shown while paused (not during the prompt). */}
      {!isPlaying && !resumePrompt && (
        <button
          type="button"
          aria-label="Play"
          onClick={togglePlay}
          className="absolute inset-0 grid place-items-center"
        >
          <span className="size-16 rounded-full bg-accent grid place-items-center text-bg shadow-[0_0_60px_rgba(94,234,212,0.45)] hover:scale-105 transition-transform">
            <PlayIcon width={24} height={24} />
          </span>
        </button>
      )}

      {/* Control bar */}
      <div
        className={[
          "absolute left-0 right-0 bottom-0 px-3 md:px-4 pb-3 md:pb-4 pt-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity",
          (controlsVisible || !isPlaying) && !resumePrompt
            ? "opacity-100"
            : "opacity-0 pointer-events-none",
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        {/* Seek bar */}
        <div className="relative h-1.5 w-full rounded-full bg-white/20 mb-2.5">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-white/40"
            style={{ width: `${bufferedPct}%` }}
          />
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-accent-2"
            style={{ width: `${progress}%` }}
          />
          <input
            type="range"
            min="0"
            max={duration || 0}
            step="0.1"
            value={currentTime}
            onChange={onSeekInput}
            aria-label="Seek"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        <div className="flex items-center gap-3 text-white text-xs md:text-sm">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="p-1 rounded hover:bg-white/10"
          >
            {isPlaying ? (
              <PauseIcon width={18} height={18} />
            ) : (
              <PlayIcon width={18} height={18} />
            )}
          </button>

          <span className="font-mono text-[12px] tabular-nums">
            {formatTime(currentTime)} <span className="text-white/60">/ {formatTime(duration)}</span>
          </span>

          {/* Volume */}
          <div className="flex items-center gap-1.5 group/vol">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? "Unmute" : "Mute"}
              className="p-1 rounded hover:bg-white/10"
            >
              <VolumeIcon width={18} height={18} />
            </button>
            <div className="relative h-1 w-0 group-hover/vol:w-20 overflow-hidden transition-[width] duration-200 rounded-full bg-white/20">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-white"
                style={{ width: `${volumePct}%` }}
              />
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={muted ? 0 : volume}
                onChange={onVolumeInput}
                aria-label="Volume"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>

          <div className="flex-1" />

          {/* Speed menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setRateMenuOpen((o) => !o);
                setQualityMenuOpen(false);
              }}
              className="px-2 py-1 rounded hover:bg-white/10 font-mono text-[12px]"
              aria-haspopup="menu"
              aria-expanded={rateMenuOpen}
            >
              {rate}x
            </button>
            {rateMenuOpen && (
              <div
                role="menu"
                className="absolute bottom-full right-0 mb-2 w-28 rounded-lg bg-card border border-border-strong shadow-lg overflow-hidden"
              >
                {PLAYBACK_RATES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    role="menuitemradio"
                    aria-checked={r === rate}
                    onClick={() => {
                      setRate(r);
                      setRateMenuOpen(false);
                    }}
                    className={[
                      "w-full text-left px-3 py-1.5 text-xs hover:bg-white/5",
                      r === rate ? "text-accent-2" : "text-white/80",
                    ].join(" ")}
                  >
                    {r}x {r === 1 ? "(normal)" : ""}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cosmetic quality menu — single "Auto" entry for now. */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setQualityMenuOpen((o) => !o);
                setRateMenuOpen(false);
              }}
              className="px-2 py-1 rounded hover:bg-white/10 font-mono text-[12px]"
              aria-haspopup="menu"
              aria-expanded={qualityMenuOpen}
            >
              Auto
            </button>
            {qualityMenuOpen && (
              <div
                role="menu"
                className="absolute bottom-full right-0 mb-2 w-32 rounded-lg bg-card border border-border-strong shadow-lg overflow-hidden"
              >
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked
                  onClick={() => setQualityMenuOpen(false)}
                  className="w-full text-left px-3 py-1.5 text-xs text-accent-2"
                >
                  Auto (source)
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            className="p-1 rounded hover:bg-white/10"
          >
            <ExpandIcon width={18} height={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
