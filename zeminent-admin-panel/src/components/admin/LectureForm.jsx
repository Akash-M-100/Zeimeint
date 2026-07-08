"use client";

import { useState } from "react";
import { Video, Youtube } from "lucide-react";
import toast from "react-hot-toast";

import {
  Field,
  Input,
  Textarea,
  Toggle,
  FileInput,
} from "@/components/common/FormControls";
import Button from "@/components/common/Button";
import { getId } from "@/utils/entity";
import { formatDuration } from "@/utils/format";
import { getVideoDuration, getVideoFormat } from "@/utils/video";
import { s3Service } from "@/api/s3Service";
import { lectureService } from "@/api/lectureService";

// Accepted video container formats (checked before any upload work).
const ALLOWED_FORMATS = ["mp4", "mov", "webm", "mkv"];

// Matches the YouTube link shapes the backend accepts (watch?v=, youtu.be/,
// /embed/, /shorts/). Kept in sync with the server-side validator.
const YOUTUBE_URL_REGEX =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/)|youtu\.be\/)[\w-]{11}([&?].*)?$/i;

// Self-contained lecture create/edit form. Owns the 3-step upload flow:
//   1. ask backend for a presigned S3 URL
//   2. PUT the file straight to S3 (with progress)
//   3. POST/PATCH the lecture metadata (referencing the S3 key)
// On success it calls `onSuccess()` (parent closes the modal + refreshes).
// `onBusyChange(bool)` lets the parent lock the modal while work is in flight.
export default function LectureForm({
  courseId,
  initialValues = {},
  onSuccess,
  onCancel,
  onBusyChange,
  nextOrder = 1,
  sectionId = null,
}) {
  const isEdit = Boolean(getId(initialValues));
  const lectureId = getId(initialValues);

  const [form, setForm] = useState({
    title: initialValues.title || "",
    description: initialValues.description || "",
    order: initialValues.order ?? nextOrder,
    uploadDate: (initialValues.uploadDate || new Date().toISOString()).slice(0, 10),
    isPreviewFree:
      initialValues.isPreviewFree ??
      initialValues.isPreview ??
      initialValues.isFree ??
      false,
  });
  // Video source: an uploaded file ("upload") or a pasted YouTube link
  // ("youtube"). On edit we default to whatever the lecture already uses.
  const [source, setSource] = useState(
    initialValues.youtubeUrl || initialValues.videoType === "youtube"
      ? "youtube"
      : "upload",
  );
  const [youtubeUrl, setYoutubeUrl] = useState(initialValues.youtubeUrl || "");
  const [videoFile, setVideoFile] = useState(null);
  const [videoDuration, setVideoDuration] = useState(null);
  const [errors, setErrors] = useState({});

  // 'idle' | 'uploading' (S3 PUT) | 'saving' (metadata POST/PATCH)
  const [phase, setPhase] = useState("idle");
  const [progress, setProgress] = useState(0);
  const busy = phase !== "idle";

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleVideo = (e) => {
    if (busy) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const fmt = getVideoFormat(file);
    if (!ALLOWED_FORMATS.includes(fmt)) {
      setErrors((prev) => ({
        ...prev,
        video: `Unsupported format ".${fmt}". Use ${ALLOWED_FORMATS.join(", ")}.`,
      }));
      setVideoFile(null);
      setVideoDuration(null);
      return;
    }

    setErrors((prev) => ({ ...prev, video: undefined }));
    setVideoFile(file);
    setVideoDuration(null);
    // Read duration eagerly so the user sees it and submit needn't re-read.
    getVideoDuration(file)
      .then((d) => setVideoDuration(d))
      .catch(() => setVideoDuration(null));
  };

  const currentlyYouTube =
    Boolean(initialValues.youtubeUrl) || initialValues.videoType === "youtube";

  const validate = () => {
    const next = {};
    if (!form.title.trim()) next.title = "Lecture title is required";
    if (source === "youtube") {
      const url = youtubeUrl.trim();
      if (!url) next.youtube = "Please paste a YouTube link";
      else if (!YOUTUBE_URL_REGEX.test(url))
        next.youtube = "That doesn't look like a valid YouTube link";
    } else if ((!isEdit || currentlyYouTube) && !videoFile) {
      // New lecture, or switching an existing YouTube lecture to a file upload.
      next.video = "Please choose a video file";
    }
    if (form.order === "" || Number(form.order) < 1)
      next.order = "Order must be 1 or higher";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!validate()) return;

    try {
      onBusyChange?.(true);

      let video;
      // S3 upload only runs for the file source. YouTube lectures skip steps
      // 1 + 2 entirely — we just hand the link to the backend.
      if (source === "upload" && videoFile) {
        // Steps 1 + 2: presign, then PUT directly to S3.
        setPhase("uploading");
        setProgress(0);
        const { key, uploadUrl } = await s3Service.getPresignedUrl({
          filename: videoFile.name,
          contentType: videoFile.type,
        });
        await s3Service.uploadToS3({ uploadUrl, file: videoFile, onProgress: setProgress });

        let duration = videoDuration;
        if (duration == null) {
          try {
            duration = await getVideoDuration(videoFile);
          } catch {
            duration = undefined;
          }
        }
        video = {
          key,
          duration,
          size: videoFile.size,
          format: getVideoFormat(videoFile),
        };
      }

      // Step 3: persist metadata.
      setPhase("saving");
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        order: Number(form.order) || 1,
        isPreviewFree: form.isPreviewFree,
      };
      if (sectionId) payload.sectionId = sectionId;
      if (source === "youtube") {
        // The backend fetches the real video length from the YouTube watch page
        // (authoritative), so we only need to hand it the link.
        payload.youtubeUrl = youtubeUrl.trim();
      } else if (video) {
        payload.video = video; // omitted on edits with no new video
      }

      if (isEdit) {
        await lectureService.updateLecture(lectureId, payload);
        toast.success("Lecture updated");
      } else {
        await lectureService.createLecture(courseId, payload);
        toast.success("Lecture uploaded");
      }

      onSuccess?.();
    } catch (err) {
      toast.error(err?.message || "Could not save lecture");
    } finally {
      setPhase("idle");
      setProgress(0);
      onBusyChange?.(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Source picker: upload a file to storage, or paste a YouTube link. */}
      <Field label="Video source">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => !busy && setSource("upload")}
            disabled={busy}
            className={[
              "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition",
              source === "upload"
                ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-500/15 dark:text-brand-300"
                : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800",
            ].join(" ")}
          >
            <Video className="h-4 w-4" />
            Upload file
          </button>
          <button
            type="button"
            onClick={() => !busy && setSource("youtube")}
            disabled={busy}
            className={[
              "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition",
              source === "youtube"
                ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-500/15 dark:text-brand-300"
                : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800",
            ].join(" ")}
          >
            <Youtube className="h-4 w-4" />
            YouTube link
          </button>
        </div>
      </Field>

      {source === "upload" ? (
        <Field
          label="Video file"
          error={errors.video}
          hint={
            isEdit && !currentlyYouTube
              ? "Leave empty to keep the current video"
              : "MP4, MOV, WEBM or MKV"
          }
          required={!isEdit || currentlyYouTube}
        >
          <FileInput
            id="lecture-video"
            accept="video/*"
            onChange={handleVideo}
            fileName={videoFile?.name}
            placeholder="Upload lecture video"
            icon={Video}
            disabled={busy}
          />
          {videoFile && videoDuration != null && (
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              Duration: {formatDuration(videoDuration)}
            </p>
          )}
        </Field>
      ) : (
        <Field
          label="YouTube link"
          htmlFor="lec-youtube"
          error={errors.youtube}
          hint="Paste the link of the video from your YouTube channel (watch, youtu.be or shorts)."
          required
        >
          <Input
            id="lec-youtube"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
            error={errors.youtube}
            disabled={busy}
          />
        </Field>
      )}

      <Field label="Title" htmlFor="lec-title" error={errors.title} required>
        <Input
          id="lec-title"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="e.g. Setting up the project"
          error={errors.title}
          disabled={busy}
        />
      </Field>

      <Field label="Description" htmlFor="lec-desc">
        <Textarea
          id="lec-desc"
          rows={3}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Short summary of this lecture"
          disabled={busy}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Lecture order" htmlFor="lec-order" error={errors.order} required>
          <Input
            id="lec-order"
            type="number"
            min="1"
            value={form.order}
            onChange={(e) => set("order", e.target.value)}
            error={errors.order}
            disabled={busy}
          />
        </Field>

        <Field label="Upload date" htmlFor="lec-date">
          <Input
            id="lec-date"
            type="date"
            value={form.uploadDate}
            onChange={(e) => set("uploadDate", e.target.value)}
            disabled={busy}
          />
        </Field>
      </div>

      <Field label="Access">
        <Toggle
          checked={form.isPreviewFree}
          onChange={(v) => set("isPreviewFree", v)}
          label="Free preview lecture"
          description="Students can watch this without buying the course."
          disabled={busy}
        />
      </Field>

      {phase === "uploading" && (
        <div>
          <div className="mb-1 flex justify-between text-xs text-slate-400">
            <span>Uploading to storage…</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-brand-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {phase === "saving" && (
        <p className="text-xs text-slate-400">Saving lecture…</p>
      )}

      <div className="flex gap-3 pt-1">
        <Button type="submit" loading={busy} disabled={busy}>
          {isEdit ? "Save changes" : "Add lecture"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
