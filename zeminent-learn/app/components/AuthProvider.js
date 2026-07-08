"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

const AuthContext = createContext(null);

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export function AuthProvider({ children, initialUser = null }) {
  const [user, setUser] = useState(initialUser);
  const [accessToken, setAccessToken] = useState(null);
  const [status, setStatus] = useState(
    initialUser ? "authenticated" : "loading"
  );
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    (async () => {
      try {
        const res = await fetch("/api/auth/refresh", { method: "POST" });
        if (!res.ok) {
          setUser(null);
          setAccessToken(null);
          setStatus("unauthenticated");
          return;
        }
        const data = await readJson(res);
        setUser(data.user ?? null);
        setAccessToken(data.accessToken ?? null);
        setStatus(data.user ? "authenticated" : "unauthenticated");
      } catch {
        setStatus(initialUser ? "authenticated" : "unauthenticated");
      }
    })();
  }, [initialUser]);

  const login = useCallback(async (email, password) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await readJson(res);
    if (!res.ok) {
      const message =
        (Array.isArray(data.message) ? data.message[0] : data.message) ??
        "Login failed";
      throw new Error(message);
    }
    setUser(data.user);
    setAccessToken(data.accessToken);
    setStatus("authenticated");
    return data.user;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await readJson(res);
    if (!res.ok) {
      const message =
        (Array.isArray(data.message) ? data.message[0] : data.message) ??
        "Registration failed";
      throw new Error(message);
    }
    setUser(data.user);
    setAccessToken(data.accessToken);
    setStatus("authenticated");
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    }).catch(() => null);
    setUser(null);
    setAccessToken(null);
    setStatus("unauthenticated");
  }, [accessToken]);

  // Re-pulls the user from the sealed session cookie via /api/auth/refresh.
  // Callers (e.g. /verify-email after a successful POST) use this to pick up
  // server-side flag changes like isEmailVerified. Throws on a non-2xx so the
  // caller can decide whether the failure is meaningful.
  const refreshUser = useCallback(async () => {
    const res = await fetch("/api/auth/refresh", { method: "POST" });
    if (!res.ok) {
      throw new Error("Refresh failed");
    }
    const data = await readJson(res);
    setUser(data.user ?? null);
    setAccessToken(data.accessToken ?? null);
    setStatus(data.user ? "authenticated" : "unauthenticated");
    return data.user ?? null;
  }, []);

  // Patches the current user's profile via the BFF PATCH /api/me proxy.
  // Updates local `user` state with the fresh server-returned doc so any
  // consumer reading useAuth().user picks up the change immediately.
  // Throws on non-2xx with the server's message so callers can show it.
  const updateProfile = useCallback(async (patch) => {
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await readJson(res);
    if (!res.ok) {
      const message =
        (Array.isArray(data.message) ? data.message[0] : data.message) ??
        "Failed to update profile";
      throw new Error(message);
    }
    const updated = data?.data?.user ?? data?.user ?? null;
    if (updated) setUser(updated);
    return updated;
  }, []);

  // Changes the current user's password via the BFF POST /api/auth/change-password
  // proxy. No local state to update on success (password isn't stored client-side).
  // Throws on non-2xx with the server's message.
  const changePassword = useCallback(
    async ({ currentPassword, newPassword }) => {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await readJson(res);
      if (!res.ok) {
        const message =
          (Array.isArray(data.message) ? data.message[0] : data.message) ??
          "Failed to change password";
        throw new Error(message);
      }
      return data;
    },
    [],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        status,
        login,
        register,
        logout,
        refreshUser,
        updateProfile,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
