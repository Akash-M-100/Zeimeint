"use client";

import { useEffect, useMemo, useState } from "react";
import { CreditCard, IndianRupee, Receipt } from "lucide-react";

import { paymentService } from "@/api/paymentService";
import PageHeader from "@/components/admin/PageHeader";
import StatCard from "@/components/admin/StatCard";
import DataTable from "@/components/admin/DataTable";
import Badge from "@/components/common/Badge";
import { formatPrice, formatDate } from "@/utils/format";
import { getId } from "@/utils/entity";

const STATUS_TONE = {
  paid: "green",
  success: "green",
  completed: "green",
  pending: "amber",
  created: "amber",
  failed: "red",
  refunded: "slate",
};

const isSuccessful = (status) =>
  ["paid", "success", "completed"].includes(String(status).toLowerCase());

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    paymentService
      .getPayments()
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data) ? data : data?.payments || [];
        setPayments(list);
        setError("");
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  // Backend stores the lifecycle on `paymentStatus`; older mocks used `status`.
  const statusOf = (p) => p?.paymentStatus || p?.status;

  const { revenue, successfulCount } = useMemo(() => {
    let total = 0;
    let count = 0;
    payments.forEach((p) => {
      if (isSuccessful(statusOf(p))) {
        total += Number(p.amount) || 0;
        count += 1;
      }
    });
    return { revenue: total, successfulCount: count };
  }, [payments]);

  const columns = [
    {
      key: "id",
      header: "Payment",
      render: (row) => (
        <span className="font-mono text-xs text-slate-500">
          {(getId(row) || row.orderId || "—").toString().slice(0, 14)}
        </span>
      ),
    },
    {
      key: "student",
      header: "Student",
      render: (row) => (
        <div>
          <p className="font-medium text-slate-800 dark:text-slate-100">
            {row.userId?.name || row.user?.name || row.studentName || "—"}
          </p>
          <p className="text-xs text-slate-400">
            {row.userId?.email || row.user?.email || row.studentEmail || ""}
          </p>
        </div>
      ),
    },
    {
      key: "course",
      header: "Course",
      render: (row) =>
        row.courseId?.title || row.course?.title || row.courseTitle || "—",
    },
    {
      key: "amount",
      header: "Amount",
      render: (row) => formatPrice(row.amount, row.currency || "INR"),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => {
        const s = statusOf(row);
        return (
          <Badge tone={STATUS_TONE[String(s).toLowerCase()] || "slate"}>
            {s || "unknown"}
          </Badge>
        );
      },
    },
    {
      key: "createdAt",
      header: "Date",
      render: (row) => formatDate(row.createdAt || row.paidAt),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Payments"
        subtitle="Track course purchases and revenue."
      />

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              icon={IndianRupee}
              label="Total revenue"
              value={formatPrice(revenue)}
              tone="green"
            />
            <StatCard
              icon={Receipt}
              label="Successful payments"
              value={successfulCount}
              tone="brand"
            />
            <StatCard
              icon={CreditCard}
              label="All transactions"
              value={payments.length}
              tone="violet"
            />
          </div>

          <DataTable
            columns={columns}
            data={payments}
            loading={loading}
            emptyIcon={CreditCard}
            emptyTitle="No payments yet"
            emptyDescription="Course purchases will show up here."
            rowKey={(row) => getId(row) || row.orderId}
          />
        </>
      )}
    </div>
  );
}
