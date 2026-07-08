import { NextResponse } from "next/server";
import { nestFetch } from "@/lib/nest";
import { getSession } from "@/lib/session";

// Forwards POST /api/auth/change-password to the backend with the user's
// access token. 401s anonymous callers at the BFF so the backend never sees
// them. The backend handles validation + bcrypt comparison + rate limiting.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.rt) {
    return NextResponse.json(
      { success: false, message: "Not authenticated" },
      { status: 401 },
    );
  }
  const body = await req.json().catch(() => ({}));
  const upstream = await nestFetch("/auth/change-password", {
    method: "POST",
    body,
    bearer: session.rt,
  });
  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}
