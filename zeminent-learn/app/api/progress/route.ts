import { NextResponse } from "next/server";
import { nestFetch } from "@/lib/nest";
import { getSession } from "@/lib/session";

// Forwards POST /api/progress to the backend with the user's access token.
// 401s anonymous callers at the BFF so the backend never sees them.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { message: "Authentication required" },
      { status: 401 },
    );
  }
  const body = await req.json().catch(() => ({}));
  const upstream = await nestFetch("/progress", {
    method: "POST",
    body,
    bearer: session.rt,
  });
  const payload = await upstream.json().catch(() => ({}));
  return NextResponse.json(payload, { status: upstream.status });
}
