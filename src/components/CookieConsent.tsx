'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'snapsnag_cookie_consent'

export type ConsentValue = 'all' | 'essential'

export function getCookieConsent(): ConsentValue | null {
  if (typeof window === 'undefined') return null
  return (localStorage.getItem(STORAGE_KEY) as ConsentValue) ?? null
}

export function setCookieConsent(value: ConsentValue) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, value)
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Only show if no consent stored yet
    if (!localStorage.getItem(STORAGE_KEY)) {
      // Small delay so it doesn't flash immediately on load
      const t = setTimeout(() => setVisible(true), 800)
      return () => clearTimeout(t)
    }
  }, [])

  function accept() {
    setCookieConsent('all')
    setVisible(false)
    // Fire GA4 consent update if gtag is loaded
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        analytics_storage: 'granted',
      })
    }
  }

  function essential() {
    setCookieConsent('essential')
    setVisible(false)
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        analytics_storage: 'denied',
      })
    }
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#111827] border-t border-white/8 px-4 py-4 sm:px-6"
    >
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="font-grotesk text-sm text-white/70 leading-relaxed flex-1">
          We use cookies to make SnapSnag work and to understand how you use it.{' '}
          <Link href="/privacy" className="text-snap-teal hover:underline">
            Cookie policy
          </Link>
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={essential}
            className="font-grotesk text-sm font-semibold px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white/70 hover:text-white transition-colors min-h-[44px]"
          >
            Essential only
          </button>
          <button
            onClick={accept}
            className="font-grotesk text-sm font-semibold px-4 py-2.5 rounded-xl bg-snap-teal text-snap-ink hover:brightness-105 transition-all min-h-[44px]"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  )
}
