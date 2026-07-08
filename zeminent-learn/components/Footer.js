import Image from "next/image";
import { Github, Linkedin, Twitter } from "./ui/BrandIcons";

export default function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--border)", background: "var(--bg)" }}>
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-10">
          <div className="col-span-2 md:col-span-4">
            <div className="flex items-center">
              <Image
                src="/zeminent-logo-v3.png"
                alt="Zeminent"
                width={114}
                height={25}
                className="brand-logo"
                style={{ height: 24, width: "auto" }}
              />
            </div>
            <p className="mt-5 italic-display" style={{ fontSize: 18, color: "var(--fg-dim)", maxWidth: 320 }}>
              The MERN bootcamp built like the products you'll ship.
            </p>
            <div className="mt-6 flex items-center gap-2">
              <a className="btn-ghost p-2 inline-flex"><Twitter size={14} /></a>
              <a className="btn-ghost p-2 inline-flex"><Github size={14} /></a>
              <a className="btn-ghost p-2 inline-flex"><Linkedin size={14} /></a>
            </div>
          </div>

          {[
            { h: "Product", l: ["Curriculum", "Certificate", "Pricing", "Trailer"] },
            { h: "Company", l: ["About", "Instructor", "Hiring partners", "Press"] },
            { h: "Resources", l: ["Free intro", "Blog", "Discord", "Glossary"] },
            { h: "Legal", l: ["Terms", "Privacy", "Refund policy", "Verify cert"] },
          ].map((col) => (
            <div key={col.h} className="md:col-span-2">
              <div
                className="font-mono uppercase mb-4"
                style={{ color: "var(--fg-mute)", fontSize: 11, letterSpacing: "0.16em" }}
              >
                {col.h}
              </div>
              <ul className="space-y-3" style={{ color: "var(--fg-dim)", fontSize: 14 }}>
                {col.l.map((i) => (
                  <li key={i}><a className="nav-link">{i}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="mt-16 pt-6 flex flex-wrap items-center justify-between gap-3 font-mono"
          style={{ borderTop: "1px solid var(--border)", color: "var(--fg-mute)", fontSize: 12 }}
        >
          <span>© 2026 Zeminent Learning · India</span>
          <span>built in India</span>
        </div>
      </div>
    </footer>
  );
}
