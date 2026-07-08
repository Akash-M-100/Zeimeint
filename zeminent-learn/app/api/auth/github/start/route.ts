import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateState } from "arctic";
import { getGitHub } from "@/lib/oauth";

const STATE_COOKIE = "github_oauth_state";

export async function GET() {
  const state = generateState();
  const url = getGitHub().createAuthorizationURL(state, ["read:user", "user:email"]);
  // Force the account picker on every fresh sign-in; without it GitHub silently
  // re-authenticates the previously authorized account after logout.
  url.searchParams.set("prompt", "select_account");

  const jar = await cookies();
  jar.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  return NextResponse.redirect(url);
}
