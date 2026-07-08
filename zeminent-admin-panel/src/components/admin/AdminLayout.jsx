"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";

import AdminSidebar from "./AdminSidebar";
import ThemeToggle from "@/components/common/ThemeToggle";
import { Spinner } from "@/components/common/Spinner";
import { useAuth } from "@/context/AuthContext";
import { getInitials } from "@/utils/format";

// Shell for the whole admin panel: auth guard + fixed sidebar + sticky
// topbar + content. Anyone who isn't an admin is sent to the login screen.
export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, isAdmin, hydrated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (hydrated && !isAdmin) {
      router.replace("/login");
    }
  }, [hydrated, isAdmin, router]);

  if (!hydrated || !isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 dark:bg-slate-950">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/85 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/85 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-sm font-medium text-slate-400">
              Admin Panel
            </span>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                {getInitials(user?.name || "Admin")}
              </span>
              <span className="hidden text-sm font-medium sm:block">
                {user?.name || "Administrator"}
              </span>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
