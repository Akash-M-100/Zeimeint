"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Globe, X } from "lucide-react";
import { Github, Linkedin, Twitter } from "../ui/BrandIcons";
import SectionLabel from "../ui/SectionLabel";

// Slice 13: marketing-home roster — fetched from /api/instructors.
// Slice (this chore): conditional render. With <= 4 instructors a static
// centered row reads better than a single-card "carousel". With >= 5 we
// fall back to an interval-based slide rotation (auto-rotates every 5s,
// pauses on hover, resumes 3s after the cursor leaves).

const STATIC_THRESHOLD = 4;
const ROTATE_INTERVAL_MS = 5000;
const HOVER_RESUME_DELAY_MS = 3000;
const SLIDE_TRANSITION_MS = 400;
const GAP_PX = 24;
const DEFAULT_CARD_WIDTH_PX = 400;
const STATIC_CARD_WIDTH_PX = 400;

function initialsOf(name) {
  return String(name || "?")
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Avatar with built-in initials fallback. Used by both card and modal so
// "broken image / missing URL / expired signed URL" all collapse to the
// same gentle initials placeholder. onError trips `errored` and the
// reset effect re-enables the image whenever the URL itself changes
// (e.g. a freshly re-signed CloudFront URL after a hard refresh).
function AvatarCircle({ url, name, size = 64 }) {
  const [errored, setErrored] = useState(false);
  useEffect(() => {
    setErrored(false);
  }, [url]);

  const initials = initialsOf(name);
  const showImage = url && !errored;

  return (
    <div
      className="rounded-full grid place-items-center overflow-hidden shrink-0"
      style={{
        width: size,
        height: size,
        background: "var(--bg-2)",
        border: "1px solid var(--border)",
      }}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={name || ""}
          onError={() => setErrored(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span
          className="font-display"
          style={{
            fontSize: Math.round(size * 0.32),
            color: "var(--fg-mute)",
          }}
        >
          {initials || "?"}
        </span>
      )}
    </div>
  );
}

export default function InstructorsCarousel() {
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalInstructor, setModalInstructor] = useState(null);

  // Carousel state — only meaningful when count > STATIC_THRESHOLD.
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);
  const resumeTimeoutRef = useRef(null);
  const viewportRef = useRef(null);

  // One-shot fetch on mount. Failure renders the empty state (entire
  // section hides) rather than blocking the rest of the marketing page.
  useEffect(() => {
    let active = true;
    fetch("/api/instructors", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        setInstructors(d?.data?.instructors || []);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const count = instructors.length;
  const useStatic = count <= STATIC_THRESHOLD;

  // Responsive visible-card count for the carousel branch. ResizeObserver
  // (below) keeps viewportWidth in sync; default of 0 means cardWidth
  // falls through to DEFAULT_CARD_WIDTH_PX before first measurement so
  // SSR + first paint don't divide by zero.
  const visibleCount = viewportWidth >= 1024 ? 4 : viewportWidth >= 640 ? 2 : 1;
  const cardWidth =
    viewportWidth > 0
      ? (viewportWidth - (visibleCount - 1) * GAP_PX) / visibleCount
      : DEFAULT_CARD_WIDTH_PX;
  const slideStepPx = cardWidth + GAP_PX;
  // Last valid starting index — past this we'd render empty space on the
  // right because count - visibleCount additional cards don't exist.
  const maxIndex = Math.max(0, count - visibleCount);

  // Measure viewport width whenever the carousel is mounted. Skips entirely
  // in static mode so the observer doesn't churn for the small-count case.
  useEffect(() => {
    if (useStatic) return undefined;
    const el = viewportRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => {
      setViewportWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [useStatic]);

  // Auto-rotation. Halts on pause, on static layouts, and when everything
  // already fits on screen (maxIndex === 0 → nothing to rotate to).
  useEffect(() => {
    if (useStatic || isPaused || maxIndex === 0) return undefined;
    const id = setInterval(() => {
      setIndex((i) => (i + 1 > maxIndex ? 0 : i + 1));
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [useStatic, isPaused, maxIndex]);

  // Clamp the index if maxIndex drops underneath it (viewport resized
  // wider, or the instructor list shrank). Without this the rail would
  // translate off into empty space.
  useEffect(() => {
    if (index > maxIndex) setIndex(0);
  }, [index, maxIndex]);

  // Unmount cleanup for the hover-resume timer. setInterval is cleaned
  // up by its own effect's return; the timeout below needs its own
  // safety net in case the section unmounts mid-hover.
  useEffect(() => {
    return () => {
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
    setIsPaused(true);
  };

  const handleMouseLeave = () => {
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    resumeTimeoutRef.current = setTimeout(() => {
      setIsPaused(false);
      resumeTimeoutRef.current = null;
    }, HOVER_RESUME_DELAY_MS);
  };

  if (loading) {
    return (
      <section
        className="relative py-32"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div className="max-w-7xl mx-auto px-6">
          <SectionLabel num="05" label="Instructors" />
          <div
            className="font-mono text-sm"
            style={{ color: "var(--fg-mute)" }}
          >
            loading instructors…
          </div>
        </div>
      </section>
    );
  }

  // No instructors → hide the whole section. Better than an empty card row.
  if (count === 0) return null;

  return (
    <section
      id="instructors"
      className="relative py-32"
      style={{ borderTop: "1px solid var(--border)" }}
    >
      <div className="max-w-7xl mx-auto px-6 mb-12">
        <SectionLabel num="05" label="Instructors" />

        <h2
          className="font-display"
          style={{ fontSize: "clamp(40px, 5vw, 68px)", lineHeight: 1.04 }}
        >
          Meet your
          <br />
          <span className="italic-display" style={{ color: "var(--accent)" }}>
            instructors.
          </span>
        </h2>
        <p
          className="mt-5 max-w-xl"
          style={{ color: "var(--fg-dim)", fontSize: 16, lineHeight: 1.6 }}
        >
          Senior engineers and educators who&apos;ve shipped products at scale,
          now teaching what they wish they&apos;d been taught.
        </p>
      </div>

      {useStatic ? (
        <div className="max-w-7xl mx-auto px-6">
          <div
            className="flex flex-wrap justify-center gap-6"
            role="region"
            aria-label="Instructors"
          >
            {instructors.map((inst) => (
              <div
                key={inst._id}
                style={{ width: `${STATIC_CARD_WIDTH_PX}px` }}
              >
                <InstructorCard
                  instructor={inst}
                  onClick={() => setModalInstructor(inst)}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-6">
          <div
            ref={viewportRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="overflow-hidden"
            role="region"
            aria-label="Instructor carousel"
          >
            <div
              className="flex gap-6"
              style={{
                transform: `translateX(-${index * slideStepPx}px)`,
                transition: `transform ${SLIDE_TRANSITION_MS}ms ease`,
              }}
            >
              {instructors.map((inst) => (
                <div
                  key={inst._id}
                  className="shrink-0"
                  style={{ width: `${cardWidth}px` }}
                >
                  <InstructorCard
                    instructor={inst}
                    onClick={() => setModalInstructor(inst)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {modalInstructor && (
        <InstructorModal
          instructor={modalInstructor}
          onClose={() => setModalInstructor(null)}
        />
      )}
    </section>
  );
}

function InstructorCard({ instructor, onClick }) {
  // Width comes from the parent wrapper. aspect-square locks the height
  // to match — every card is a uniform N x N square. overflow-hidden
  // clips any long bio that would otherwise blow past the bottom edge;
  // line-clamp-3 on the bio paragraph below keeps that rare.
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full aspect-square overflow-hidden flex flex-col text-left rounded-2xl p-8 transition-colors"
      style={{
        background: "var(--bg-1)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center gap-5 mb-5">
        <AvatarCircle
          url={instructor.avatarUrl}
          name={instructor.name}
          size={96}
        />
        <div className="min-w-0">
          <div className="font-display truncate" style={{ fontSize: 22 }}>
            {instructor.name}
          </div>
          {instructor.title && (
            <div
              className="font-mono uppercase truncate mt-1"
              style={{
                color: "var(--accent)",
                fontSize: 12,
                letterSpacing: "0.14em",
              }}
            >
              {instructor.title}
            </div>
          )}
        </div>
      </div>

      {instructor.bio && (
        <p
          className="line-clamp-5 mb-4"
          style={{ color: "var(--fg-dim)", fontSize: 15, lineHeight: 1.65 }}
        >
          {instructor.bio}
        </p>
      )}

      {instructor.expertise?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {instructor.expertise.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="font-mono uppercase px-2.5 py-1 rounded-full"
              style={{
                fontSize: 12,
                letterSpacing: "0.12em",
                color: "var(--accent)",
                background: "rgba(94,234,212,0.06)",
                border: "1px solid var(--accent-dim)",
              }}
            >
              {tag}
            </span>
          ))}
          {instructor.expertise.length > 4 && (
            <span
              className="font-mono self-center"
              style={{ fontSize: 12, color: "var(--fg-mute)" }}
            >
              +{instructor.expertise.length - 4}
            </span>
          )}
        </div>
      )}
    </button>
  );
}

function InstructorModal({ instructor, onClose }) {
  // Memoise the handler so the effect dep array stays stable across renders.
  const handleClose = useCallback(() => onClose(), [onClose]);

  // Escape closes; cleanup on unmount.
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handleClose]);

  // Lock body scroll while the modal is open so wheel events don't drive
  // the page underneath. Restore the previous value on close — never
  // hard-set to "" which would clobber a parent component's lock.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const socialIcons = [
    {
      key: "linkedin",
      url: instructor.socialLinks?.linkedin,
      Icon: Linkedin,
      label: "LinkedIn",
    },
    {
      key: "twitter",
      url: instructor.socialLinks?.twitter,
      Icon: Twitter,
      label: "Twitter",
    },
    {
      key: "github",
      url: instructor.socialLinks?.github,
      Icon: Github,
      label: "GitHub",
    },
    {
      key: "website",
      url: instructor.socialLinks?.website,
      Icon: Globe,
      label: "Website",
    },
  ].filter((s) => s.url);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${instructor.name} profile`}
    >
      <div
        className="rounded-2xl max-w-lg w-full p-8 relative max-h-[90vh] overflow-y-auto"
        style={{
          background: "var(--bg)",
          border: "1px solid var(--border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 transition-colors"
          style={{ color: "var(--fg-mute)" }}
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center mb-6">
          <div className="mb-4">
            <AvatarCircle
              url={instructor.avatarUrl}
              name={instructor.name}
              size={96}
            />
          </div>
          <h3 className="font-display" style={{ fontSize: 28 }}>
            {instructor.name}
          </h3>
          {instructor.title && (
            <div
              className="font-mono uppercase mt-1"
              style={{
                color: "var(--accent)",
                fontSize: 11,
                letterSpacing: "0.14em",
              }}
            >
              {instructor.title}
            </div>
          )}
          {instructor.yearsOfExperience != null && (
            <div
              className="font-mono mt-1"
              style={{ color: "var(--fg-mute)", fontSize: 11 }}
            >
              {instructor.yearsOfExperience}+ years of experience
            </div>
          )}
        </div>

        {instructor.bio && (
          <p
            className="mb-6 whitespace-pre-line"
            style={{ color: "var(--fg-dim)", fontSize: 14, lineHeight: 1.65 }}
          >
            {instructor.bio}
          </p>
        )}

        {instructor.expertise?.length > 0 && (
          <div className="mb-6">
            <div
              className="font-mono uppercase mb-2"
              style={{
                color: "var(--fg-mute)",
                fontSize: 10,
                letterSpacing: "0.18em",
              }}
            >
              Expertise
            </div>
            <div className="flex flex-wrap gap-1.5">
              {instructor.expertise.map((tag) => (
                <span
                  key={tag}
                  className="font-mono uppercase px-2 py-0.5 rounded-full"
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.12em",
                    color: "var(--accent)",
                    background: "rgba(94,234,212,0.06)",
                    border: "1px solid var(--accent-dim)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {socialIcons.length > 0 && (
          <div
            className="flex justify-center gap-5 pt-5"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            {socialIcons.map(({ key, url, Icon, label }) => (
              <a
                key={key}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors"
                style={{ color: "var(--fg-mute)" }}
                aria-label={label}
              >
                <Icon size={20} />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
