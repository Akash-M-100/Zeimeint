import api from "./axios";
// Plain axios (NOT the shared instance): the shared `api` has a request
// interceptor that attaches `Authorization: Bearer <jwt>`. A presigned S3 PUT
// carries its own AWS auth in the URL, and an extra Authorization header makes
// S3 reject it with a cryptic signature error — so the S3 call must bypass the
// interceptor by using the default axios export directly.
import axios from "axios";
import { ENDPOINTS } from "@/config/constants";

const unwrap = (envelope) => envelope?.data ?? envelope;

export const s3Service = {
  // Step 1: ask the backend for a presigned upload URL + the S3 object key.
  getPresignedUrl: async ({ filename, contentType }) => {
    const { data } = await api.post(ENDPOINTS.lectures.presignUpload, {
      filename,
      contentType,
    });
    const body = unwrap(data);
    return { key: body?.key, uploadUrl: body?.uploadUrl };
  },

  // Step 2: PUT the file straight to S3. No Authorization header here.
  uploadToS3: async ({ uploadUrl, file, onProgress }) => {
    await axios.put(uploadUrl, file, {
      headers: { "Content-Type": file.type },
      onUploadProgress: (e) => {
        if (e.total && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      },
    });
  },
};
