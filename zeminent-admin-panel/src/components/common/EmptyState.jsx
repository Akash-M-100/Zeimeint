"use client";

import { cn } from "@/utils/cn";

// Friendly placeholder shown when a list / page has no data.
export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 px-6 py-14 text-center dark:border-slate-700",
        className
      )}
    >
      {Icon && (
        <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 dark:bg-slate-800">
          <Icon className="h-7 w-7 text-slate-400" />
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
        {title}
      </h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
