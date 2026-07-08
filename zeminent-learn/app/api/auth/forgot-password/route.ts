import { NextResponse } from "next/server";
import { nestFetch } from "@/lib/nest";

// Public proxy. The backend is anti-enumeration (always 200 with a generic
// message), so there's nothing to gate here — pure relay.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const upstream = await nestFetch("/auth/forgot-password", { method: "POST", body });
  const payload = await upstream.json().catch(() => ({}));
  return NextResponse.json(payload, { status: upstream.status });
}
