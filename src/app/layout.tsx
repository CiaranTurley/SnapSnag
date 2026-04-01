import type { Metadata, Viewport } from 'next'
import { Fraunces, Space_Grotesk } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
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
        {children}
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
