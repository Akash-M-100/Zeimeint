import { NextResponse } from "next/server";
import { nestFetch } from "@/lib/nest";
import { getSession } from "@/lib/session";

// Returns the viewer's per-lecture progress for one course, keyed by lectureId.
// Used by any client that wants progress separately from the course bundle
// (the bundle already embeds it; this is for refresh / standalone fetches).
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { message: "Authentication required" },
      { status: 401 },
    );
  }
  const { id } = await ctx.params;
  const upstream = await nestFetch(
    `/progress/course/${encodeURIComponent(id)}`,
    { bearer: session.rt },
  );
  const payload = await upstream.json().catch(() => ({}));
  return NextResponse.json(payload, { status: upstream.status });
}
