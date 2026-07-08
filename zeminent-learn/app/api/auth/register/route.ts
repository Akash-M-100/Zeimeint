import { NextResponse } from "next/server";
import { nestFetch, type NestUser } from "@/lib/nest";
import { setSessionCookie } from "@/lib/session";

// Mirrors /api/auth/login: unwrap the Express ApiResponse and seal the JWT
// in our session cookie so the browser stays logged in across reloads.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const upstream = await nestFetch("/auth/register", { method: "POST", body });
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
      { message: "Malformed registration response" },
      { status: 502 },
    );
  }

  await setSessionCookie(accessToken, user);
  return NextResponse.json({ user, accessToken }, { status: 201 });
}
