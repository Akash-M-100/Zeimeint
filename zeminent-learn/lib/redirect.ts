import { NextResponse } from "next/server";

/**
 * Public base URL for redirects. Behind a reverse proxy, `req.url` reflects
 * the **internal** host (e.g. the `localhost:7000` Next is bound to by the
 * `start` script), not the public origin — so a naive `new URL(path, req.url)`
 * sends the browser to the internal port. Prefer `APP_URL` when set; fall
 * back to the request's origin so local dev keeps working without the env var.
 *
 * Trailing slash on `APP_URL` is stripped so callers can append `/path`
 * without worrying about doubled slashes.
 *
 * Typed as `Request` (not `NextRequest`) so the same helper serves both the
 * App Router Route Handlers (`req: Request`) and Edge Middleware
 * (`req: NextRequest`, which extends `Request`).
 */
export function getRedirectBase(req: Request): string {
  return process.env.APP_URL?.replace(/\/$/, "") || new URL("/", req.url).origin;
}

/** Shortcut for redirects to a path with no query params. */
export function publicRedirect(req: Request, path: string): NextResponse {
  const base = getRedirectBase(req);
  return NextResponse.redirect(`${base}${path.startsWith("/") ? path : `/${path}`}`);
}
