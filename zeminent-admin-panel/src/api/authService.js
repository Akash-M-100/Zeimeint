import api from "./axios";
// Plain axios (NOT the shared instance) for the S3 PUT below — the shared
// `api` instance attaches Authorization: Bearer <jwt>, which a presigned
// PUT URL rejects with a cryptic signature error since its auth is already
// baked into the URL. Same pattern as src/api/s3Service.js.
import axios from "axios";
import { ENDPOINTS } from "@/config/constants";

// Staff auth (admin + instructor). Backend wraps responses as
// { success, message, data: { user, token } }. We normalize to
// { user, accessToken } for the rest of the app.
const unwrap = (payload) => payload?.data ?? payload;

const ROLE_ENDPOINT = {
  admin: ENDPOINTS.auth.adminLogin,
  instructor: ENDPOINTS.auth.instructorLogin,
};

const loginAs = async (role, email, password) => {
  const endpoint = ROLE_ENDPOINT[role] || ENDPOINTS.auth.adminLogin;
  const { data } = await api.post(endpoint, { email, password });
  const body = unwrap(data);
  return {
    user: body?.user,
    accessToken: body?.token ?? body?.accessToken,
  };
};

export const authService = {
  login: loginAs,
  loginAdmin: (email, password) => loginAs("admin", email, password),
  loginInstructor: (email, password) => loginAs("instructor", email, password),

  getProfile: async () => {
    const { data } = await api.get(ENDPOINTS.auth.me);
    const body = unwrap(data);
    return body?.user ?? body;
  },

  // Slice 13: PATCH /auth/me with a partial profile object. Backend service
  // applies an allowlist, so unknown fields are dropped server-side. Returns
  // the updated user document.
  updateProfile: async (patch) => {
    const { data } = await api.patch(ENDPOINTS.auth.me, patch);
    const body = unwrap(data);
    return body?.user ?? body;
  },

  // Slice 13: full avatar upload pipeline. Throws with the human-readable
  // server message on any step. Returns the updated user.
  uploadAvatar: async (file) => {
    const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
    if (!ALLOWED.includes(file.type)) {
      throw new Error("Avatar must be JPG, PNG, or WebP");
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("Avatar must be under 5MB");
    }

    // 1) Presign — backend issues a 15-min PUT URL under avatars/<uuid>.<ext>.
    const { data: presignRes } = await api.post("/auth/me/avatar/presign", {
      contentType: file.type,
    });
    const { key, uploadUrl } = unwrap(presignRes);
    if (!key || !uploadUrl) throw new Error("Presign response malformed");

    // 2) Direct S3 PUT. Plain axios (no interceptor) — see import comment.
    await axios.put(uploadUrl, file, {
      headers: { "Content-Type": file.type },
    });

    // 3) Persist the new key on the user doc.
    const { data: patchRes } = await api.patch(ENDPOINTS.auth.me, {
      avatarKey: key,
    });
    const body = unwrap(patchRes);
    return body?.user ?? body;
  },
};
