'use client'

import './globals.css'
import { Fraunces, Geist, Geist_Mono } from 'next/font/google'
import { usePathname } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { NavbarProvider } from '@/context/NavbarContext'
import { useEffect } from 'react'
import AnalyticsTracker from '@/components/AnalyticsTracker'
import Script from 'next/script'

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-fraunces',
  display: 'swap',
})

const geist = Geist({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-geist',
  display: 'swap',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-geist-mono',
  display: 'swap',
})

export default function RootLayout({ children }) {
  const pathname = usePathname()

  // Hide footer on the embedded expense-tracker demo
  const hideFooter = pathname?.startsWith('/products/expense-tracker')

  // Client-side title/description for the trimmed-down route set
  useEffect(() => {
    const map = {
      '/': {
        title: 'Zeminent — Your AI-First Engineering Partner',
        description:
          'Zeminent is your AI-first engineering partner. We architect AI-native solutions in Data Engineering, AI/ML, and Cloud (AWS, GCP, Azure).',
      },
      '/contact': {
        title: 'Contact Zeminent — Start an AI Partnership',
        description:
          'Talk with Zeminent about AI/ML, data engineering, and cloud. A 30-minute working session on where AI can move your numbers.',
      },
      '/products/expense-tracker': {
        title: 'Expense Tracker Demo | Zeminent Product',
        description:
          'Experience Zeminent’s embedded expense tracker demo showcasing intuitive budgeting, reporting, and secure workflows.',
      },
    }

    const entry = map[pathname] || map['/']
    if (entry?.title) {
      document.title = entry.title
    }
    if (entry?.description) {
      let meta = document.querySelector('meta[name="description"]')
      if (!meta) {
        meta = document.createElement('meta')
        meta.name = 'description'
        document.head.appendChild(meta)
      }
      meta.content = entry.description
    }
  }, [pathname])

  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${geist.variable} ${geistMono.variable}`}
    >
      <head>
        <link rel="apple-touch-icon" sizes="57x57" href="/favicons/apple-icon-57x57.png" />
        <link rel="apple-touch-icon" sizes="60x60" href="/favicons/apple-icon-60x60.png" />
        <link rel="apple-touch-icon" sizes="72x72" href="/favicons/apple-icon-72x72.png" />
        <link rel="apple-touch-icon" sizes="76x76" href="/favicons/apple-icon-76x76.png" />
        <link rel="apple-touch-icon" sizes="114x114" href="/favicons/apple-icon-114x114.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/favicons/apple-icon-120x120.png" />
        <link rel="apple-touch-icon" sizes="144x144" href="/favicons/apple-icon-144x144.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/favicons/apple-icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/favicons/apple-icon-180x180.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicons/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicons/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="96x96" href="/favicons/favicon-96x96.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/favicons/android-icon-192x192.png" />
        <link rel="shortcut icon" href="/favicons/favicon.ico" />
        <link rel="manifest" href="/favicons/manifest.json" />
        <meta name="msapplication-TileColor" content="#0d1117" />
        <meta name="msapplication-TileImage" content="/favicons/ms-icon-144x144.png" />
        <meta name="theme-color" content="#0d1117" />
      </head>
      <body suppressHydrationWarning={true}>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-DLXPJ9706P"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-DLXPJ9706P');
          `}
        </Script>
        <NavbarProvider>
          <Navbar />
          <main>
            <AnalyticsTracker />
            {children}
          </main>
          {!hideFooter && <Footer />}
        </NavbarProvider>
      </body>
    </html>
  )
}
