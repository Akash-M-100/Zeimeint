"use client";

import Button from "@/components/common/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-7xl font-bold text-brand-600 dark:text-brand-400">
        404
      </p>
      <h1 className="mt-4 text-2xl font-bold">Page not found</h1>
      <p className="mt-2 max-w-sm text-slate-500">
        The page you’re looking for doesn’t exist or has been moved.
      </p>
      <div className="mt-6 flex gap-3">
        <Button to="/">Back to home</Button>
        <Button to="/courses" variant="outline">
          Browse courses
        </Button>
      </div>
    </div>
  );
}
