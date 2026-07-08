import api from "./axios";
import { ENDPOINTS } from "@/config/constants";

const unwrap = (envelope) => envelope?.data ?? envelope;

// Admin-user management — wraps backend PR #15 endpoints, all gated by
// protect + isAdmin server-side. The dashboard counters / lists service
// (adminService) stays separate so concerns are clear: that one reads
// aggregate data, this one mutates role assignments.
export const adminUserService = {
  listAdmins: async () => {
    const { data } = await api.get(ENDPOINTS.adminUsers.list);
    return unwrap(data);
  },

  createAdmin: async ({ name, email, password }) => {
    const { data } = await api.post(ENDPOINTS.adminUsers.create, {
      name,
      email,
      password,
    });
    return unwrap(data);
  },

  // Demotes the target user to role:'student'. Backend safeguards 409
  // on self-revoke and on last-admin (no other admin remains).
  revokeAdmin: async (userId) => {
    const { data } = await api.delete(ENDPOINTS.adminUsers.revoke(userId));
    return unwrap(data);
  },
};
