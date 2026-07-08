import api from "./axios";
import { ENDPOINTS } from "@/config/constants";

const unwrap = (envelope) => envelope?.data ?? envelope;

export const liveClassService = {
  list: async (params = {}) => {
    const { data } = await api.get(ENDPOINTS.liveClasses.list, { params });
    return unwrap(data);
  },

  get: async (id) => {
    const { data } = await api.get(ENDPOINTS.liveClasses.detail(id));
    return unwrap(data);
  },

  create: async (payload) => {
    const { data } = await api.post(ENDPOINTS.liveClasses.create, payload);
    return unwrap(data);
  },

  update: async (id, payload) => {
    const { data } = await api.patch(ENDPOINTS.liveClasses.update(id), payload);
    return unwrap(data);
  },

  remove: async (id) => {
    const { data } = await api.delete(ENDPOINTS.liveClasses.remove(id));
    return unwrap(data);
  },

  togglePublish: async (id, isPublished) => {
    const { data } = await api.patch(ENDPOINTS.liveClasses.update(id), {
      isPublished,
    });
    return unwrap(data);
  },

  setCancelled: async (id, cancelled) => {
    const { data } = await api.patch(ENDPOINTS.liveClasses.update(id), {
      statusOverride: cancelled ? "cancelled" : "none",
    });
    return unwrap(data);
  },
};
