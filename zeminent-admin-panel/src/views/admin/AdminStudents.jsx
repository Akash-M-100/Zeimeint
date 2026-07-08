"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";

import { studentService } from "@/api/studentService";
import PageHeader from "@/components/admin/PageHeader";
import DataTable from "@/components/admin/DataTable";
import { formatDate, getInitials, pluralize } from "@/utils/format";
import { getId } from "@/utils/entity";

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    studentService
      .getStudents()
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data) ? data : data?.students || [];
        setStudents(list);
        setError("");
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const columns = [
    {
      key: "name",
      header: "Student",
      render: (row) => (
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
            {getInitials(row.name)}
          </span>
          <span className="font-medium text-slate-800 dark:text-slate-100">
            {row.name || "Unknown"}
          </span>
        </div>
      ),
    },
    {
      key: "email",
      header: "Email",
      render: (row) => (
        <span className="text-slate-500">{row.email || "—"}</span>
      ),
    },
    {
      key: "courses",
      header: "Enrolled",
      render: (row) => {
        const count =
          row.enrolledCount ??
          row.purchasedCourses?.length ??
          row.courses?.length ??
          0;
        return pluralize(count, "course");
      },
    },
    {
      key: "createdAt",
      header: "Joined",
      render: (row) => formatDate(row.createdAt || row.joinedAt),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Students"
        subtitle="Everyone enrolled on the platform."
      />

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={students}
          loading={loading}
          emptyIcon={Users}
          emptyTitle="No students yet"
          emptyDescription="Students will appear here once they sign up."
          rowKey={(row) => getId(row)}
        />
      )}
    </div>
  );
}
