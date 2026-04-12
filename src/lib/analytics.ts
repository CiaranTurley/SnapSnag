/**
 * GA4 event tracking helpers.
 * All functions are safe to call server-side or before GA loads —
 * they guard on window.gtag availability.
 *
 * Usage:
 *   import { trackEvent } from '@/lib/analytics'
 *   trackEvent('inspection_start', { country: 'IE' })
 */

type GtagEventParams = Record<string, string | number | boolean | undefined>

export function trackEvent(eventName: string, params?: GtagEventParams) {
  if (typeof window === 'undefined') return
  if (typeof window.gtag !== 'function') return
  window.gtag('event', eventName, params)
}

// ─── Typed helpers for key SnapSnag events ───────────────────────────────────

/** Fired when the user starts a new inspection (clicks Start Inspection) */
export function trackInspectionStart(country: string) {
  trackEvent('inspection_start', { country })
}

/** Fired when the paywall / checkout page is shown */
export function trackPaywallView(inspectionId: string, country: string, priceCents: number) {
  trackEvent('paywall_view', { inspection_id: inspectionId, country, value: priceCents / 100 })
}

/** Fired on successful Stripe payment redirect (paid=true query param) */
export function trackPurchase(inspectionId: string, country: string, priceCents: number, currency: string) {
  trackEvent('purchase', {
    transaction_id: inspectionId,
    value: priceCents / 100,
    currency,
    country,
  })
}

/** Fired when the user downloads or generates a PDF report */
export function trackPdfDownload(inspectionId: string, country: string) {
  trackEvent('pdf_download', { inspection_id: inspectionId, country })
}

/** Fired when the user downloads a Word report */
export function trackWordDownload(inspectionId: string, country: string) {
  trackEvent('word_download', { inspection_id: inspectionId, country })
}

/** Fired when the user signs up */
export function trackSignup(country: string) {
  trackEvent('sign_up', { country })
}

/** Fired when a share link is generated */
export function trackShareLink(inspectionId: string) {
  trackEvent('share_link_generated', { inspection_id: inspectionId })
}
