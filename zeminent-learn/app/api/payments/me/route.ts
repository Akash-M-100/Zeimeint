import { NextResponse } from "next/server";
import { nestFetch } from "@/lib/nest";
import { getSession } from "@/lib/session";

// Forwards GET /api/payments/me to the backend with the user's access
// token. Returns the caller's captured payments (newest first) for the
// receipts UI in Profile. 401s anonymous callers at the BFF so the backend
// never sees them.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { message: "Authentication required" },
      { status: 401 },
    );
  }
  const upstream = await nestFetch("/payments/me", {
    method: "GET",
    bearer: session.rt,
  });
  const payload = await upstream.json().catch(() => ({}));
  return NextResponse.json(payload, { status: upstream.status });
}
