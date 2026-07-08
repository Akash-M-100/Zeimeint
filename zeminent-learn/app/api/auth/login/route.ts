import { NextResponse } from "next/server";
import { nestFetch, type NestUser } from "@/lib/nest";
import { setSessionCookie } from "@/lib/session";

// Express backend wraps everything in { statusCode, message, data: {...} }.
// We pull the user + access token out of `data` and seal the token in the
// session cookie so /api/auth/refresh can re-issue the access token without a
// dedicated refresh endpoint (which the backend doesn't expose).
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const upstream = await nestFetch("/auth/login", { method: "POST", body });
  const payload = await upstream.json().catch(() => ({}));

  if (!upstream.ok) {
    return NextResponse.json(payload, { status: upstream.status });
  }

  const inner = (payload?.data ?? payload) as {
    user?: NestUser;
    token?: string;
    accessToken?: string;
  };
  const user = inner.user;
  const accessToken = inner.accessToken || inner.token;

  if (!user || !accessToken) {
    return NextResponse.json(
      { message: "Malformed login response" },
      { status: 502 },
    );
  }

  await setSessionCookie(accessToken, user);
  return NextResponse.json({ user, accessToken });
}
