import "server-only";
import { jwtDecrypt, EncryptJWT } from "jose";
import { cookies } from "next/headers";
import type { NestUser } from "./nest";

const SESSION_COOKIE = "zlearn_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type Session = { rt: string; user: NestUser };

let keyPromise: Promise<Uint8Array> | null = null;
function getKey(): Promise<Uint8Array> {
  if (!keyPromise) {
    const secret = process.env.SESSION_SECRET;
    if (!secret) throw new Error("SESSION_SECRET is not set");
    keyPromise = crypto.subtle
      .digest("SHA-256", new TextEncoder().encode(secret))
      .then((buf) => new Uint8Array(buf));
  }
  return keyPromise;
}

async function seal(payload: Session): Promise<string> {
  const key = await getKey();
  return new EncryptJWT({ ...payload })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .encrypt(key);
}

async function unseal(token: string): Promise<Session | null> {
  try {
    const key = await getKey();
    const { payload } = await jwtDecrypt(token, key);
    const p = payload as { rt?: unknown; user?: { name?: unknown } };
    if (typeof p.rt !== "string") return null;
    if (!p.user || typeof p.user.name !== "string") return null;
    return payload as unknown as Session;
  } catch {
    return null;
  }
}

export async function setSessionCookie(refreshToken: string, user: NestUser): Promise<void> {
  const jar = await cookies();
  const sealed = await seal({ rt: refreshToken, user });
  jar.set(SESSION_COOKIE, sealed, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const sealed = jar.get(SESSION_COOKIE)?.value;
  if (!sealed) return null;
  return unseal(sealed);
}

export async function getServerUser(): Promise<NestUser | null> {
  return (await getSession())?.user ?? null;
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
