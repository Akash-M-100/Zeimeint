import { NextResponse } from "next/server";
import { nestFetch } from "@/lib/nest";
import { getSession } from "@/lib/session";

// Authenticated proxy. The backend identifies the recipient from the bearer
// token, so we don't need a request body — just forward the user's access
// token and relay the upstream response untouched.
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "No session" }, { status: 401 });
  }
  const upstream = await nestFetch("/auth/resend-verification", {
    method: "POST",
    bearer: session.rt,
  });
  const payload = await upstream.json().catch(() => ({}));
  return NextResponse.json(payload, { status: upstream.status });
}
