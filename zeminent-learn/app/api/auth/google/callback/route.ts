import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decodeJwt } from "jose";
import { getGoogle } from "@/lib/oauth";
import { bridgeOAuthLogin } from "@/lib/nest";
import { setSessionCookie } from "@/lib/session";
import { getRedirectBase, publicRedirect } from "@/lib/redirect";

const STATE_COOKIE = "google_oauth_state";
const VERIFIER_COOKIE = "google_oauth_verifier";

type GoogleIdTokenClaims = {
  sub?: unknown;
  email?: unknown;
  email_verified?: unknown;
  name?: unknown;
  picture?: unknown;
};

function loginRedirect(req: Request, error: string): NextResponse {
  // Build off APP_URL when set so a reverse proxy doesn't bounce us to the
  // internal host. The `error` query param needs mutation, so we can't use
  // `publicRedirect` (path-only) here.
  const url = new URL("/login", getRedirectBase(req));
  url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const jar = await cookies();
  const storedState = jar.get(STATE_COOKIE)?.value ?? null;
  const codeVerifier = jar.get(VERIFIER_COOKIE)?.value ?? null;
  jar.delete(STATE_COOKIE);
  jar.delete(VERIFIER_COOKIE);

  if (!code || !state || !storedState || !codeVerifier || state !== storedState) {
    return loginRedirect(req, "oauth_state_mismatch");
  }

  let tokens;
  try {
    tokens = await getGoogle().validateAuthorizationCode(code, codeVerifier);
  } catch {
    return loginRedirect(req, "oauth_exchange_failed");
  }

  const claims = decodeJwt(tokens.idToken()) as GoogleIdTokenClaims;
  const sub = typeof claims.sub === "string" ? claims.sub : null;
  const email = typeof claims.email === "string" ? claims.email : null;
  const emailVerified = claims.email_verified === true;
  if (!sub || !email) return loginRedirect(req, "oauth_missing_profile");
  if (!emailVerified) return loginRedirect(req, "email_unverified");

  const result = await bridgeOAuthLogin({
    provider: "google",
    providerUserId: sub,
    email,
    emailVerified: true,
    name: typeof claims.name === "string" ? claims.name : null,
    picture: typeof claims.picture === "string" ? claims.picture : null,
  });
  if ("error" in result) {
    return loginRedirect(req, "oauth_bridge_failed");
  }

  await setSessionCookie(result.accessToken, result.user);
  // OAuth users are trusted-verified by the provider, so they always land on
  // the Dashboard. (The start route doesn't carry a `from`, so there's nothing
  // to restore here — see report notes if deep-link return is needed later.)
  return publicRedirect(req, "/Dashboard");
}
