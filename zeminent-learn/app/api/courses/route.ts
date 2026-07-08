import { NextResponse } from "next/server";
import { nestFetch } from "@/lib/nest";
import { getSession } from "@/lib/session";

// Lightweight proxy so the student app fetches courses through its own origin
// (no client-side knowledge of the backend URL, no CORS edge cases).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const qs = url.search ? url.search : "";
  const session = await getSession();

  const upstream = await nestFetch(`/courses${qs}`, {
    bearer: session?.rt,
  });
  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}
