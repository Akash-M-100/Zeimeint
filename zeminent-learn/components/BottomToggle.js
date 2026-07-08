"use client";
import { useRouter, usePathname } from "next/navigation";

export default function BottomToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const lowerPath = pathname?.toLowerCase() ?? "";
  const isDashboard = lowerPath.startsWith("/dashboard");
  // Focused, chrome-free pages: auth + the email-verification flow. The
  // "/verify-email" prefix covers both /verify-email and /verify-email-pending.
  const isChromelessRoute =
    lowerPath.startsWith("/login") ||
    lowerPath.startsWith("/register") ||
    lowerPath.startsWith("/verify-email") ||
    lowerPath.startsWith("/forgot-password") ||
    lowerPath.startsWith("/reset-password");

  if (isChromelessRoute) return null;

  const BTN_WIDTH = 130;
  const PAD = 6;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 60,
      }}
    >
      <div
        style={{
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          padding: PAD,
          borderRadius: 999,
          background: "rgba(11,2,31,0.85)",
          border: "1px solid rgba(255,255,255,0.14)",
          backdropFilter: "blur(14px) saturate(140%)",
          WebkitBackdropFilter: "blur(14px) saturate(140%)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
          fontFamily: "'Geist Mono', ui-monospace, monospace",
          fontSize: 12,
          letterSpacing: "0.08em",
          overflow: "hidden",
        }}
      >
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: PAD,
            bottom: PAD,
            left: PAD,
            width: BTN_WIDTH,
            borderRadius: 999,
            background: "#e8ecef",
            boxShadow: "0 4px 14px rgba(255,255,255,0.18)",
            transform: `translateX(${isDashboard ? BTN_WIDTH : 0}px)`,
            transition:
              "transform 0.42s cubic-bezier(0.65, 0, 0.35, 1), box-shadow 0.3s ease",
            willChange: "transform",
          }}
        />
        <button
          onClick={() => router.push("/")}
          style={{
            position: "relative",
            zIndex: 1,
            width: BTN_WIDTH,
            padding: "8px 0",
            borderRadius: 999,
            border: "none",
            cursor: "pointer",
            background: "transparent",
            color: !isDashboard ? "#0d1117" : "#a8b0bb",
            fontWeight: 600,
            transition: "color 0.32s ease",
          }}
        >
          MARKETING
        </button>
        <button
          onClick={() => router.push("/Dashboard")}
          style={{
            position: "relative",
            zIndex: 1,
            width: BTN_WIDTH,
            padding: "8px 0",
            borderRadius: 999,
            border: "none",
            cursor: "pointer",
            background: "transparent",
            color: isDashboard ? "#0d1117" : "#a8b0bb",
            fontWeight: 600,
            transition: "color 0.32s ease",
          }}
        >
          DASHBOARD
        </button>
      </div>
    </div>
  );
}
