import { NextResponse } from "next/server";
import { nestFetch } from "@/lib/nest";
import { getSession } from "@/lib/session";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string; questionId: string }> },
) {
  const { id, questionId } = await ctx.params;
  const session = await getSession();
  const body = await req.json().catch(() => ({}));
  const upstream = await nestFetch(
    `/dpps/${encodeURIComponent(id)}/questions/${encodeURIComponent(questionId)}/answer`,
    { method: "POST", bearer: session?.rt, body },
  );
  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}
