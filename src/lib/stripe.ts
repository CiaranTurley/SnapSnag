import Stripe from 'stripe'
import { loadStripe } from '@stripe/stripe-js'

// ─── Server-side Stripe client ────────────────────────────────────────────────
// Only use this in API routes, never in the browser.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

// ─── Browser-side Stripe promise ─────────────────────────────────────────────
// This is safe to use in React components.
let stripePromise: ReturnType<typeof loadStripe>

export function getStripe() {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
  }
  return stripePromise
}

// ─── Price IDs ────────────────────────────────────────────────────────────────
// Replace these with your actual Stripe Price IDs after creating them in the
// Stripe dashboard (Products → Add product).
export const PRICES = {
  // One-off inspection payment
  INSPECTION_GBP: 'price_REPLACE_WITH_YOUR_GBP_PRICE_ID',
  INSPECTION_EUR: 'price_REPLACE_WITH_YOUR_EUR_PRICE_ID',
  INSPECTION_USD: 'price_REPLACE_WITH_YOUR_USD_PRICE_ID',

  // Expert subscription
  EXPERT_MONTHLY: 'price_REPLACE_WITH_YOUR_EXPERT_MONTHLY_PRICE_ID',
  EXPERT_ANNUAL:  'price_REPLACE_WITH_YOUR_EXPERT_ANNUAL_PRICE_ID',
} as const
