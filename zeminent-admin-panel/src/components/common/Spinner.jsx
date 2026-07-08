"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";

const SIZES = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-9 w-9",
};

export function Spinner({ size = "md", className }) {
  return (
    <Loader2
      className={cn("animate-spin text-brand-600", SIZES[size], className)}
    />
  );
}

// Centered loader for whole-page / whole-section loading states.
export function PageLoader({ label = "Loading…", className }) {
  return (
    <div
      className={cn(
        "flex min-h-[50vh] flex-col items-center justify-center gap-3",
        className
      )}
    >
      <Spinner size="lg" />
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}

export default Spinner;
