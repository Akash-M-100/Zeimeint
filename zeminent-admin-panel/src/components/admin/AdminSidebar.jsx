"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Upload,
  Users,
  CreditCard,
  LogOut,
  GraduationCap,
  Radio,
  UserCog,
  Briefcase,
  PhoneCall,
  ShieldCheck,
  CalendarClock,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import { useAuth } from "@/context/AuthContext";
import { PANEL_NAMES } from "@/config/constants";
import { cn } from "@/utils/cn";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/courses", label: "Courses", icon: BookOpen },
  { href: "/admin/upload-course", label: "Upload Course", icon: Upload },
  { href: "/admin/live-classes", label: "Live Classes", icon: Radio },
  // Slice 16.5a: series-based meeting scheduling. Sits next to the legacy
  // Live Classes entry — they share a backend collection but the series
  // surface is the new admin-facing flow.
  { href: "/admin/meetings", label: "Meetings", icon: CalendarClock },
  { href: "/admin/instructors", label: "Instructors", icon: UserCog },
  // Admin user management — backend PR #15.
  { href: "/admin/admins", label: "Admins", icon: ShieldCheck },
  { href: "/admin/students", label: "Students", icon: Users },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  // Slice 14 B.6: placement-program admin surfaces.
  { href: "/admin/enrollments", label: "Placement Enrollments", icon: Briefcase },
  { href: "/admin/placement-leads", label: "Placement Leads", icon: PhoneCall },
];

export default function AdminSidebar({ open, onClose }) {
  const { logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    toast.success("Logged out");
    router.replace("/login");
  };

  const isActive = (href) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 dark:border-slate-800 dark:bg-slate-900 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">
              <GraduationCap className="h-5 w-5" />
            </span>
            <span className="font-bold tracking-tight">{PANEL_NAMES.admin}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="text-slate-400 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                isActive(item.href)
                  ? "bg-brand-600 text-white"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
