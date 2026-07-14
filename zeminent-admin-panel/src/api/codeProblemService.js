import api from "./axios";
import { ENDPOINTS } from "@/config/constants";

const unwrap = (envelope) => envelope?.data ?? envelope;

export const codeProblemService = {
  createCodeProblem: async (sectionId, payload) => {
    const { data } = await api.post(ENDPOINTS.codeProblems.create(sectionId), payload);
    return unwrap(data);
  },

  updateCodeProblem: async (id, payload) => {
    const { data } = await api.put(ENDPOINTS.codeProblems.update(id), payload);
    return unwrap(data);
  },

  deleteCodeProblem: async (id) => {
    const { data } = await api.delete(ENDPOINTS.codeProblems.remove(id));
    return unwrap(data);
  },
};
