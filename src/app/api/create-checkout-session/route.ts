import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { COUNTRY_CONFIG } from '@/lib/countryConfig'
import type { CountryCode } from '@/lib/countryConfig'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

function randomReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return 'SNAP' + Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function POST(req: NextRequest) {
  try {
    const { inspectionId } = await req.json()
    if (!inspectionId) return NextResponse.json({ error: 'Missing inspectionId' }, { status: 400 })

    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const admin = createSupabaseAdminClient()

    const { data: inspection, error } = await admin
      .from('inspections')
      .select('id, address, country, paid_at, verification_code')
      .eq('id', inspectionId)
      .eq('user_id', user.id)
      .single()

    if (error || !inspection) return NextResponse.json({ error: 'Inspection not found' }, { status: 404 })

    // Already paid — redirect to report
    if (inspection.paid_at) {
      return NextResponse.json({ url: `${process.env.NEXT_PUBLIC_SITE_URL}/inspect/${inspectionId}/report` })
    }

    const countryCode = (inspection.country as CountryCode) ?? 'IE'
    const cfg = COUNTRY_CONFIG[countryCode] ?? COUNTRY_CONFIG['IE']
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

    // ── Credit balance ────────────────────────────────────────────────────────
    const { data: userRow } = await admin
      .from('users')
      .select('credit_balance, referred_by, first_paid_done')
      .eq('id', user.id)
      .single()

    const creditBalance = userRow?.credit_balance ?? 0
    const fullPrice     = cfg.oneTimePrice // in cents
    const creditApplied = Math.min(creditBalance, fullPrice)
    const chargeAmount  = fullPrice - creditApplied

    // If credit covers it entirely, skip Stripe
    if (chargeAmount <= 0) {
      await handlePostPayment(admin, inspectionId, user.id, userRow, creditApplied)
      return NextResponse.json({ url: `${siteUrl}/inspect/${inspectionId}/report?paid=credit` })
    }

    // Build discounts or reduced price
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: cfg.currency.toLowerCase(),
          unit_amount: chargeAmount,
          product_data: {
            name: 'SnapSnag Inspection Report',
            description: creditApplied > 0
              ? `${cfg.currency}${(creditApplied / 100).toFixed(2)} credit applied · ${inspection.address ?? 'your property'}`
              : `Professional snagging report for ${inspection.address ?? 'your property'}`,
          },
        },
        quantity: 1,
      },
    ]

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      metadata: {
        inspectionId,
        userId: user.id,
        creditApplied: creditApplied.toString(),
      },
      success_url: `${siteUrl}/inspect/${inspectionId}/report?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${siteUrl}/inspect/${inspectionId}/complete`,
    })

    return NextResponse.json({
      url: session.url,
      creditApplied,
      chargeAmount,
      currency: cfg.currency,
    })
  } catch (err) {
    console.error('Checkout session error:', err)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}

// ── Shared post-payment logic (called from webhook too) ───────────────────────
async function handlePostPayment(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  inspectionId: string,
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  userRow: any,
  creditApplied: number,
) {
  const updates: Record<string, unknown> = {}

  // Deduct credits used
  if (creditApplied > 0) {
    updates.credit_balance = Math.max(0, (userRow?.credit_balance ?? 0) - creditApplied)
  }

  // First paid inspection — generate referral code + award referrer credit
  if (!userRow?.first_paid_done) {
    updates.first_paid_done = true

    // Generate this user's referral code
    const code = randomReferralCode()
    updates.referral_code = code

    // Award referrer
    if (userRow?.referred_by) {
      const { data: referrer } = await admin
        .from('users')
        .select('id, credit_balance')
        .eq('referral_code', userRow.referred_by)
        .single()

      if (referrer) {
        // Give referrer EUR5 (500 cents)
        await admin
          .from('users')
          .update({ credit_balance: (referrer.credit_balance ?? 0) + 500 })
          .eq('id', referrer.id)

        // Also give the new user EUR5
        updates.credit_balance = ((updates.credit_balance as number | undefined) ?? (userRow?.credit_balance ?? 0)) + 500
      }
    }
  }

  if (Object.keys(updates).length) {
    await admin.from('users').update(updates).eq('id', userId)
  }

  // Warranty expiry
  const { data: inspRow } = await admin.from('inspections').select('handover_date').eq('id', inspectionId).single()
  const warrantyExpiresAt = inspRow?.handover_date
    ? new Date(new Date(inspRow.handover_date).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString()
    : null

  await admin.from('inspections').update({
    paid_at: new Date().toISOString(),
    ...(warrantyExpiresAt ? { warranty_expires_at: warrantyExpiresAt } : {}),
  }).eq('id', inspectionId)
}
