import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

function randomGiftCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 12 }, (_, i) => {
    const c = chars[Math.floor(Math.random() * chars.length)]
    return i > 0 && i % 4 === 0 ? '-' + c : c
  }).join('')
}

// POST — create a Stripe checkout for gift card purchase
export async function POST(req: NextRequest) {
  const { amount_cents, currency, quantity, buyer_email } = await req.json() as {
    amount_cents: number
    currency: string
    quantity: number
    buyer_email?: string
  }

  if (!amount_cents || amount_cents < 100) {
    return NextResponse.json({ error: 'Minimum gift card value is €1' }, { status: 400 })
  }
  if (!quantity || quantity < 1 || quantity > 20) {
    return NextResponse.json({ error: 'Quantity must be 1–20' }, { status: 400 })
  }

  const bulkDiscount = quantity >= 5 ? 0.10 : 0
  const unitAmount   = Math.round(amount_cents * (1 - bulkDiscount))
  const totalAmount  = unitAmount * quantity

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: currency.toLowerCase(),
        unit_amount: unitAmount,
        product_data: {
          name: `SnapSnag Gift Card${quantity > 1 ? ` × ${quantity}` : ''}`,
          description: bulkDiscount > 0 ? '10% bulk discount applied' : 'Redeemable for any SnapSnag inspection report',
        },
      },
      quantity,
    }],
    customer_email: buyer_email,
    metadata: {
      gift_card: 'true',
      amount_cents: amount_cents.toString(),
      currency,
      quantity: quantity.toString(),
      buyer_email: buyer_email ?? '',
    },
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/gift/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${process.env.NEXT_PUBLIC_SITE_URL}/gift`,
  })

  return NextResponse.json({ url: session.url, totalAmount, bulkDiscount })
}

// GET — retrieve gift codes after successful purchase
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id')
  if (!sessionId) return NextResponse.json({ error: 'session_id required' }, { status: 400 })

  const session = await stripe.checkout.sessions.retrieve(sessionId)
  if (session.payment_status !== 'paid') {
    return NextResponse.json({ error: 'Payment not completed' }, { status: 402 })
  }

  const admin = createSupabaseAdminClient()

  // Check if codes already generated for this session
  const { data: existing } = await admin
    .from('gift_cards')
    .select('code, amount_cents, currency')
    .eq('stripe_session_id', sessionId)

  if (existing?.length) return NextResponse.json({ codes: existing })

  // Generate new codes
  const quantity    = parseInt(session.metadata?.quantity ?? '1', 10)
  const amountCents = parseInt(session.metadata?.amount_cents ?? '0', 10)
  const currency    = session.metadata?.currency ?? 'EUR'
  const buyerEmail  = session.metadata?.buyer_email || null

  const rows = Array.from({ length: quantity }, () => ({
    code:               randomGiftCode(),
    amount_cents:       amountCents,
    currency,
    purchased_by_email: buyerEmail,
    stripe_session_id:  sessionId,
  }))

  await admin.from('gift_cards').insert(rows)

  return NextResponse.json({ codes: rows.map(r => ({ code: r.code, amount_cents: r.amount_cents, currency: r.currency })) })
}
