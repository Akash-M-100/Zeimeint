import { NextResponse } from "next/server";
import { nestFetch } from "@/lib/nest";
import { getSession } from "@/lib/session";

// Forwards Razorpay's checkout callback (order_id, payment_id, signature) to
// the backend's HMAC-verifier. On success the backend marks the Payment paid
// and adds the course to the user's purchasedCourses. The webhook handler is
// the independent backstop for closed-tab flows.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { message: "Authentication required" },
      { status: 401 },
    );
  }
  const body = await req.json().catch(() => ({}));
  const upstream = await nestFetch("/payments/verify", {
    method: "POST",
    body,
    bearer: session.rt,
  });
  const payload = await upstream.json().catch(() => ({}));
  return NextResponse.json(payload, { status: upstream.status });
}
