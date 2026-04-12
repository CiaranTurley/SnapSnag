import type { Metadata, Viewport } from 'next'
import { Fraunces, Space_Grotesk } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import { GoogleAnalytics } from '@next/third-parties/google'
import { CountryProvider } from '@/lib/CountryContext'
import { ThemeProvider } from '@/lib/ThemeContext'
import SnapBot from '@/components/SnapBot'
import SupportChat from '@/components/SupportChat'
import PWAInstallPrompt from '@/components/PWAInstallPrompt'
import CookieConsent from '@/components/CookieConsent'
import './globals.css'

// ─── Fraunces: headings & logo wordmark ──────────────────────────────────────
const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['700'],
  variable: '--font-fraunces',
  display: 'swap',
})

// ─── Space Grotesk: body text & UI ───────────────────────────────────────────
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'SnapSnag – Property Snagging for New Build Homebuyers',
  description:
    'Inspect your new build home like a professional. Photograph defects, generate instant PDF reports, and share with your builder.',
  keywords: ['snagging', 'new build', 'property inspection', 'defects', 'homebuyer'],
  authors: [{ name: 'SnapSnag' }],
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/icon-192.png',
  },
  openGraph: {
    title: 'SnapSnag – Property Snagging Made Simple',
    description: 'The professional snagging app built for new build homebuyers.',
    type: 'website',
    siteName: 'SnapSnag',
  },
}

export const viewport: Viewport = {
  themeColor: '#00C9A7',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${spaceGrotesk.variable}`}>
      <body className="antialiased">
        <ThemeProvider>
          <CountryProvider>
            <a href="#main-content" className="skip-link">Skip to main content</a>
            {children}
            <SupportChat />
            <SnapBot />
            <PWAInstallPrompt />
          </CountryProvider>
        </ThemeProvider>
        {/* GA4 — default consent denied; CookieConsent banner updates it */}
        {process.env.NEXT_PUBLIC_GA4_ID && (
          <>
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('consent','default',{analytics_storage:'denied'});
                  // Restore consent from localStorage before GA loads
                  try {
                    var c = localStorage.getItem('snapsnag_cookie_consent');
                    if (c === 'all') gtag('consent','update',{analytics_storage:'granted'});
                  } catch(e){}
                `,
              }}
            />
            <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA4_ID} />
          </>
        )}
        <CookieConsent />
        {/* Global toast notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1C2840',
              color: '#FAFAF8',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              fontFamily: 'var(--font-space-grotesk)',
            },
            success: {
              iconTheme: { primary: '#00D68F', secondary: '#0A0F1A' },
            },
            error: {
              iconTheme: { primary: '#FF4D4F', secondary: '#0A0F1A' },
            },
          }}
        />
      </body>
    </html>
  )
}
