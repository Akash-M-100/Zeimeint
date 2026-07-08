"use client";

import { cn } from "@/utils/cn";

const TONES = {
  brand: "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300",
  green:
    "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
  violet:
    "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
};

export default function StatCard({ icon: Icon, label, value, tone = "brand" }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {value}
          </p>
        </div>
        {Icon && (
          <div
            className={cn(
              "grid h-11 w-11 shrink-0 place-items-center rounded-xl",
              TONES[tone] || TONES.brand
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}
