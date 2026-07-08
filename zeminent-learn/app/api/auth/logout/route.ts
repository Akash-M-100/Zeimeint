import { NextResponse } from "next/server";
import { nestFetch } from "@/lib/nest";
import { clearSessionCookie, getSession } from "@/lib/session";

export async function POST(req: Request) {
  const bearer = req.headers.get("authorization")?.replace(/^Bearer /i, "");
  const session = await getSession();

  // Best-effort upstream logout. We always clear our own cookie below.
  if (bearer) {
    await nestFetch("/auth/logout", {
      method: "POST",
      bearer,
      refreshCookie: session?.rt,
    }).catch(() => null);
  }

  await clearSessionCookie();
  return new NextResponse(null, { status: 204 });
}
