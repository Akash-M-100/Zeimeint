"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  BookOpen,
  Pencil,
  Trash2,
  ListVideo,
  Upload,
  Eye,
  EyeOff,
  PlayCircle,
} from "lucide-react";

import { courseService } from "@/api/courseService";
import PageHeader from "@/components/admin/PageHeader";
import DataTable from "@/components/admin/DataTable";
import Badge from "@/components/common/Badge";
import Button from "@/components/common/Button";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { pluralize } from "@/utils/format";
import { getId, getThumb } from "@/utils/entity";

export default function AdminCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    setLoading(true);
    courseService
      .getCourses()
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.courses || [];
        setCourses(list);
        setError("");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleTogglePublish = async (course) => {
    const id = getId(course);
    setBusyId(id);
    try {
      await courseService.togglePublish(id, !course.isPublished);
      setCourses((prev) =>
        prev.map((c) =>
          getId(c) === id ? { ...c, isPublished: !c.isPublished } : c
        )
      );
      toast.success(
        course.isPublished ? "Course unpublished" : "Course published"
      );
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await courseService.deleteCourse(getId(deleteTarget));
      setCourses((prev) =>
        prev.filter((c) => getId(c) !== getId(deleteTarget))
      );
      toast.success("Course deleted");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: "title",
      header: "Course",
      render: (row) => {
        const thumb = getThumb(row);
        return (
          <div className="flex items-center gap-3">
            {thumb ? (
              <img
                src={thumb}
                alt=""
                className="h-10 w-16 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div className="grid h-10 w-16 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-800">
                <PlayCircle className="h-4 w-4" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-800 dark:text-slate-100">
                {row.title}
              </p>
              <p className="text-xs text-slate-400">
                {pluralize(row.sections?.length ?? 0, "section")} ·{" "}
                {pluralize(
                  row.lectures?.length ?? row.lectureCount ?? 0,
                  "lecture"
                )}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      key: "category",
      header: "Category",
      render: (row) => row.category || "—",
    },
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
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (row) => {
        const id = getId(row);
        return (
          <div className="flex items-center justify-end gap-1">
            <Link
              href={`/admin/courses/${id}/lectures`}
              title="Manage lectures"
              className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"
            >
              <ListVideo className="h-4 w-4" />
            </Link>
            <Link
              href={`/admin/courses/${id}/edit`}
              title="Edit course"
              className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"
            >
              <Pencil className="h-4 w-4" />
            </Link>
            <button
              type="button"
              title={row.isPublished ? "Unpublish" : "Publish"}
              disabled={busyId === id}
              onClick={() => handleTogglePublish(row)}
              className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-amber-600 disabled:opacity-50 dark:hover:bg-slate-800"
            >
              {row.isPublished ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              title="Delete course"
              onClick={() => setDeleteTarget(row)}
              className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Courses"
        subtitle="Create, edit and manage every course."
        actions={
          <Button to="/admin/upload-course" icon={Upload}>
            Upload course
          </Button>
        }
      />

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={courses}
          loading={loading}
          emptyIcon={BookOpen}
          emptyTitle="No courses yet"
          emptyDescription="Upload your first course to get started."
          rowKey={(row) => getId(row)}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete course"
        description={`"${deleteTarget?.title}" and all of its lectures will be permanently removed.`}
        confirmLabel="Delete course"
      />
    </div>
  );
}
