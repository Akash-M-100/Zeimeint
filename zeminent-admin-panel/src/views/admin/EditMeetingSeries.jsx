"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";

import PageHeader from "@/components/admin/PageHeader";
import Button from "@/components/common/Button";
import { Spinner } from "@/components/common/Spinner";

import MeetingSeriesForm from "@/components/admin/MeetingSeriesForm";
import { meetingSeriesService } from "@/api/meetingSeriesService";

// Slice 16.5c: edit view. Loads the series via the detail endpoint
// (which populates course + enrolledStudents), passes it as
// initialValues to the shared form. Strips locked fields before sending
// the PATCH — backend rejects scheduleMode/scheduleConfig outright and
// rejects meetingType change with 400, so we don't even send them.
export default function EditMeetingSeries() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();

  const [series, setSeries] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError("");
    meetingSeriesService
      .get(id)
      .then((data) => {
        if (data?.series?.status === "cancelled") {
          setError("Cancelled series cannot be edited.");
        } else {
          setSeries(data?.series || null);
        }
      })
      .catch((err) => setError(err.message || "Failed to load meeting series"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (payload) => {
    // Backend rejects scheduleMode / scheduleConfig outright on PATCH;
    // meetingType change is also rejected. Strip all three before send
    // so an unchanged value doesn't trigger a 400.
    const { meetingType, scheduleMode, scheduleConfig, ...editablePayload } = payload;
    try {
      await meetingSeriesService.update(id, editablePayload);
      toast.success("Meeting updated. Future occurrences will reflect the changes.");
      router.push(`/admin/meetings/${id}`);
    } catch (err) {
      toast.error(err.message || "Failed to update meeting");
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
        <Button to={`/admin/meetings/${id}`} variant="ghost" icon={ArrowLeft} size="sm">
          Back to meeting
        </Button>
      </div>
    );
  }

  if (!series) return null;

  return (
    <div>
      <PageHeader
        title={`Edit: ${series.title}`}
        subtitle="Changes propagate to future, non-cancelled occurrences only."
        actions={
          <Button
            to={`/admin/meetings/${id}`}
            variant="ghost"
            icon={ArrowLeft}
            size="sm"
          >
            Back
          </Button>
        }
      />
      <MeetingSeriesForm
        mode="edit"
        initialValues={series}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/admin/meetings/${id}`)}
        submitLabel="Save changes"
      />
    </div>
  );
}
