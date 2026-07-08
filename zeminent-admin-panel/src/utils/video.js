// Client-side helpers for reading metadata off a picked video File.

/**
 * Reads a video file's duration (seconds, rounded) using the HTML5 video API.
 * Resolves with the duration; rejects if the browser can't read the metadata.
 */
export function getVideoDuration(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Math.round(video.duration));
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read video metadata"));
    };

    video.src = url;
  });
}

/** File extension, lowercased, no leading dot (e.g. "mp4"). */
export function getVideoFormat(file) {
  const name = file?.name || "";
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}
