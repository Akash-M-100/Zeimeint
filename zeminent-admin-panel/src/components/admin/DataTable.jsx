"use client";

import { Spinner } from "@/components/common/Spinner";
import EmptyState from "@/components/common/EmptyState";

// Lightweight, responsive table.
// columns: [{ key, header, render?(row, index), className? }]
export default function DataTable({
  columns,
  data = [],
  loading = false,
  emptyTitle = "No records",
  emptyDescription,
  emptyIcon,
  rowKey = (_row, index) => index,
}) {
  if (loading) {
    return (
      <div className="card flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!data.length) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800 dark:bg-slate-800/50">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 font-medium">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.map((row, index) => (
              <tr
                key={rowKey(row, index)}
                className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
              >
                {columns.map((col) => (
                  <td key={col.key} className={cnCell(col.className)}>
                    {col.render ? col.render(row, index) : row[col.key] ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function cnCell(extra) {
  return ["px-4 py-3 align-middle", extra].filter(Boolean).join(" ");
}
