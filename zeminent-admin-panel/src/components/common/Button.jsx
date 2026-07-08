"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";

const VARIANTS = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-500",
  secondary:
    "bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-slate-500 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200",
  outline:
    "border border-slate-300 text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-400 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800",
  ghost:
    "text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-400 dark:text-slate-300 dark:hover:bg-slate-800",
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500",
};

const SIZES = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

// Polymorphic button — renders a Next.js <Link> when `to` is provided,
// otherwise a native <button>.
export default function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  loading = false,
  disabled = false,
  to,
  type = "button",
  icon: Icon,
  iconRight = false,
  fullWidth = false,
  ...props
}) {
  const classes = cn(
    "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950",
    "disabled:cursor-not-allowed disabled:opacity-60",
    VARIANTS[variant],
    SIZES[size],
    fullWidth && "w-full",
    className
  );

  const leftIcon = loading ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : Icon && !iconRight ? (
    <Icon className="h-4 w-4" />
  ) : null;

  const rightIcon =
    !loading && Icon && iconRight ? <Icon className="h-4 w-4" /> : null;

  const content = (
    <>
      {leftIcon}
      {children}
      {rightIcon}
    </>
  );

  if (to) {
    return (
      <Link href={to} className={classes} {...props}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      {...props}
    >
      {content}
    </button>
  );
}
