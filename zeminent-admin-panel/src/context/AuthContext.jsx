"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { authService } from "@/api/authService";
import { STORAGE_KEYS } from "@/config/constants";

const AuthContext = createContext(null);

function readJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Role-aware staff auth context, shared by the admin and instructor panels.
// State starts empty and is hydrated from localStorage in an effect so server
// and first client render match (no hydration mismatch). `hydrated` lets route
// guards wait until we actually know the auth state.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setUser(readJSON(STORAGE_KEYS.USER));
    setHydrated(true);
  }, []);

  // role: "admin" | "instructor". Hits the matching role-gated login endpoint.
  const login = useCallback(async (role, email, password) => {
    const data = await authService.login(role, email, password);
    setUser(data.user);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
    if (data.accessToken)
      localStorage.setItem(STORAGE_KEYS.TOKEN, data.accessToken);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
  }, []);

  // Slice 13: lets callers (e.g. InstructorProfile after a PATCH /auth/me)
  // update the cached user with the freshly-saved doc. localStorage stays in
  // sync so the topbar avatar/name reflect changes immediately and across
  // reloads. Pass `null` to clear (rare — logout already handles that).
  const updateUser = useCallback((nextUser) => {
    setUser(nextUser);
    if (nextUser) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(nextUser));
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      hydrated,
      role: user?.role || null,
      isAuthenticated: !!user,
      isAdmin: user?.role === "admin",
      isInstructor: user?.role === "instructor",
      login,
      logout,
      updateUser,
    }),
    [user, hydrated, login, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
