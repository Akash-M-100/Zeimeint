import { NextResponse } from "next/server";
import { nestFetch } from "@/lib/nest";

// Public proxy. The reset token in the body is the authentication — no session
// needed (the user is locked out by definition). Pure relay.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const upstream = await nestFetch("/auth/reset-password", { method: "POST", body });
  const payload = await upstream.json().catch(() => ({}));
  return NextResponse.json(payload, { status: upstream.status });
}
