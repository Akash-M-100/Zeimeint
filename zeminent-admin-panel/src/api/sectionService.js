import api from "./axios";
import { ENDPOINTS } from "@/config/constants";

const unwrap = (envelope) => envelope?.data ?? envelope;

// Section (chapter) CRUD. Sections group lectures inside a course so the
// student player can render Udemy-style chapter headings.
export const sectionService = {
  createSection: async (courseId, body) => {
    const { data } = await api.post(ENDPOINTS.sections.create(courseId), body);
    return unwrap(data);
  },

  updateSection: async (sectionId, body) => {
    const { data } = await api.patch(ENDPOINTS.sections.update(sectionId), body);
    return unwrap(data);
  },

  deleteSection: async (sectionId) => {
    const { data } = await api.delete(ENDPOINTS.sections.remove(sectionId));
    return unwrap(data);
  },

  reorderSections: async (courseId, sectionIds) => {
    const { data } = await api.patch(ENDPOINTS.sections.reorder(courseId), {
      sectionIds,
    });
    return unwrap(data);
  },
};
