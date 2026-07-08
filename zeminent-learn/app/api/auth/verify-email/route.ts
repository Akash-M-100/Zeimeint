import { NextResponse } from "next/server";
import { nestFetch } from "@/lib/nest";

// Public proxy. The verification token itself is the authentication, so we
// don't read or mutate the session here — the user might not be logged in
// (e.g. clicked the link in a different browser).
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const upstream = await nestFetch("/auth/verify-email", { method: "POST", body });
  const payload = await upstream.json().catch(() => ({}));
  return NextResponse.json(payload, { status: upstream.status });
}
