"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { AlertCircle } from "lucide-react";

import { liveClassService } from "@/api/liveClassService";
import PageHeader from "@/components/admin/PageHeader";
import LiveClassForm from "@/components/admin/LiveClassForm";
import Button from "@/components/common/Button";
import EmptyState from "@/components/common/EmptyState";
import { PageLoader } from "@/components/common/Spinner";

export default function EditLiveClass() {
  const { id } = useParams();
  const router = useRouter();

  const [liveClass, setLiveClass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    liveClassService
      .get(id)
      .then((data) => {
        if (!active) return;
        const lc = data?.liveClass || data?.data?.liveClass || data;
        setLiveClass(lc);
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  const handleSubmit = async (payload) => {
    setSaving(true);
    try {
      await liveClassService.update(id, payload);
      toast.success("Live class updated");
      router.push("/admin/live-classes");
    } catch (err) {
      toast.error(err.message || "Could not update live class");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader label="Loading live class…" />;

  if (error || !liveClass) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Live class not found"
        description={error || "We couldn't load this session."}
        action={
          <Button to="/admin/live-classes" variant="outline">
            Back to live classes
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader title="Edit live class" subtitle={liveClass.title} />
      <div className="card max-w-3xl p-6">
        <LiveClassForm
          initialValues={liveClass}
          onSubmit={handleSubmit}
          loading={saving}
          submitLabel="Save changes"
          onCancel={() => router.push("/admin/live-classes")}
          showCancelToggle
        />
      </div>
    </div>
  );
}
