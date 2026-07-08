import api from "./axios";
import { ENDPOINTS } from "@/config/constants";

const unwrap = (envelope) => envelope?.data ?? envelope;

// Admin-only management of instructor accounts.
export const instructorService = {
  getInstructors: async (params = {}) => {
    const { data } = await api.get(ENDPOINTS.instructors.list, { params });
    return unwrap(data);
  },

  // body: { name, email, password }
  createInstructor: async (body) => {
    const { data } = await api.post(ENDPOINTS.instructors.create, body);
    return unwrap(data);
  },

  // body: { name?, password? }
  updateInstructor: async (id, body) => {
    const { data } = await api.patch(ENDPOINTS.instructors.update(id), body);
    return unwrap(data);
  },

  deleteInstructor: async (id) => {
    const { data } = await api.delete(ENDPOINTS.instructors.remove(id));
    return unwrap(data);
  },
};
