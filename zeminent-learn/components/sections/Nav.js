"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User as UserIcon, LayoutDashboard, LogOut } from "lucide-react";
import { useAuth } from "../../app/components/AuthProvider";
import ThemeToggle from "../ThemeToggle";

export default function Nav() {
  const router = useRouter();
  const { status, user, logout } = useAuth();
  const profileInitial = (user?.name?.[0] ?? "?").toUpperCase();
  const [scrolled, setScrolled] = useState(false);
  const authed = status === "authenticated";
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const smoothScrollTo = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const navOffset = 80;
    const targetY =
      el.getBoundingClientRect().top + window.pageYOffset - navOffset;
    const startY = window.pageYOffset;
    const distance = targetY - startY;
    const duration = Math.min(650, Math.max(320, Math.abs(distance) * 0.22));
    const startTime = performance.now();
    const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
    const step = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      window.scrollTo(0, startY + distance * easeOutExpo(progress));
      if (progress < 1) requestAnimationFrame(step);
    };
    window.scrollTo(0, startY + distance * easeOutExpo(0.001));
    requestAnimationFrame(step);
  };

  const onNavClick = (e, id) => {
    e.preventDefault();
    smoothScrollTo(id);
    if (history.replaceState) history.replaceState(null, "", `#${id}`);
  };
  return (
    <header
      className="fixed top-0 left-0 right-0 z-40"
      style={{
        backdropFilter: scrolled ? "blur(14px) saturate(140%)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(14px) saturate(140%)" : "none",
        background: scrolled ? "var(--nav-bg)" : "transparent",
        borderBottom: scrolled ? "1px solid var(--border)" : "1px solid transparent",
        transition: "all 0.3s ease",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center" style={{ height: 64 }}>
        <a href="#" className="flex items-center" aria-label="Zeminent">
          <Image
            src="/zeminent-logo-v3.png"
            alt="Zeminent"
            width={114}
            height={25}
            priority
            className="brand-logo"
            style={{ height: 24, width: "auto" }}
          />
        </a>

        <nav
          className="hidden md:flex items-center gap-8 mx-auto"
          style={{ fontSize: 14, color: "var(--fg-dim)" }}
        >
          {["Curriculum", "Instructors", "Certificate", "Pricing", "FAQ"].map((l) => {
            const id = l.toLowerCase();
            return (
              <a
                key={l}
                href={`#${id}`}
                onClick={(e) => onNavClick(e, id)}
                className="nav-link"
              >
                {l}
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 ml-auto md:ml-0">
          <ThemeToggle size={36} />
          {!authed ? (
            <button
              onClick={() => router.push("/login")}
              className="px-4 py-2"
              style={{ fontSize: 13, color: "var(--fg-dim)", cursor: "pointer" }}
            >
              Sign in
            </button>
          ) : (
            <ProfileDropdown
              initial={profileInitial}
              onLogout={async () => {
                await logout();
                router.push("/");
              }}
            />
          )}
        </div>
      </div>
    </header>
  );
}

// Profile-avatar dropdown — opens on click, closes on click-outside / Escape
// / menu-item click. Anchored to the right so it never clips the viewport on
// narrow screens. Logged-out callers don't render this — they see a Sign in
// button instead (handled by the parent). Sign-out is awaited before the
// parent's router.push so the homepage paints in the unauthenticated state
// rather than briefly showing the avatar.
function ProfileDropdown({ initial, onLogout }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (e) => {
      if (!containerRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const itemClass =
    "flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open profile menu"
        className="size-9 rounded-full bg-card-2 grid place-items-center text-accent-2 font-medium text-sm border border-border hover:border-border-strong hover:scale-105 transition-all"
        style={{ cursor: "pointer" }}
      >
        {initial}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-48 rounded-xl border shadow-lg z-50 p-1"
          style={{
            background: "var(--bg-1)",
            borderColor: "var(--border)",
            color: "var(--fg)",
          }}
        >
          <Link
            href="/Profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={`${itemClass} hover:bg-card-2`}
            style={{ color: "var(--fg)" }}
          >
            <UserIcon size={16} />
            Profile
          </Link>
          <Link
            href="/Dashboard"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={`${itemClass} hover:bg-card-2`}
            style={{ color: "var(--fg)" }}
          >
            <LayoutDashboard size={16} />
            Dashboard
          </Link>
          {onLogout && (
            <>
              <div
                className="my-1 h-px"
                style={{ background: "var(--border)" }}
                aria-hidden="true"
              />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onLogout();
                }}
                className={`${itemClass} hover:bg-card-2`}
                style={{ color: "var(--fg-dim)", cursor: "pointer" }}
              >
                <LogOut size={16} />
                Sign out
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
