import { NextResponse } from "next/server";
import { nestFetch } from "@/lib/nest";
import { getSession } from "@/lib/session";

// Proxies the course detail (with sections + access-gated lectures) through
// the BFF so the browser never sees the backend URL. Forwards the session
// access token as a Bearer so the backend can apply per-viewer gating
// (admins see drafts, purchasers see full videos, etc.).
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const session = await getSession();
  const bearer = session?.rt;

  const upstream = await nestFetch(`/courses/${encodeURIComponent(id)}`, {
    bearer,
  });
  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}
