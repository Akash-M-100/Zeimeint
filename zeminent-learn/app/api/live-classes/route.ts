import { NextResponse } from "next/server";
import { nestFetch } from "@/lib/nest";

// Proxy to the Nest/Express backend so the student app talks to its own
// origin (no CORS, no client-side knowledge of the backend URL).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const qs = url.search ?? "";

  try {
    const upstream = await nestFetch(`/live-classes${qs}`);
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  } catch (_err) {
    // Backend not running yet — caller will fall back to mock data.
    return NextResponse.json(
      { success: false, message: "Live classes service unreachable" },
      { status: 503 },
    );
  }
}
