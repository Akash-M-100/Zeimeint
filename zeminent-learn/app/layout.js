import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./components/AuthProvider";
import { ThemeProvider } from "./components/ThemeProvider";
import { getServerUser } from "../lib/session";

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
  title: "Zeminent Learning",
  description: "Learn modern web development from real engineers",
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

// Runs before paint to apply the saved theme — avoids a dark/light flash.
// The app is dark-first, so we only add the `light` class when chosen.
const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('zlms_theme');
    if (t !== 'light' && t !== 'dark') t = 'dark';
    if (t === 'light') document.documentElement.classList.add('light');
    document.documentElement.style.colorScheme = t;
  } catch (e) {}
})();
`;

export default async function RootLayout({ children }) {
  const initialUser = await getServerUser();
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable}`}
      suppressHydrationWarning
    >
      <body
        className="min-h-screen flex flex-col"
        suppressHydrationWarning
      >
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <ThemeProvider>
          <AuthProvider initialUser={initialUser}>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
