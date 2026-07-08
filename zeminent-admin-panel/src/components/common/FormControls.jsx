"use client";

import { cn } from "@/utils/cn";

// Label + error/hint wrapper used by every form in the app.
export function Field({
  label,
  htmlFor,
  error,
  hint,
  required = false,
  children,
  className,
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="block text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs font-medium text-red-500">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ className, error, ...props }) {
  return (
    <input
      className={cn(
        "input-base",
        error && "border-red-400 focus:border-red-500 focus:ring-red-500/20",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, error, rows = 4, ...props }) {
  return (
    <textarea
      rows={rows}
      className={cn(
        "input-base resize-y",
        error && "border-red-400 focus:border-red-500 focus:ring-red-500/20",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, error, children, ...props }) {
  return (
    <select
      className={cn(
        "input-base appearance-none pr-9",
        error && "border-red-400",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

// Accessible on/off switch (used for "publish" and "free preview" toggles).
export function Toggle({
  checked = false,
  onChange,
  label,
  description,
  disabled = false,
}) {
  return (
    <label
      className={cn(
        "flex items-start gap-3",
        disabled ? "opacity-60" : "cursor-pointer"
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={cn(
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-brand-600" : "bg-slate-300 dark:bg-slate-700"
        )}
      >
        <span
          className={cn(
            "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
            checked && "translate-x-5"
          )}
        />
      </button>
      {(label || description) && (
        <span className="select-none">
          {label && (
            <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              {label}
            </span>
          )}
          {description && (
            <span className="block text-xs text-slate-400">{description}</span>
          )}
        </span>
      )}
    </label>
  );
}

// Styled file picker — keeps the native input hidden behind a dashed box.
export function FileInput({
  id,
  accept,
  onChange,
  fileName,
  placeholder = "Choose a file",
  icon: Icon,
  className,
  disabled = false,
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex items-center gap-3 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm transition",
        disabled
          ? "cursor-not-allowed opacity-60"
          : "cursor-pointer hover:border-brand-400 hover:bg-brand-50/60 dark:hover:bg-slate-800/60",
        "dark:border-slate-700",
        className
      )}
    >
      {Icon && <Icon className="h-5 w-5 shrink-0 text-slate-400" />}
      <span
        className={cn(
          "truncate",
          fileName ? "text-slate-700 dark:text-slate-200" : "text-slate-400"
        )}
      >
        {fileName || placeholder}
      </span>
      <input
        id={id}
        type="file"
        accept={accept}
        onChange={onChange}
        disabled={disabled}
        className="sr-only"
      />
    </label>
  );
}
