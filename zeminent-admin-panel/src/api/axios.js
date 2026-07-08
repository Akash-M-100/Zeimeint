import axios from "axios";
import { API_URL, STORAGE_KEYS } from "@/config/constants";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // For file uploads let the browser set the multipart boundary itself.
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const data = error?.response?.data;

    const message =
      (Array.isArray(data?.message) ? data.message[0] : data?.message) ||
      error?.message ||
      "Something went wrong. Please try again.";

    const normalized = new Error(message);
    normalized.status = status;
    normalized.data = data;
    return Promise.reject(normalized);
  }
);

export default api;
