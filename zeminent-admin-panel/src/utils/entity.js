// Backends differ on id field names — normalize here so the UI never cares.
export const getId = (entity) =>
  entity?.id || entity?._id || entity?.courseId || entity?.lectureId || "";

export const getThumb = (course) =>
  course?.thumbnail || course?.thumbnailUrl || course?.image || "";

// Playback URL comes from the backend's attachStreamingUrls helper as
// `streamingUrl` (signed CloudFront URL, or null when access is locked).
// The old videoUrl/video-string shape is gone.
export const getVideoUrl = (lecture) => lecture?.streamingUrl || "";

// A lecture counts as a free preview if explicitly flagged that way.
// `isPreviewFree` is the canonical backend field; the older aliases are kept
// for older callers / mock data.
export const isPreviewLecture = (lecture) =>
  Boolean(
    lecture?.isPreviewFree ??
      lecture?.isPreview ??
      lecture?.isFree ??
      lecture?.preview,
  );
