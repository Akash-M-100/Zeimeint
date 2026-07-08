import api from "./axios";
import { ENDPOINTS } from "@/config/constants";

const unwrap = (envelope) => envelope?.data ?? envelope;

export const paymentService = {
  getPayments: async (params = {}) => {
    const { data } = await api.get(ENDPOINTS.payments.list, { params });
    return unwrap(data);
  },
};
