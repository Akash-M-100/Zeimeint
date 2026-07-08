"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Certificate, { CERT_WIDTH, CERT_HEIGHT } from "./Certificate";
import { LockIcon, DownloadIcon, ShareIcon, CheckCircleIcon, ArrowRightIcon } from "../../components/Icons";
import { useAuth } from "../../components/AuthProvider";

const AVG_LECTURE_MIN = 12; // no per-lecture durations in the summary; estimate.

// Where the certificate's QR code points when scanned.
const VERIFY_URL = "https://www.zeminent.com/";

// Deterministic, stable certificate id from the user + course. Same learner +
// same course always yields the same id, so it can be re-verified.
function makeCertId(seed) {
  const hash = (str, seed0) => {
    let h = seed0;
    for (let i = 0; i < str.length; i++) h = (Math.imul(h, 33) ^ str.charCodeAt(i)) >>> 0;
    return h.toString(36).toUpperCase().padStart(5, "0").slice(-4);
  };
  return `ZM-${hash(seed, 5381)}-${hash(seed, 52711)}`;
}

function fmtDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function fmtDuration(totalLectures) {
  if (!totalLectures) return "Self-paced";
  const mins = totalLectures * AVG_LECTURE_MIN;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h} hours`;
  return `${m} min`;
}

// ─── responsive scaler — fits the fixed A4 canvas to the column width ──────────

function useFitScale() {
  const ref = useRef(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / CERT_WIDTH));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, scale };
}

function CertificateStage({ vars, dimmed }) {
  const { ref, scale } = useFitScale();
  return (
    <div ref={ref} className="zm-stage">
      <div
        className="zm-stage__scale"
        style={{ transform: `scale(${scale})`, height: CERT_HEIGHT * scale }}
      >
        <div className={`zm-print-area${dimmed ? " zm-print-area--dimmed" : ""}`}>
          <Certificate {...vars} />
        </div>
      </div>
      <style>{STAGE_CSS}</style>
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function CertificatePage() {
  const { user } = useAuth();
  const name = user?.name ?? "Student";
  const seedBase = user?.id || user?.email || name;

  const [summary, setSummary] = useState(null); // null = loading
  useEffect(() => {
    fetch("/api/progress/summary", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { data: { summary: [] } }))
      .then((d) => setSummary(d.data?.summary || []))
      .catch(() => setSummary([]));
  }, []);

  const completed = useMemo(
    () => (summary || []).filter((s) => (s.percent ?? 0) >= 100),
    [summary],
  );

  // Which completed course's certificate is on screen.
  const [selectedId, setSelectedId] = useState(null);
  const active = useMemo(() => {
    if (!completed.length) return null;
    return completed.find((c) => String(c.courseId) === String(selectedId)) || completed[0];
  }, [completed, selectedId]);

  const certId = useMemo(
    () => (active ? makeCertId(`${seedBase}:${active.courseId}`) : ""),
    [active, seedBase],
  );

  // Real, embeddable QR encoding the verification URL.
  const [qr, setQr] = useState("");
  useEffect(() => {
    if (!certId) return;
    let live = true;
    import("qrcode")
      .then((QR) =>
        QR.toDataURL(VERIFY_URL, {
          margin: 1,
          width: 240,
          color: { dark: "#191B1F", light: "#FFFFFF" },
        }),
      )
      .then((url) => live && setQr(url))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [certId]);

  const vars = useMemo(() => {
    if (!active) return null;
    return {
      studentName: name,
      courseName: active.title || "Zeminent Course",
      completionDate: fmtDate(active.lastWatchedAt || active.completedAt),
      duration: fmtDuration(active.totalLectures),
      score: `${active.percent ?? 100}%`,
      certificateId: certId,
      qrCode: qr,
    };
  }, [active, name, certId, qr]);

  const onDownload = useCallback(() => window.print(), []);
  const linkedInHref = useMemo(() => {
    if (!active) return "#";
    const p = new URLSearchParams({
      startTask: "CERTIFICATION_NAME",
      name: `${active.title || "Zeminent Course"} — Certificate of Completion`,
      organizationName: "Zeminent",
      certId,
      certUrl: VERIFY_URL,
    });
    return `https://www.linkedin.com/profile/add?${p.toString()}`;
  }, [active, certId]);

  // ── loading ──
  if (summary === null) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <div className="font-mono-label">loading…</div>
      </div>
    );
  }

  // ── no enrolled / no progress at all ──
  if ((summary || []).length === 0) {
    return (
      <EmptyState
        title="No certificate yet."
        body="Enrol in a course and complete it to earn your first verifiable certificate — issued at 100% completion."
      />
    );
  }

  // ── nothing completed yet → show progress toward the nearest certificate ──
  if (!active) {
    const nearest = [...summary].sort((a, b) => (b.percent ?? 0) - (a.percent ?? 0))[0];
    const previewVars = {
      studentName: name,
      courseName: nearest?.title || "Your course",
      completionDate: "—",
      duration: fmtDuration(nearest?.totalLectures),
      score: `${nearest?.percent ?? 0}%`,
      certificateId: "LOCKED",
      qrCode: "",
    };
    return (
      <div className="max-w-[1180px] mx-auto px-6 md:px-10 py-10 flex flex-col gap-8">
        <Header />
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="inline-flex items-center gap-2 font-mono text-[11px] text-muted-2 px-3 py-1.5 rounded-full border border-border">
            <LockIcon width={12} height={12} /> locked
          </span>
          <h1 className="font-display text-2xl md:text-3xl text-white">Your certificate is almost ready</h1>
          <p className="text-sm text-muted-2 max-w-md">
            Finish <span className="text-white">{nearest?.title || "your course"}</span> to unlock your
            verifiable certificate. You&apos;re at <span className="text-accent-2">{nearest?.percent ?? 0}%</span>.
          </p>
          <div className="w-full max-w-md mt-1">
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${nearest?.percent ?? 0}%` }} />
            </div>
          </div>
          <Link
            href={nearest?.courseId ? `/courses/${nearest.courseId}` : "/courses"}
            className="mt-2 inline-flex items-center gap-2 bg-accent hover:bg-accent-2 text-bg px-5 py-2.5 rounded-full text-sm font-medium transition-colors"
          >
            Continue course <ArrowRightIcon width={14} height={14} />
          </Link>
        </div>
        <CertificateStage vars={previewVars} dimmed />
      </div>
    );
  }

  // ── earned ──
  return (
    <div className="max-w-[1180px] mx-auto px-6 md:px-10 py-10 flex flex-col gap-7">
      <Header />

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="size-9 rounded-xl grid place-items-center bg-accent-soft text-accent-2 shrink-0">
            <CheckCircleIcon width={18} height={18} />
          </span>
          <div>
            <h1 className="font-display text-xl text-white leading-tight">Certificate earned</h1>
            <p className="text-xs text-muted-2 mt-0.5">
              ID {certId} · scan the QR to verify
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent-2 text-bg px-4 py-2.5 rounded-full text-sm font-medium transition-colors"
          >
            <DownloadIcon width={14} height={14} /> Download PDF
          </button>
          <a
            href={linkedInHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-border text-sm text-muted-2 hover:text-white hover:border-border-strong transition-colors"
          >
            <ShareIcon width={14} height={14} /> Add to LinkedIn
          </a>
        </div>
      </div>

      {/* course selector when more than one certificate is earned */}
      {completed.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {completed.map((c) => {
            const on = String(c.courseId) === String(active.courseId);
            return (
              <button
                key={c.courseId}
                type="button"
                onClick={() => setSelectedId(c.courseId)}
                className={[
                  "px-3.5 py-1.5 rounded-full text-xs transition-colors border",
                  on
                    ? "bg-accent-soft text-white border-accent-2/40"
                    : "text-muted-2 border-border hover:text-white hover:border-border-strong",
                ].join(" ")}
              >
                {c.title || "Course"}
              </button>
            );
          })}
        </div>
      ) : null}

      <CertificateStage vars={vars} />
    </div>
  );
}

// ─── small pieces ─────────────────────────────────────────────────────────────

function Header() {
  return (
    <div>
      <div className="font-mono-label">credentials</div>
      <h2 className="font-display text-lg text-white mt-0.5">Certificates</h2>
    </div>
  );
}

function EmptyState({ title, body }) {
  return (
    <div className="max-w-[700px] mx-auto px-8 py-16 flex flex-col items-center text-center gap-6">
      <span className="inline-flex items-center gap-2 font-mono text-[11px] text-muted-2 px-3 py-1.5 rounded-full border border-border">
        <LockIcon width={12} height={12} /> locked
      </span>
      <h1 className="font-display text-2xl md:text-3xl text-white">{title}</h1>
      <p className="text-sm text-muted-2 max-w-md leading-relaxed">{body}</p>
      <Link
        href="/courses"
        className="inline-flex items-center gap-2 bg-accent hover:bg-accent-2 text-bg px-5 py-2.5 rounded-full text-sm font-medium transition-colors"
      >
        Browse courses <ArrowRightIcon width={14} height={14} />
      </Link>
    </div>
  );
}

const STAGE_CSS = `
.zm-stage{ width:100%; display:flex; justify-content:center; }
.zm-stage__scale{ width:${CERT_WIDTH}px; transform-origin:top center; }
.zm-print-area{
  box-shadow:0 18px 50px -20px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.04);
  border-radius:6px; overflow:hidden;
}
.zm-print-area--dimmed{ opacity:.5; filter:saturate(.85); }

@media print{
  /* isolate the certificate; everything else (sidebar, controls) is hidden */
  body * { visibility:hidden !important; }
  .zm-print-area, .zm-print-area * { visibility:visible !important; }
  .zm-stage{ position:static !important; }
  .zm-stage__scale{
    transform:none !important; height:auto !important; width:auto !important;
  }
  .zm-print-area{
    position:fixed !important; inset:0 !important; margin:0 !important;
    box-shadow:none !important; border-radius:0 !important; opacity:1 !important; filter:none !important;
  }
  /* restore the full A4 design size for print (undo the on-screen downscale) */
  .zm-print-area .zm-cert-box{ width:1123px !important; height:794px !important; }
  .zm-print-area .zm-cert{ transform:none !important; }
  @page{ size:A4 landscape; margin:0; }
}
`;
