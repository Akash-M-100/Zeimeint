import { NextResponse } from "next/server";
import { nestFetch } from "@/lib/nest";
import { getSession } from "@/lib/session";

// Slice 14 Phase A: forwards GET /api/placement-program/eligibility to the
// backend. Eligibility is derived per-user (does the caller have at least
// one course at 100% completion?), so a bearer is mandatory — 401 at the
// BFF for anonymous callers.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, message: "Authentication required" },
      { status: 401 },
    );
  }
  const upstream = await nestFetch("/placement-program/eligibility", {
    method: "GET",
    bearer: session.rt,
  });
  const payload = await upstream.json().catch(() => ({}));
  return NextResponse.json(payload, { status: upstream.status });
}
