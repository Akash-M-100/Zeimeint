"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import toast from "react-hot-toast";

import PageHeader from "@/components/admin/PageHeader";
import Button from "@/components/common/Button";

import MeetingSeriesForm from "@/components/admin/MeetingSeriesForm";
import { meetingSeriesService } from "@/api/meetingSeriesService";

// Slice 16.5c: thin wrapper. All the form mechanics moved to
// MeetingSeriesForm so the edit page (EditMeetingSeries) can reuse it.
export default function CreateMeetingSeries() {
  const router = useRouter();

  const handleSubmit = async (payload) => {
    try {
      const result = await meetingSeriesService.create(payload);
      const newId = result?.series?._id;
      toast.success(
        `Scheduled — ${result?.series?.totalOccurrences ?? 0} session(s). Invitations are sending.`,
      );
      if (newId) router.push(`/admin/meetings/${newId}`);
      else router.push("/admin/meetings");
    } catch (err) {
      toast.error(err.message || "Failed to create meeting series");
      throw err;
    }
  };

  return (
    <div>
      <PageHeader
        title="Schedule Meeting"
        subtitle="Create a series of sessions and invite attendees in one go."
        actions={
          <Button to="/admin/meetings" variant="ghost" icon={ChevronLeft} size="sm">
            Back
          </Button>
        }
      />
      <MeetingSeriesForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={() => router.push("/admin/meetings")}
        submitLabel="Schedule meeting"
      />
    </div>
  );
}
