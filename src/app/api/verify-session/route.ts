import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

/**
 * POST /api/verify-session
 *
 * Called from the report page when Stripe redirects back with ?session_id=...
 * and the inspection still shows paid_at = null (webhook may not have fired yet).
 *
 * Verifies the session directly with Stripe and marks the inspection paid
 * if payment_status === 'paid'. This handles the race condition where the
 * user arrives before the webhook fires.
 */
export async function POST(req: NextRequest) {
  try {
    const { sessionId, inspectionId } = await req.json()
    if (!sessionId || !inspectionId) {
      return NextResponse.json({ error: 'Missing sessionId or inspectionId' }, { status: 400 })
    }

    // Ensure the calling user owns this inspection
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const admin = createSupabaseAdminClient()

    const { data: inspection } = await admin
      .from('inspections')
      .select('id, user_id, paid_at, handover_date')
      .eq('id', inspectionId)
      .single()

    if (!inspection || inspection.user_id !== user.id) {
      return NextResponse.json({ error: 'Inspection not found' }, { status: 404 })
    }

    // Already paid — nothing to do
    if (inspection.paid_at) {
      return NextResponse.json({ paid: true })
    }

    // Verify with Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ paid: false })
    }

    // Confirm the session belongs to this inspection
    if (session.metadata?.inspectionId !== inspectionId) {
      return NextResponse.json({ error: 'Session/inspection mismatch' }, { status: 400 })
    }

    // Mark paid
    const warrantyExpiresAt = inspection.handover_date
      ? new Date(new Date(inspection.handover_date).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString()
      : null

    await admin
      .from('inspections')
      .update({
        paid_at: new Date().toISOString(),
        stripe_session_id: session.id,
        ...(warrantyExpiresAt ? { warranty_expires_at: warrantyExpiresAt } : {}),
      })
      .eq('id', inspectionId)

    return NextResponse.json({ paid: true })
  } catch (err) {
    console.error('verify-session error:', err)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
