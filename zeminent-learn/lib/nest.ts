import "server-only";

const BASE = process.env.NEST_API_URL ?? "http://localhost:4000/api";

export type NestRole = "STUDENT" | "INSTRUCTOR" | "ADMIN";

export type NestUser = {
  id: string;
  name: string;
  email: string;
  role: NestRole;
  isEmailVerified?: boolean;
  // Slice 11: lifetime Full Access package flag — surfaced via /auth/me.
  // True after a successful package purchase grant (verify or webhook path).
  hasFullAccess?: boolean;
  // ISO date string of the first grant. Null/undefined for users who never
  // purchased. Backend stamps this only on the first transition to
  // hasFullAccess=true (monotonic upsert in payment.service.js).
  fullAccessGrantedAt?: string | null;
};

export type NestAuthResponse = {
  user: NestUser;
  accessToken: string;
};

type NestFetchOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  refreshCookie?: string;
  bearer?: string;
  extraHeaders?: Record<string, string>;
};

export async function nestFetch(
  path: string,
  { method = "GET", body, refreshCookie, bearer, extraHeaders }: NestFetchOptions = {}
): Promise<Response> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (bearer) headers["Authorization"] = `Bearer ${bearer}`;
  if (refreshCookie) headers["Cookie"] = `refresh_token=${refreshCookie}`;
  if (extraHeaders) Object.assign(headers, extraHeaders);

  return fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
}

export type OAuthBridgeProfile = {
  provider: "google" | "github";
  providerUserId: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
};

// Exchanges an OAuth provider profile for a NestJS session via the bridge
// endpoint. The shared secret keeps anyone other than this BFF from minting
// sessions for arbitrary accounts.
export async function bridgeOAuthLogin(
  profile: OAuthBridgeProfile,
): Promise<{ user: NestUser; accessToken: string } | { error: string; status: number }> {
  const secret = process.env.OAUTH_BRIDGE_SECRET;
  if (!secret) return { error: "OAUTH_BRIDGE_SECRET is not set", status: 500 };

  const upstream = await nestFetch("/auth/oauth", {
    method: "POST",
    body: profile,
    extraHeaders: { "X-Bridge-Secret": secret },
  });
  const payload = await upstream.json().catch(() => ({}));

  if (!upstream.ok) {
    const message =
      (payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message: unknown }).message)
        : null) ?? "OAuth bridge failed";
    return { error: message, status: upstream.status };
  }

  const inner = (payload?.data ?? payload) as {
    user?: NestUser;
    token?: string;
    accessToken?: string;
  };
  const user = inner.user;
  const accessToken = inner.accessToken || inner.token;
  if (!user || !accessToken) {
    return { error: "Malformed OAuth bridge response", status: 502 };
  }
  return { user, accessToken };
}

export function extractRefreshCookie(res: Response): string | null {
  const setCookies = res.headers.getSetCookie?.() ?? [];
  for (const c of setCookies) {
    if (c.startsWith("refresh_token=")) {
      const value = c.split(";")[0].slice("refresh_token=".length);
      return value || null;
    }
  }
  return null;
}
