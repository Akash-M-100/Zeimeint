"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import { useAuth } from "../components/AuthProvider";

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  if (status !== "authenticated") {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="font-mono-label">loading…</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      {/* pt-14 clears the fixed mobile top bar; removed at md+ where it's hidden. */}
      <main className="flex-1 min-w-0 pt-14 md:pt-0">{children}</main>
    </div>
  );
}
