import { NextResponse } from "next/server";
import { nestFetch } from "@/lib/nest";

// PUBLIC marketing-home endpoint — no auth, no session, no bearer. nestFetch
// makes `bearer` optional and routes through the configured NEST_API_URL.
// Marked dynamic to defeat any build-time caching: when an instructor toggles
// their visibility, the next browser fetch should reflect it immediately.
export const dynamic = "force-dynamic";

export async function GET() {
  const upstream = await nestFetch("/instructors", { method: "GET" });
  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}
