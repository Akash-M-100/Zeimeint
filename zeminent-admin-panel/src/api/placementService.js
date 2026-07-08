import api from "./axios";
import { ENDPOINTS } from "@/config/constants";

const unwrap = (envelope) => envelope?.data ?? envelope;

// Slice 14 B.6: admin-facing wrapper around the Phase B backend.
// Pairs to the Slice 14 B.4 controller endpoints, which are gated by
// isAdmin server-side — anything callable here requires an admin token.
export const placementService = {
  // ─── Enrollments ──────────────────────────────────────────────────
  // `params` accepts { status, search } per the backend signature.
  listEnrollments: async (params = {}) => {
    const { data } = await api.get(ENDPOINTS.placement.enrollments, { params });
    return unwrap(data);
  },

  getEnrollment: async (id) => {
    const { data } = await api.get(ENDPOINTS.placement.enrollment(id));
    return unwrap(data);
  },

  // Whitelist enforced server-side: status, placedAt*, notes.
  updateEnrollment: async (id, payload) => {
    const { data } = await api.patch(
      ENDPOINTS.placement.enrollment(id),
      payload,
    );
    return unwrap(data);
  },

  // Calls /placement-program/refunds — body { paymentId, reason, notes }.
  // Backend uses Payment._id as Razorpay's Idempotency-Key, so a rapid
  // double-submit on this endpoint is safe (returns 409 on the second hit).
  refund: async ({ paymentId, reason, notes }) => {
    const { data } = await api.post(ENDPOINTS.placement.refund, {
      paymentId,
      reason,
      notes,
    });
    return unwrap(data);
  },

  // ─── Leads (Phase A — legacy after B.5 removed the lead form) ─────
  listLeads: async (params = {}) => {
    const { data } = await api.get(ENDPOINTS.placement.leads, { params });
    return unwrap(data);
  },

  updateLead: async (id, payload) => {
    const { data } = await api.patch(ENDPOINTS.placement.lead(id), payload);
    return unwrap(data);
  },
};
