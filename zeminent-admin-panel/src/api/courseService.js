import api from "./axios";
import { ENDPOINTS } from "@/config/constants";

// Backend wraps every response as { success, message, data: <payload> }.
// `unwrap` returns the inner payload so callers can read `result.courses`,
// `result.course`, etc. directly without re-unpacking it everywhere.
const unwrap = (envelope) => envelope?.data ?? envelope;

export const courseService = {
  getCourses: async (params = {}) => {
    const { data } = await api.get(ENDPOINTS.courses.list, { params });
    return unwrap(data);
  },

  getCourse: async (id) => {
    const { data } = await api.get(ENDPOINTS.courses.detail(id));
    return unwrap(data);
  },

  createCourse: async (formData) => {
    const { data } = await api.post(ENDPOINTS.courses.create, formData);
    return unwrap(data);
  },

  updateCourse: async (id, formData) => {
    const { data } = await api.patch(ENDPOINTS.courses.update(id), formData);
    return unwrap(data);
  },

  deleteCourse: async (id) => {
    const { data } = await api.delete(ENDPOINTS.courses.remove(id));
    return unwrap(data);
  },

  // The backend doesn't expose a dedicated /publish route — toggling publish
  // status is just a normal course update.
  togglePublish: async (id, isPublished) => {
    const { data } = await api.patch(ENDPOINTS.courses.update(id), {
      isPublished,
    });
    return unwrap(data);
  },

  // Slice 16.5b: enrolled-students lookup for the meeting-series attendee
  // picker. Hits the admin-scoped backend endpoint added in 16.2.
  // Returns { students: [{_id, name, email}] }.
  listStudents: async (courseId) => {
    const { data } = await api.get(ENDPOINTS.admin.courses.students(courseId));
    return unwrap(data);
  },
};
