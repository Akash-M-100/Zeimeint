import { NextResponse } from "next/server";
import { nestFetch } from "@/lib/nest";
import { getSession } from "@/lib/session";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getSession();
  const upstream = await nestFetch(`/courses/${encodeURIComponent(id)}/lectures`, { bearer: session?.rt });
  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}
