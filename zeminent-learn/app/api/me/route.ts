import { NextResponse } from "next/server";
import { nestFetch } from "@/lib/nest";
import { getSession } from "@/lib/session";

// Proxies the current student's profile (with populated purchasedCourses)
// through the BFF so the dashboard can render the *real* enrolled courses for
// the signed-in viewer. The backend's /auth/me is `protect`-gated, so we
// forward the session token as a Bearer.
export async function GET() {
  const session = await getSession();
  if (!session?.rt) {
    return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 });
  }

  try {
    const upstream = await nestFetch("/auth/me", { bearer: session.rt });
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch (_err) {
    // Backend not running yet — caller falls back to an empty/enroll state.
    return NextResponse.json(
      { success: false, message: "Profile service unreachable" },
      { status: 503 },
    );
  }
}

// PATCH /api/me — forwards profile updates to the backend with the session
// bearer. Body is whatever the client sends (the backend's validator decides
// which fields are accepted; this BFF doesn't pre-filter).
export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session?.rt) {
    return NextResponse.json(
      { success: false, message: "Not authenticated" },
      { status: 401 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const upstream = await nestFetch("/auth/me", {
    method: "PATCH",
    body,
    bearer: session.rt,
  });
  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}
