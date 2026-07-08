"use client";
import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import SectionLabel from "../ui/SectionLabel";
import Cert, { CERT_WIDTH, CERT_HEIGHT } from "@/app/Dashboard/Certificate/Certificate";
import { useAuth } from "@/app/components/AuthProvider";

// Marketing-home preview values. Deliberately template-style — "Your Name",
// masked cert ID — so the cert reads as a fill-in-the-blanks template rather
// than a real person's screenshot. Em-dashes for duration/score signal
// "filled in on issue" without committing to a specific value.
const SAMPLE = {
  studentName: "Your Name",
  courseName: "Your Capstone Project",
  completionDate: "On completion",
  duration: "—",
  score: "—",
  certificateId: "ZM-••••-••••",
};

//ci/cd text

// Fit the fixed A4 canvas to the available width (centred, never upscaled).
function useFitScale() {
  const ref = useRef(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / CERT_WIDTH));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, scale };
}

export default function Certificate() {
  const { user } = useAuth();
  // When the visitor is signed in, drop their real name into the preview so
  // the cert reads as "this could be yours". Anonymous viewers see the
  // template "Your Name" placeholder from SAMPLE.
  const studentName = user?.name || SAMPLE.studentName;
  const [qr, setQr] = useState("");

  // QR encodes the Zeminent homepage.
  useEffect(() => {
    let live = true;
    import("qrcode")
      .then((QR) =>
        QR.toDataURL("https://www.zeminent.com/", {
          margin: 1,
          width: 240,
          color: { dark: "#16262d", light: "#FFFFFF" },
        }),
      )
      .then((u) => live && setQr(u))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const { ref, scale } = useFitScale();

  return (
    <section id="certificate" className="relative py-32" style={{ borderTop: "1px solid var(--border)" }}>
      <div className="max-w-7xl mx-auto px-6">
        <SectionLabel num="04" label="The certificate" />

        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-display" style={{ fontSize: "clamp(40px, 5vw, 64px)", lineHeight: 1.05 }}>
            Verifiable. Shareable.{" "}
            <span className="italic-display" style={{ color: "var(--accent)" }}>
              Earned.
            </span>
          </h2>
          <p className="mt-5" style={{ color: "var(--fg-dim)", fontSize: 17, lineHeight: 1.6 }}>
            Issued only on capstone completion. Every certificate carries a unique
            verification URL that recruiters can hit instantly — no PDFs to forge, no
            authority to call.
          </p>
        </div>

        {/* the real premium certificate, scaled to fit and centred */}
        <div ref={ref} style={{ width: "100%", marginTop: 56 }}>
          <div
            style={{
              width: CERT_WIDTH,
              margin: "0 auto",
              transform: `scale(${scale})`,
              transformOrigin: "top center",
              height: CERT_HEIGHT * scale,
              borderRadius: 8,
              overflow: "hidden",
              boxShadow: "0 40px 90px -40px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)",
            }}
          >
            <Cert {...SAMPLE} studentName={studentName} qrCode={qr} />
          </div>
        </div>

        {/* highlights */}
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
          {[
            "Unique verification URL on a public registry",
            "LinkedIn-ready, signed PDF download",
            "Scannable QR for instant authenticity checks",
            "Recruiters can verify in two clicks",
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-3">
              <span
                className="flex-shrink-0 mt-1 flex items-center justify-center"
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 999,
                  border: "1px solid var(--accent)",
                  color: "var(--accent)",
                }}
              >
                <Check size={10} strokeWidth={3} />
              </span>
              <span style={{ fontSize: 15, color: "var(--fg-dim)" }}>{t}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
