"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "../components/AuthProvider";

export default function ProfileLayout({ children }) {
  const router = useRouter();
  const { status } = useAuth();

  // Mirror the Dashboard layout's hard auth gate — Profile is per-user only.
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
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-bg/95 backdrop-blur border-b border-border">
        <div className="max-w-[1100px] mx-auto px-8 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center hover:opacity-80 transition-opacity"
            aria-label="Zeminent — back to home"
          >
            <Image
              src="/zeminent-logo-v3.png"
              alt="Zeminent"
              width={114}
              height={25}
              priority
              className="h-6 w-auto brand-logo"
            />
          </Link>
          <Link
            href="/"
            className="font-mono text-[11px] uppercase tracking-wider text-muted-2 hover:text-white transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
