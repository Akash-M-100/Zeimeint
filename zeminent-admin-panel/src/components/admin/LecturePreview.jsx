"use client";

import { AlertCircle } from "lucide-react";

import Modal from "@/components/common/Modal";

// Pull the 11-char video id out of any YouTube link shape the backend accepts
// (watch?v=, youtu.be/, /embed/, /shorts/), or accept a bare id. Mirrors the
// student-side parser so admin preview matches what students will see.
function parseYouTubeId(url) {
  if (!url) return null;
  if (/^[\w-]{11}$/.test(url)) return url;
  const patterns = [
    /[?&]v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
  ];
  for (const re of patterns) {
    const m = String(url).match(re);
    if (m) return m[1];
  }
  return null;
}

// In-panel video preview so admins and instructors can watch the lecture they
// just uploaded (or pasted) without leaving the panel. Plays both sources:
//   - YouTube lectures embed the video via the standard iframe player
//   - S3 lectures use the signed `streamingUrl`/`videoUrl` the backend returns
//     to staff in an HTML5 <video> element
export default function LecturePreview({ open, lecture, onClose }) {
  const isYouTube =
    !!lecture && (lecture.videoType === "youtube" || !!lecture.youtubeUrl);
  const ytId = isYouTube ? parseYouTubeId(lecture.youtubeUrl) : null;
  // Staff bundles expose the playable URL under both names; prefer streamingUrl.
  const fileUrl = lecture?.streamingUrl || lecture?.videoUrl || "";

  const renderBody = () => {
    if (!lecture) return null;

    if (isYouTube) {
      if (!ytId) {
        return (
          <PreviewError text="This YouTube link can't be played. Re-add it from the edit form." />
        );
      }
      return (
        <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
          <iframe
            key={ytId}
            className="h-full w-full"
            src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`}
            title={lecture.title || "Lecture preview"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }

    if (!fileUrl) {
      return (
        <PreviewError text="No playable video URL is available for this lecture yet. Try refreshing the page." />
      );
    }
    return (
      <video
        key={fileUrl}
        className="aspect-video w-full rounded-xl bg-black"
        src={fileUrl}
        controls
        autoPlay
        controlsList="nodownload"
      >
        Your browser can&apos;t play this video.
      </video>
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={lecture?.title ? `Preview · ${lecture.title}` : "Lecture preview"}
      size="xl"
    >
      {renderBody()}
    </Modal>
  );
}

function PreviewError({ text }) {
  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl bg-slate-100 px-6 text-center text-sm text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
      <AlertCircle className="h-6 w-6" />
      <p className="max-w-sm">{text}</p>
    </div>
  );
}
