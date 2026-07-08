"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { AlertCircle, ListVideo } from "lucide-react";

import { courseService } from "@/api/courseService";
import PageHeader from "@/components/admin/PageHeader";
import CourseForm from "@/components/admin/CourseForm";
import Button from "@/components/common/Button";
import EmptyState from "@/components/common/EmptyState";
import { PageLoader } from "@/components/common/Spinner";

// `basePath` lets this view back both the admin (/admin) and instructor
// (/instructor) panels — only the navigation targets differ.
export default function EditCourse({ basePath = "/admin" }) {
  const { id } = useParams();
  const router = useRouter();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    courseService
      .getCourse(id)
      .then((data) => {
        if (!active) return;
        // After the services were updated to unwrap the envelope, this is
        // always the inner payload — but be defensive in case anyone passes
        // the raw axios response.
        const c = data?.course || data?.data?.course || data;
        setCourse(c);
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  const handleSubmit = async (formData) => {
    setSaving(true);
    try {
      await courseService.updateCourse(id, formData);
      toast.success("Course updated");
      router.push(`${basePath}/courses`);
    } catch (err) {
      toast.error(err.message || "Could not update course");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader label="Loading course…" />;

  if (error || !course) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Course not found"
        description={error || "We couldn't load this course."}
        action={
          <Button to={`${basePath}/courses`} variant="outline">
            Back to courses
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Edit course"
        subtitle={course.title}
        actions={
          <Button
            variant="outline"
            icon={ListVideo}
            to={`${basePath}/courses/${id}/lectures`}
          >
            Manage lectures
          </Button>
        }
      />
      <div className="card max-w-3xl p-6">
        <CourseForm
          initialValues={course}
          onSubmit={handleSubmit}
          loading={saving}
          submitLabel="Save changes"
          onCancel={() => router.push(`${basePath}/courses`)}
        />
      </div>
    </div>
  );
}
