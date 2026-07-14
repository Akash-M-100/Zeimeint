"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../components/AuthProvider";
import {
  GridIcon,
  BookIcon,
  MedalIcon,
  ArrowLeftIcon,
  GraduationCapIcon,
  BroadcastIcon,
  UserIcon,
  GearIcon,
  MenuIcon,
  XIcon,
} from "../components/Icons";
import ThemeToggle from "../../components/ThemeToggle";

// All sidebar pieces live here as nested components. Scoped to the Dashboard section only.

const navItems = [
  { id: "dashboard", label: "Dashboard", href: "/Dashboard", Icon: GridIcon },
  { id: "courses", label: "My Courses", href: "/courses", Icon: GraduationCapIcon },
  { id: "curriculum", label: "Curriculum", href: "/Dashboard/Curriculum", Icon: BookIcon },
  { id: "live-classes", label: "Live Classes", href: "/Dashboard/LiveClasses", Icon: BroadcastIcon },
  { id: "certificate", label: "Certificates", href: "/Dashboard/Certificate", Icon: MedalIcon },
  { id: "profile", label: "Profile", href: "/Profile", Icon: UserIcon },
  // Settings lives behind the Profile page's "Preferences" tab — no separate route.
  { id: "settings", label: "Settings", href: "/Profile?tab=preferences", Icon: GearIcon },
];

function BrandMark() {
  return (
    <Link href="/Dashboard" className="flex items-center px-2" aria-label="Zeminent">
      <Image
        src="/zeminent-logo-v3.png"
        alt="Zeminent"
        width={114}
        height={25}
        priority
        className="h-6 w-auto brand-logo"
      />
    </Link>
  );
}

function ProgressRing({ percent = 0, size = 44 }) {
  const stroke = 2;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={stroke}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="url(#ringGrad)"
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
      />
      <defs>
        <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5eead4" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function ProfileCard({ progress = 0 }) {
  const { user } = useAuth();
  const name = user?.name ?? "Student";
  const initial = (name?.[0] ?? "?").toUpperCase();
  return (
    <Link
      href="/Profile"
      aria-label="Open your profile"
      className="card p-3 flex items-center gap-3 hover:bg-white/5 hover:border-border-strong transition-colors"
    >
      <div className="relative grid place-items-center">
        <ProgressRing percent={progress} />
        <div className="absolute inset-0 grid place-items-center text-sm">
          <span className="size-8 rounded-full bg-card-2 grid place-items-center text-accent-2 font-medium">
            {initial}
          </span>
        </div>
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium truncate">{name}</div>
        <div className="font-mono text-[11px] text-muted">
          {progress}% complete
        </div>
      </div>
    </Link>
  );
}

function NavItem({ item, active, onNavigate }) {
  const { Icon } = item;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={[
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
        active
          ? "bg-accent-soft text-white border border-border-strong"
          : "text-muted-2 hover:text-white hover:bg-white/5",
      ].join(" ")}
    >
      <Icon className={active ? "text-accent-2" : ""} />
      <span>{item.label}</span>
    </Link>
  );
}

function NavList({ onNavigate }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        // Exact match — /Dashboard shouldn't stay highlighted on sub-routes.
        const active = pathname === item.href;
        return (
          <NavItem
            key={item.id}
            item={item}
            active={active}
            onNavigate={onNavigate}
          />
        );
      })}
    </nav>
  );
}

function SignOutButton() {
  const { logout } = useAuth();
  const router = useRouter();
  async function onClick() {
    await logout();
    router.replace("/login");
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full border border-border text-sm text-muted-2 hover:text-white hover:border-border-strong transition-colors"
    >
      <ArrowLeftIcon width={14} height={14} />
      sign out
    </button>
  );
}

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [avgProgress, setAvgProgress] = useState(0);

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock background scroll while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Completion for the profile ring. Averaged only over courses the learner has
  // actually started (any progress) — not-started / lightly-previewed courses
  // shouldn't drag the number down, so finishing your courses reads ~100%.
  // Silent on 401 / network blip; the Dashboard layout's auth gate handles redirect.
  useEffect(() => {
    fetch("/api/progress/summary", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { data: { summary: [] } }))
      .then((d) => {
        const list = d.data?.summary || [];
        const started = list.filter(
          (s) => (s.percent || 0) > 0 || (s.watchedLectures || 0) > 0,
        );
        const avg = started.length
          ? Math.round(
              started.reduce((a, s) => a + (s.percent || 0), 0) / started.length,
            )
          : 0;
        setAvgProgress(avg);
      })
      .catch(() => setAvgProgress(0));
  }, []);

  return (
    <>
      {/* Mobile top bar with hamburger — hidden on md+ where the sidebar is static. */}
      <header className="md:hidden fixed inset-x-0 top-0 z-40 flex items-center gap-3 h-14 px-4 border-b border-border bg-bg/90 backdrop-blur">
        <BrandMark />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="ml-auto grid place-items-center size-9 -mr-1 rounded-lg text-muted-2 hover:text-white hover:bg-white/5 transition-colors"
        >
          <MenuIcon width={22} height={22} />
        </button>
      </header>

      {/* Backdrop for the mobile drawer. */}
      {open ? (
        <div
          onClick={() => setOpen(false)}
          aria-hidden="true"
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        />
      ) : null}

      {/* Sidebar: static on md+, slide-in drawer on mobile. */}
      <aside
        className={[
          "w-65 shrink-0 border-border flex flex-col py-6 px-5 gap-6 bg-bg",
          // Mobile: slide-in drawer from the RIGHT. Desktop: static sidebar on the left.
          "fixed inset-y-0 right-0 z-50 border-l transition-transform duration-300 ease-in-out",
          "md:static md:z-auto md:border-l-0 md:border-r md:translate-x-0 md:transition-none",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        <div className="md:hidden flex justify-end -mt-2 -mr-1">
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="grid place-items-center size-9 rounded-lg text-muted-2 hover:text-white hover:bg-white/5 transition-colors"
          >
            <XIcon width={20} height={20} />
          </button>
        </div>
        <BrandMark />
        <ProfileCard progress={avgProgress} />
        <NavList onNavigate={() => setOpen(false)} />
        <div className="mt-auto flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-sm text-muted-2">Theme</span>
            <ThemeToggle size={34} />
          </div>
          <SignOutButton />
        </div>
      </aside>
    </>
  );
}
