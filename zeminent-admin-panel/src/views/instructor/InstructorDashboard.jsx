"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, CheckCircle2, FileText, Video, Upload } from "lucide-react";

import { courseService } from "@/api/courseService";
import { useAuth } from "@/context/AuthContext";
import PageHeader from "@/components/admin/PageHeader";
import StatCard from "@/components/admin/StatCard";
import DataTable from "@/components/admin/DataTable";
import Badge from "@/components/common/Badge";
import Button from "@/components/common/Button";
import { getId } from "@/utils/entity";

export default function InstructorDashboard() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    courseService
      .getCourses()
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data) ? data : data?.courses || [];
        setCourses(list);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const publishedCount = courses.filter((c) => c.isPublished).length;
  const draftCount = courses.length - publishedCount;
  const lectureCount = courses.reduce(
    (sum, c) => sum + (c.lectures?.length ?? c.lectureCount ?? 0),
    0
  );

  const cards = [
    { icon: BookOpen, label: "Courses", value: courses.length, tone: "brand" },
    { icon: CheckCircle2, label: "Published", value: publishedCount, tone: "green" },
    { icon: FileText, label: "Drafts", value: draftCount, tone: "amber" },
    { icon: Video, label: "Lectures", value: lectureCount, tone: "violet" },
  ];

  const columns = [
    {
      key: "title",
      header: "Course",
      render: (row) => (
        <Link
          href={`/instructor/courses/${getId(row)}/lectures`}
          className="font-medium text-slate-800 hover:text-brand-600 dark:text-slate-100"
        >
          {row.title}
        </Link>
      ),
    },
    { key: "category", header: "Category", render: (row) => row.category || "—" },
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
  ];

  return (
    <div>
      <PageHeader
        title={`Welcome${user?.name ? `, ${user.name}` : ""}`}
        subtitle="Create a course or manage lectures and sections."
        actions={
          <Button to="/instructor/upload-course" icon={Upload}>
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
          <h2 className="text-lg font-semibold">Your courses</h2>
          <Link
            href="/instructor/courses"
            className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            View all →
          </Link>
        </div>
        <DataTable
          columns={columns}
          data={courses.slice(0, 5)}
          loading={loading}
          emptyIcon={BookOpen}
          emptyTitle="No courses yet"
          emptyDescription="Courses created by an admin will appear here for you to manage."
          rowKey={(row) => getId(row)}
        />
      </div>
    </div>
  );
}
