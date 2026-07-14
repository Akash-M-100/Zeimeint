import api from "./axios";
import { ENDPOINTS } from "@/config/constants";

const unwrap = (envelope) => envelope?.data ?? envelope;

export const dppService = {
  createDPP: async (sectionId, payload) => {
    const { data } = await api.post(ENDPOINTS.dpps.create(sectionId), payload);
    return unwrap(data);
  },

  deleteDPP: async (id) => {
    const { data } = await api.delete(ENDPOINTS.dpps.remove(id));
    return unwrap(data);
  },
};
