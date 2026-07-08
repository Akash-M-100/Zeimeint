import { jwtDecrypt } from "jose";
import type { NestUser } from "./nest";

// Edge-runtime-safe session decode. Mirrors the unseal logic in lib/session.ts
// but pulls in NO Node-only deps and NO next/headers — middleware reads the
// cookie off the request itself and passes the raw value here.
//
// `import type` for NestUser is erased at compile time, so nest.ts's
// `import "server-only"` side effect never reaches the edge bundle.

export const SESSION_COOKIE = "zlearn_session";

export type Session = { rt: string; user: NestUser };

let keyPromise: Promise<Uint8Array> | null = null;
function getKey(): Promise<Uint8Array> {
  if (!keyPromise) {
    const secret = process.env.SESSION_SECRET;
    if (!secret) throw new Error("SESSION_SECRET is not set");
    // Web Crypto (crypto.subtle) is available in the edge runtime.
    keyPromise = crypto.subtle
      .digest("SHA-256", new TextEncoder().encode(secret))
      .then((buf) => new Uint8Array(buf));
  }
  return keyPromise;
}

// Returns the decoded session, or null if the cookie is absent, malformed,
// expired, or fails decryption. Never throws.
export async function unsealSession(sealed: string | undefined | null): Promise<Session | null> {
  if (!sealed) return null;
  try {
    const key = await getKey();
    const { payload } = await jwtDecrypt(sealed, key);
    const p = payload as { rt?: unknown; user?: { name?: unknown } };
    if (typeof p.rt !== "string") return null;
    if (!p.user || typeof p.user.name !== "string") return null;
    return payload as unknown as Session;
  } catch {
    return null;
  }
}
