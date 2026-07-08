"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const ThemeContext = createContext(null);

// Shared with the admin panel so the preference name is consistent across apps.
const STORAGE_KEY = "zlms_theme";

export function ThemeProvider({ children }) {
  // The marketing site + dashboard are designed dark-first, so dark is the
  // default. The real value is hydrated from localStorage in the effect below;
  // a tiny blocking script in app/layout.js applies the `light` class before
  // paint so there is no flash.
  const [theme, setThemeState] = useState("dark");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setThemeState(stored === "light" || stored === "dark" ? stored : "dark");
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    root.classList.toggle("light", theme === "light");
    root.style.colorScheme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme, hydrated]);

  const setTheme = useCallback((t) => setThemeState(t), []);
  const toggleTheme = useCallback(
    () => setThemeState((t) => (t === "dark" ? "light" : "dark")),
    []
  );

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme, isDark: theme === "dark" }),
    [theme, setTheme, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
}
