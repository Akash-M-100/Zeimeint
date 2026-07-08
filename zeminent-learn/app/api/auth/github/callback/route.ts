import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getGitHub } from "@/lib/oauth";
import { bridgeOAuthLogin } from "@/lib/nest";
import { setSessionCookie } from "@/lib/session";
import { getRedirectBase, publicRedirect } from "@/lib/redirect";

const STATE_COOKIE = "github_oauth_state";

type GitHubUser = {
  id?: number;
  login?: string;
  name?: string | null;
  avatar_url?: string | null;
};

type GitHubEmail = {
  email: string;
  primary: boolean;
  verified: boolean;
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
  jar.delete(STATE_COOKIE);

  if (!code || !state || !storedState || state !== storedState) {
    return loginRedirect(req, "oauth_state_mismatch");
  }

  let tokens;
  try {
    tokens = await getGitHub().validateAuthorizationCode(code);
  } catch {
    return loginRedirect(req, "oauth_exchange_failed");
  }

  const accessToken = tokens.accessToken();
  const auth = { Authorization: `Bearer ${accessToken}` };

  const [userRes, emailsRes] = await Promise.all([
    fetch("https://api.github.com/user", { headers: auth, cache: "no-store" }),
    fetch("https://api.github.com/user/emails", { headers: auth, cache: "no-store" }),
  ]);
  if (!userRes.ok || !emailsRes.ok) return loginRedirect(req, "oauth_profile_fetch_failed");

  const user = (await userRes.json()) as GitHubUser;
  const emails = (await emailsRes.json()) as GitHubEmail[];
  const primary = Array.isArray(emails)
    ? emails.find((e) => e.primary && e.verified)
    : undefined;
  if (!primary) return loginRedirect(req, "email_unverified");
  if (typeof user.id !== "number") return loginRedirect(req, "oauth_missing_profile");

  const result = await bridgeOAuthLogin({
    provider: "github",
    providerUserId: String(user.id),
    email: primary.email,
    emailVerified: true,
    name: user.name ?? user.login ?? null,
    picture: user.avatar_url ?? null,
  });
  if ("error" in result) return loginRedirect(req, "oauth_bridge_failed");

  await setSessionCookie(result.accessToken, result.user);
  // OAuth users are trusted-verified by the provider, so they always land on
  // the Dashboard. (The start route doesn't carry a `from`, so there's nothing
  // to restore here — see report notes if deep-link return is needed later.)
  return publicRedirect(req, "/Dashboard");
}
