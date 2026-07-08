"use client";

import { cn } from "@/utils/cn";

const TONES = {
  brand: "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300",
  green:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  red: "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300",
  slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

export default function Badge({ children, tone = "slate", className }) {
  return (
    <span className={cn("badge", TONES[tone] || TONES.slate, className)}>
      {children}
    </span>
  );
}
