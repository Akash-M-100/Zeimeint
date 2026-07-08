"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { courseService } from "@/api/courseService";
import PageHeader from "@/components/admin/PageHeader";
import CourseForm from "@/components/admin/CourseForm";
import { getId } from "@/utils/entity";

// `basePath` lets this view back both the admin (/admin) and instructor
// (/instructor) panels — only the post-create redirect targets differ.
export default function UploadCourse({ basePath = "/admin" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (formData) => {
    setLoading(true);
    try {
      const created = await courseService.createCourse(formData);
      const course = created?.course || created?.data?.course || created;
      const id = getId(course);

      toast.success("Course created — now build sections and add lectures");
      router.push(id ? `${basePath}/courses/${id}/lectures` : `${basePath}/courses`);
    } catch (err) {
      toast.error(err.message || "Could not create course");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Upload course"
        subtitle="Fill in the details and attach a thumbnail. You'll add sections and lecture videos on the next screen."
      />
      <div className="card max-w-3xl space-y-6 p-6">
        <CourseForm
          initialValues={{ isPublished: true }}
          onSubmit={handleSubmit}
          loading={loading}
          submitLabel="Create course"
          onCancel={() => router.push(`${basePath}/courses`)}
        />
      </div>
    </div>
  );
}
