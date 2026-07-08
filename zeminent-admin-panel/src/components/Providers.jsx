"use client";

import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";

// Single client boundary that wraps the whole app in context providers
// and mounts the toast portal.
export default function Providers({ children }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            className:
              "!bg-white !text-slate-800 dark:!bg-slate-900 dark:!text-slate-100 !shadow-card !rounded-xl !text-sm",
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  );
}
