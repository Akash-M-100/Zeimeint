import { NextResponse } from "next/server";
import { nestFetch } from "@/lib/nest";
import { getSession } from "@/lib/session";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ courseId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { message: "Authentication required" },
      { status: 401 },
    );
  }

  const { courseId } = await ctx.params;
  const upstream = await nestFetch(
    `/path/complete/${encodeURIComponent(courseId)}`,
    {
      method: "POST",
      bearer: session.rt,
    },
  );
  const payload = await upstream.json().catch(() => ({}));
  return NextResponse.json(payload, { status: upstream.status });
}
