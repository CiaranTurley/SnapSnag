import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import {
  upsertContact,
  triggerPurchaseSequence,
  sendReceiptEmail,
  triggerExpertCancelledSequence,
  triggerExpertPaymentFailedSequence,
} from '@/lib/email'
import {
  createInspectionInvoice,
  createSubscriptionInvoice,
} from '@/lib/accounting'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient()

  // ── One-time inspection payment ──────────────────────────────────────────────
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    // Skip subscription checkouts (they have no inspectionId)
    const inspectionId = session.metadata?.inspectionId
    if (!inspectionId) {
      return NextResponse.json({ received: true })
    }

    // Fetch handover_date to compute warranty expiry
    const { data: inspRow } = await supabase
      .from('inspections')
      .select('handover_date')
      .eq('id', inspectionId)
      .single()

    const warrantyExpiresAt = inspRow?.handover_date
      ? new Date(new Date(inspRow.handover_date).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString()
      : null

    const { error } = await supabase
      .from('inspections')
      .update({
        paid_at: new Date().toISOString(),
        stripe_session_id: session.id,
        ...(warrantyExpiresAt ? { warranty_expires_at: warrantyExpiresAt } : {}),
      })
      .eq('id', inspectionId)

    if (error) {
      console.error('Failed to mark inspection as paid:', error)
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
    }

    // Record anonymised defects (fire-and-forget)
    fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/defect-record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-secret': process.env.CRON_SECRET ?? '' },
      body: JSON.stringify({ inspection_id: inspectionId }),
    }).catch(() => {})

    // Loops: get user info then trigger purchase sequence + receipt
    const { data: { user: buyer } } = await supabase.auth.admin.getUserById(session.client_reference_id ?? '')
    if (buyer?.email) {
      const { data: userRow } = await supabase
        .from('users')
        .select('name, country')
        .eq('id', buyer.id)
        .single()

      const { data: insp } = await supabase
        .from('inspections')
        .select('address')
        .eq('id', inspectionId)
        .single()

      const reportUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/inspect/${inspectionId}/report`
      const address = insp?.address ?? 'your property'
      const name = userRow?.name ?? ''
      const country = userRow?.country ?? 'IE'
      const amountFormatted = session.amount_total
        ? `€${(session.amount_total / 100).toFixed(2)}`
        : ''

      upsertContact(buyer.email, { name, country, userId: buyer.id }).catch(() => {})

      triggerPurchaseSequence({ email: buyer.email, name, inspectionId, address, reportUrl, country }).catch(() => {})

      sendReceiptEmail({ email: buyer.email, name, address, amountFormatted, reportUrl, inspectionId }).catch(() => {})

      // Xero invoice (fire-and-forget)
      createInspectionInvoice({
        customerEmail: buyer.email,
        customerName: name,
        country,
        amountCents: session.amount_total ?? 0,
        currency: (session.currency ?? 'eur').toUpperCase(),
        stripePaymentIntentId: session.payment_intent as string ?? session.id,
        inspectionId,
      }).catch(() => {})
    }

    console.log(`Inspection ${inspectionId} marked as paid.`)
  }

  // ── Expert subscription created / updated ────────────────────────────────────
  if (
    event.type === 'customer.subscription.created' ||
    event.type === 'customer.subscription.updated'
  ) {
    const sub = event.data.object as Stripe.Subscription
    const userId = sub.metadata?.supabase_user_id
    if (!userId) return NextResponse.json({ received: true })

    const statusMap: Record<string, string> = {
      active:   'active',
      trialing: 'trial',
      past_due: 'past_due',
      canceled: 'cancelled',
      unpaid:   'past_due',
      paused:   'past_due',
      incomplete: 'past_due',
      incomplete_expired: 'expired',
    }

    const newStatus = statusMap[sub.status] ?? 'expired'
    const periodEnd = new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000).toISOString()

    await supabase
      .from('expert_subscriptions')
      .update({
        stripe_subscription_id: sub.id,
        stripe_price_id: sub.items.data[0]?.price.id ?? null,
        stripe_customer_id: sub.customer as string,
        status: newStatus,
        current_period_end: periodEnd,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    console.log(`Expert subscription ${sub.id} → ${newStatus} for user ${userId}`)
  }

  // ── Expert subscription cancelled / deleted ──────────────────────────────────
  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    const userId = sub.metadata?.supabase_user_id
    if (!userId) return NextResponse.json({ received: true })

    await supabase
      .from('expert_subscriptions')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    // Loops: cancellation win-back sequence
    const { data: { user: cancelledUser } } = await supabase.auth.admin.getUserById(userId)
    if (cancelledUser?.email) {
      const { data: userRow } = await supabase.from('users').select('name').eq('id', userId).single()
      triggerExpertCancelledSequence({
        email: cancelledUser.email,
        name: userRow?.name ?? '',
      }).catch(() => {})
    }

    console.log(`Expert subscription cancelled for user ${userId}`)
  }

  // ── Expert invoice paid — create Xero invoice ────────────────────────────────
  if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object as Stripe.Invoice
    const sub = invoice.subscription
    if (sub && invoice.amount_paid > 0) {
      const customerId = invoice.customer as string
      const { data: expSub } = await supabase
        .from('expert_subscriptions')
        .select('user_id, stripe_price_id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (expSub?.user_id) {
        const { data: { user: paidUser } } = await supabase.auth.admin.getUserById(expSub.user_id)
        if (paidUser?.email) {
          const { data: userRow } = await supabase.from('users').select('name, country').eq('id', expSub.user_id).single()
          // Determine interval from price ID
          const annualPriceId = process.env.STRIPE_EXPERT_ANNUAL_PRICE_ID
          const interval = expSub.stripe_price_id === annualPriceId ? 'year' : 'month'

          createSubscriptionInvoice({
            customerEmail: paidUser.email,
            customerName: userRow?.name ?? '',
            country: userRow?.country ?? 'IE',
            amountCents: invoice.amount_paid,
            currency: invoice.currency.toUpperCase(),
            stripeInvoiceId: invoice.id,
            interval,
          }).catch(() => {})
        }
      }
    }
  }

  // ── Expert invoice payment failed ────────────────────────────────────────────
  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice
    const customerId = invoice.customer as string
    if (!customerId) return NextResponse.json({ received: true })

    // Look up supabase user via expert_subscriptions
    const { data: expSub } = await supabase
      .from('expert_subscriptions')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .single()

    if (expSub?.user_id) {
      const { data: { user: failedUser } } = await supabase.auth.admin.getUserById(expSub.user_id)
      if (failedUser?.email) {
        const { data: userRow } = await supabase.from('users').select('name').eq('id', expSub.user_id).single()
        triggerExpertPaymentFailedSequence({
          email: failedUser.email,
          name: userRow?.name ?? '',
          updatePaymentUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/expert/dashboard`,
        }).catch(() => {})
      }
    }
  }

  return NextResponse.json({ received: true })
}
