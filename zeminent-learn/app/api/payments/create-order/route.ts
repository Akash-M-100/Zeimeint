import { NextResponse } from "next/server";
import { nestFetch } from "@/lib/nest";
import { getSession } from "@/lib/session";

// Forwards POST /api/payments/create-order to the backend with the user's
// access token. 401s anonymous callers at the BFF so the backend never sees
// them. Slice 11: backend pivoted to a single Full Access package — the
// request body is empty `{}` (any `courseId` sent is silently ignored
// upstream) and the response is `{ keyId, order, product }` ready for
// Razorpay checkout. A 409 means the user already has full access.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { message: "Authentication required" },
      { status: 401 },
    );
  }
  const body = await req.json().catch(() => ({}));
  const upstream = await nestFetch("/payments/create-order", {
    method: "POST",
    body,
    bearer: session.rt,
  });
  const payload = await upstream.json().catch(() => ({}));
  return NextResponse.json(payload, { status: upstream.status });
}
