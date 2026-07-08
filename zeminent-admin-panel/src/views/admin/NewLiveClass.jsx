"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { liveClassService } from "@/api/liveClassService";
import PageHeader from "@/components/admin/PageHeader";
import LiveClassForm from "@/components/admin/LiveClassForm";

export default function NewLiveClass() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (payload) => {
    setLoading(true);
    try {
      await liveClassService.create(payload);
      toast.success("Live class scheduled");
      router.push("/admin/live-classes");
    } catch (err) {
      toast.error(err.message || "Could not create live class");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Schedule live class"
        subtitle="Pick a time, paste your meeting link, and students will see it in their schedule."
      />
      <div className="card max-w-3xl p-6">
        <LiveClassForm
          onSubmit={handleSubmit}
          loading={loading}
          submitLabel="Schedule session"
          onCancel={() => router.push("/admin/live-classes")}
        />
      </div>
    </div>
  );
}
