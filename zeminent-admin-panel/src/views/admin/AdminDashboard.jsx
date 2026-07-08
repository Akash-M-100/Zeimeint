"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  Users,
  IndianRupee,
  Upload,
  FileText,
  Video,
  GraduationCap,
} from "lucide-react";

import { courseService } from "@/api/courseService";
import { studentService } from "@/api/studentService";
import PageHeader from "@/components/admin/PageHeader";
import StatCard from "@/components/admin/StatCard";
import DataTable from "@/components/admin/DataTable";
import Badge from "@/components/common/Badge";
import Button from "@/components/common/Button";
import { formatPrice, formatDate } from "@/utils/format";
import { getId } from "@/utils/entity";

export default function AdminDashboard() {
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      courseService.getCourses(),
      studentService.getAdminStats(),
    ])
      .then(([coursesRes, statsRes]) => {
        if (!active) return;
        if (coursesRes.status === "fulfilled") {
          const data = coursesRes.value;
          const list = Array.isArray(data) ? data : data?.courses || [];
          setCourses(list);
        }
        if (statsRes.status === "fulfilled") {
          setStats(statsRes.value || null);
        }
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const publishedCount = courses.filter((c) => c.isPublished).length;
  const draftCount = courses.filter((c) => !c.isPublished).length;

  const cards = [
    {
      icon: BookOpen,
      label: "Total courses",
      value: stats?.totalCourses ?? courses.length,
      tone: "brand",
    },
    {
      icon: CheckCircle2,
      label: "Published",
      value: stats?.publishedCourses ?? publishedCount,
      tone: "green",
    },
    {
      icon: FileText,
      label: "Drafts",
      value: stats?.draftCourses ?? draftCount,
      tone: "amber",
    },
    {
      icon: Video,
      label: "Lectures",
      value: stats?.totalLectures ?? "—",
      tone: "violet",
    },
    {
      icon: Users,
      label: "Registered students",
      value: stats?.totalStudents ?? 0,
      tone: "brand",
    },
    {
      icon: GraduationCap,
      label: "Enrolled students",
      value: stats?.enrolledStudents ?? 0,
      tone: "violet",
    },
    {
      icon: IndianRupee,
      label: "Revenue",
      value:
        stats?.totalRevenue != null ? formatPrice(stats.totalRevenue) : "—",
      tone: "green",
    },
    {
      icon: CheckCircle2,
      label: "Paid orders",
      value: stats?.paidPaymentsCount ?? 0,
      tone: "amber",
    },
  ];

  const recentColumns = [
    {
      key: "title",
      header: "Course",
      render: (row) => (
        <Link
          href={`/admin/courses/${getId(row)}/lectures`}
          className="font-medium text-slate-800 hover:text-brand-600 dark:text-slate-100"
        >
          {row.title}
        </Link>
      ),
    },
    { key: "category", header: "Category" },
    {
      key: "isPublished",
      header: "Status",
      render: (row) =>
        row.isPublished ? (
          <Badge tone="green">Published</Badge>
        ) : (
          <Badge tone="amber">Draft</Badge>
        ),
    },
    {
      key: "createdAt",
      header: "Created",
      render: (row) => formatDate(row.createdAt),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your learning platform."
        actions={
          <Button to="/admin/upload-course" icon={Upload}>
            Upload course
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <StatCard key={c.label} {...c} />
        ))}
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent courses</h2>
          <Link
            href="/admin/courses"
            className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            View all →
          </Link>
        </div>
        <DataTable
          columns={recentColumns}
          data={courses.slice(0, 5)}
          loading={loading}
          emptyIcon={BookOpen}
          emptyTitle="No courses yet"
          emptyDescription="Upload your first course to get started."
          rowKey={(row) => getId(row)}
        />
      </div>
    </div>
  );
}
