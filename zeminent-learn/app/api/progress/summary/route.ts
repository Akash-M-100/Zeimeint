import { NextResponse } from "next/server";
import { nestFetch } from "@/lib/nest";
import { getSession } from "@/lib/session";

// Cross-course rollup for the Dashboard's "Continue learning" surface.
// Newest-touched courses first; each entry carries watchedLectures/total,
// percent, and the last lecture touched (for deep-link Resume).
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { message: "Authentication required" },
      { status: 401 },
    );
  }
  const upstream = await nestFetch("/progress/summary", {
    bearer: session.rt,
  });
  const payload = await upstream.json().catch(() => ({}));
  return NextResponse.json(payload, { status: upstream.status });
}
