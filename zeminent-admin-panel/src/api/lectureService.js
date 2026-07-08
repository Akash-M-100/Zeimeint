import api from "./axios";
import { ENDPOINTS } from "@/config/constants";

const unwrap = (envelope) => envelope?.data ?? envelope;

// Lecture CRUD. Video bytes no longer flow through the backend — the browser
// uploads directly to S3 via a presigned URL (see s3Service), then these
// endpoints persist plain-JSON metadata referencing the resulting `video.key`.
// The presign → S3 PUT → create/update orchestration lives in LectureForm.
export const lectureService = {
  getLecturesByCourse: async (courseId) => {
    const { data } = await api.get(ENDPOINTS.lectures.listByCourse(courseId));
    return unwrap(data);
  },

  // payload: { title, description, order, isPreviewFree, sectionId?, video: { key, duration, size, format } }
  createLecture: async (courseId, payload) => {
    const { data } = await api.post(ENDPOINTS.lectures.create(courseId), payload);
    return unwrap(data);
  },

  // payload: same shape as create, but OMIT `video` when the video isn't being
  // replaced — the backend preserves the existing video in that case.
  updateLecture: async (lectureId, payload) => {
    const { data } = await api.patch(ENDPOINTS.lectures.update(lectureId), payload);
    return unwrap(data);
  },

  deleteLecture: async (lectureId) => {
    const { data } = await api.delete(ENDPOINTS.lectures.remove(lectureId));
    return unwrap(data);
  },
};
