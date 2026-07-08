import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import { APP_NAME, STORAGE_KEYS } from "@/config/constants";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata = {
  title: {
    default: `${APP_NAME} — Learn to build real software`,
    template: `%s · ${APP_NAME}`,
  },
  description:
    "Hands-on courses with lecture videos, projects and a clear path from beginner to job-ready.",
  icons: {
    icon: [
      { url: "/favicons/favicon.ico" },
      { url: "/favicons/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicons/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicons/favicon-96x96.png", type: "image/png", sizes: "96x96" },
      {
        url: "/favicons/android-icon-192x192.png",
        type: "image/png",
        sizes: "192x192",
      },
    ],
    shortcut: "/favicons/favicon.ico",
    apple: [
      { url: "/favicons/apple-icon-180x180.png", sizes: "180x180" },
      { url: "/favicons/apple-icon-152x152.png", sizes: "152x152" },
      { url: "/favicons/apple-icon-120x120.png", sizes: "120x120" },
    ],
  },
  manifest: "/favicons/manifest.json",
};

export const viewport = {
  themeColor: "#0d9488",
};

// Runs before paint to apply the saved theme — avoids a light/dark flash.
const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('${STORAGE_KEYS.THEME}');
    if (t !== 'light' && t !== 'dark') {
      t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    if (t === 'dark') document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = t;
  } catch (e) {}
})();
`;

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable}`}
      suppressHydrationWarning
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
