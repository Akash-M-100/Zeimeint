import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateState, generateCodeVerifier } from "arctic";
import { getGoogle } from "@/lib/oauth";

const STATE_COOKIE = "google_oauth_state";
const VERIFIER_COOKIE = "google_oauth_verifier";

export async function GET() {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const url = getGoogle().createAuthorizationURL(state, codeVerifier, [
    "openid",
    "email",
    "profile",
  ]);
  // Force the account picker on every fresh sign-in; without it Google silently
  // re-authenticates the previously chosen account after logout.
  url.searchParams.set("prompt", "select_account");

  const jar = await cookies();
  const common = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  };
  jar.set(STATE_COOKIE, state, common);
  jar.set(VERIFIER_COOKIE, codeVerifier, common);

  return NextResponse.redirect(url);
}
