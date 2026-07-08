import api from "./axios";
import { ENDPOINTS } from "@/config/constants";

const unwrap = (envelope) => envelope?.data ?? envelope;

// Admin-facing reads about students and platform stats.
export const studentService = {
  getStudents: async (params = {}) => {
    const { data } = await api.get(ENDPOINTS.students.list, { params });
    return unwrap(data);
  },

  getAdminStats: async () => {
    const { data } = await api.get(ENDPOINTS.admin.stats);
    return unwrap(data);
  },
};
