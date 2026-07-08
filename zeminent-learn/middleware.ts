import { NextResponse, type NextRequest } from "next/server";
import { unsealSession, SESSION_COOKIE } from "@/lib/session-edge";
import { getRedirectBase, publicRedirect } from "@/lib/redirect";

// Strict-verification gate. Runs in the edge runtime, so it only uses the
// edge-safe decode helper (no next/headers, no Node crypto).
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await unsealSession(req.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/verify-email-pending") {
    if (!session) {
      return publicRedirect(req, "/login");
    }
    if (session.user.isEmailVerified === true) {
      return publicRedirect(req, "/");
    }
    return NextResponse.next();
  }

  // Everything else matched here is under /Dashboard.
  if (!session) {
    // The `from` query param needs mutation; build the URL from APP_URL
    // directly instead of going through `publicRedirect`.
    const url = new URL("/login", getRedirectBase(req));
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }
  if (session.user.isEmailVerified === false) {
    return publicRedirect(req, "/verify-email-pending");
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/Dashboard/:path*", "/verify-email-pending"],
};
