import { NextResponse } from "next/server";
import { getSession, setSessionCookie } from "@/lib/session";
import { nestFetch, type NestUser } from "@/lib/nest";

// The session cookie caches a snapshot of the user taken at login. Server-side
// state — most importantly isEmailVerified — can change after that snapshot
// (e.g. the user clicks the verification link), so on refresh we re-validate
// against the backend's /auth/me and re-seal the cookie with the fresh flags.
//
// We overlay only the scalar fields onto the cached user rather than replacing
// it wholesale: /auth/me populates purchasedCourses, which we don't want to
// bloat the cookie with, and it keeps the id field exactly as login stored it.
//
// If /auth/me fails (expired token, backend down), we fall back to the cached
// snapshot so existing sessions keep working — same behavior as before.
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "No session" }, { status: 401 });
  }

  try {
    const upstream = await nestFetch("/auth/me", { bearer: session.rt });
    if (upstream.ok) {
      const payload = await upstream.json().catch(() => ({}));
      const fresh = (payload?.data?.user ?? payload?.user) as
        | Partial<NestUser>
        | undefined;
      if (fresh && fresh.email) {
        const user: NestUser = {
          ...session.user,
          name: fresh.name ?? session.user.name,
          email: fresh.email ?? session.user.email,
          role: fresh.role ?? session.user.role,
          isEmailVerified: fresh.isEmailVerified ?? session.user.isEmailVerified,
          // Slice 11: pick up package-purchase state so client components
          // (useAuth().user.hasFullAccess) flip immediately after a grant
          // without needing a hard reload. `?? false` because /auth/me may
          // omit the field for legacy docs that predate the schema bump.
          hasFullAccess: fresh.hasFullAccess ?? session.user.hasFullAccess ?? false,
          fullAccessGrantedAt:
            fresh.fullAccessGrantedAt ?? session.user.fullAccessGrantedAt ?? null,
        };
        await setSessionCookie(session.rt, user);
        return NextResponse.json({ user, accessToken: session.rt });
      }
    }
  } catch {
    // Fall through to the cached snapshot below.
  }

  return NextResponse.json({ user: session.user, accessToken: session.rt });
}
