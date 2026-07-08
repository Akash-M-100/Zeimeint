"use client";

import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { APP_NAME } from "@/config/constants";

// Centered card shell shared by the student login, register and admin login.
export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
  badge,
  brand = APP_NAME,
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-950">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white">
            <GraduationCap className="h-6 w-6" />
          </span>
          <span className="text-xl font-bold tracking-tight">{brand}</span>
        </Link>

        <div className="card p-6 sm:p-8">
          {badge && <div className="mb-4">{badge}</div>}
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            {title}
          </h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>

        {footer && (
          <div className="mt-6 text-center text-sm text-slate-500">{footer}</div>
        )}
      </div>
    </div>
  );
}
