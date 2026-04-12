import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { sendRefundEmail } from '@/lib/email'
import { createCreditNote } from '@/lib/accounting'

// ─── Internal refund endpoint — called by the support tool-use loop ───────────
// NOT exposed to the browser directly.

const MAX_AUTO_REFUND_CENTS = 5000 // EUR50

export async function POST(req: NextRequest) {
  try {
    const { payment_intent_id, amount_cents, reason, inspection_id } = await req.json()

    if (!payment_intent_id || !amount_cents || !reason) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    if (amount_cents > MAX_AUTO_REFUND_CENTS) {
      return NextResponse.json(
        { error: 'Amount exceeds auto-refund limit — escalate to owner' },
        { status: 422 }
      )
    }

    // Verify the payment intent exists and was actually charged
    const pi = await stripe.paymentIntents.retrieve(payment_intent_id)
    if (pi.status !== 'succeeded') {
      return NextResponse.json({ error: 'Payment not in succeeded state' }, { status: 422 })
    }

    // Issue refund
    const refund = await stripe.refunds.create({
      payment_intent: payment_intent_id,
      amount: amount_cents,
      reason: 'requested_by_customer',
      metadata: { reason, auto_refund: 'true', inspection_id: inspection_id ?? '' },
    })

    const supabase = createSupabaseAdminClient()

    // If inspection linked, mark as refunded in DB and send confirmation email
    if (inspection_id) {
      const { data: insp } = await supabase
        .from('inspections')
        .select('address, user_id')
        .eq('id', inspection_id)
        .single()

      await supabase
        .from('inspections')
        .update({ status: 'refunded', paid_at: null })
        .eq('id', inspection_id)

      if (insp?.user_id) {
        const { data: { user } } = await supabase.auth.admin.getUserById(insp.user_id)
        if (user?.email) {
          const { data: userRow } = await supabase.from('users').select('name, country').eq('id', insp.user_id).single()

          sendRefundEmail({
            email: user.email,
            name: userRow?.name ?? '',
            amountFormatted: `€${(amount_cents / 100).toFixed(2)}`,
            refundId: refund.id,
            address: insp.address ?? '',
          }).catch(() => {})

          // Xero credit note (fire-and-forget)
          createCreditNote({
            customerEmail: user.email,
            customerName: userRow?.name ?? '',
            country: userRow?.country ?? 'IE',
            amountCents: amount_cents,
            currency: 'EUR',
            stripeRefundId: refund.id,
          }).catch(() => {})
        }
      }
    }

    return NextResponse.json({
      success: true,
      refund_id: refund.id,
      amount_cents,
      status: refund.status,
    })
  } catch (err) {
    console.error('[refund] Error:', err)
    return NextResponse.json({ error: 'Refund failed' }, { status: 500 })
  }
}
