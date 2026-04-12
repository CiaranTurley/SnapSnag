import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { upsertContact } from '@/lib/email'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

function isAdmin(req: NextRequest) {
  return req.cookies.get('ss_admin')?.value === '1'
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action, payload } = await req.json()

  // ── 1. Regenerate PDF ───────────────────────────────────────────────────────
  if (action === 'regen_pdf') {
    const { inspection_id } = payload as { inspection_id: string }
    if (!inspection_id) return NextResponse.json({ error: 'inspection_id required' }, { status: 400 })

    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/generate-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': process.env.CRON_SECRET ?? '',
      },
      body: JSON.stringify({ inspection_id }),
    })

    return NextResponse.json({ ok: res.ok, status: res.status })
  }

  // ── 2. Manual refund ────────────────────────────────────────────────────────
  if (action === 'manual_refund') {
    const { payment_intent_id, amount_cents } = payload as { payment_intent_id: string; amount_cents: number }
    if (!payment_intent_id) return NextResponse.json({ error: 'payment_intent_id required' }, { status: 400 })

    try {
      const refund = await stripe.refunds.create({
        payment_intent: payment_intent_id,
        ...(amount_cents ? { amount: amount_cents } : {}),
      })
      return NextResponse.json({ ok: true, refund_id: refund.id, status: refund.status })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Stripe error'
      return NextResponse.json({ error: msg }, { status: 500 })
    }
  }

  // ── 3. Send test email ──────────────────────────────────────────────────────
  if (action === 'test_email') {
    const { template, to_email } = payload as { template: string; to_email: string }
    if (!template || !to_email) return NextResponse.json({ error: 'template and to_email required' }, { status: 400 })

    // Upsert contact and trigger a test event via Loops
    await upsertContact(to_email, { name: 'Test User', country: 'IE', userId: 'test' })

    const LOOPS_API_KEY = process.env.LOOPS_API_KEY
    if (!LOOPS_API_KEY) return NextResponse.json({ error: 'Loops not configured' }, { status: 503 })

    const { LoopsClient } = await import('loops')
    const loops = new LoopsClient(LOOPS_API_KEY)

    // Map template name to event name
    const EVENT_MAP: Record<string, string> = {
      purchase_completed: 'purchase_completed',
      warranty_reminder:  'warranty_reminder',
      expert_cancelled:   'expert_cancelled',
      payment_failed:     'payment_failed',
    }

    const TRANSACTIONAL_MAP: Record<string, string> = {
      receipt:        process.env.LOOPS_RECEIPT_EMAIL_ID ?? '',
      refund:         process.env.LOOPS_REFUND_EMAIL_ID ?? '',
      data_deletion:  process.env.LOOPS_DATA_DELETION_EMAIL_ID ?? '',
      builder_update: process.env.LOOPS_BUILDER_UPDATE_EMAIL_ID ?? '',
    }

    if (EVENT_MAP[template]) {
      await loops.sendEvent({ email: to_email, eventName: EVENT_MAP[template] })
      return NextResponse.json({ ok: true, sent: 'event', event: EVENT_MAP[template] })
    }

    if (TRANSACTIONAL_MAP[template]) {
      await loops.sendTransactionalEmail({
        transactionalId: TRANSACTIONAL_MAP[template],
        email: to_email,
        dataVariables: {
          name: 'Test User',
          address: '1 Test Street, Dublin',
          inspectionId: 'TEST-ID',
          reportUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/inspect/test/report`,
          amountFormatted: 'EUR19.95',
        },
      })
      return NextResponse.json({ ok: true, sent: 'transactional', template })
    }

    return NextResponse.json({ error: `Unknown template: ${template}` }, { status: 400 })
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
}
