import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

/**
 * Test-only endpoint. Only callable in development mode.
 * Marks an inspection as paid so E2E tests can verify the report page
 * without going through real Stripe checkout.
 */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { inspectionId } = await req.json()
  if (!inspectionId) return NextResponse.json({ error: 'Missing inspectionId' }, { status: 400 })

  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const admin = createSupabaseAdminClient()

  // Verify ownership
  const { data: inspection } = await admin
    .from('inspections')
    .select('id, user_id, handover_date')
    .eq('id', inspectionId)
    .single()

  if (!inspection || inspection.user_id !== user.id) {
    return NextResponse.json({ error: 'Inspection not found' }, { status: 404 })
  }

  const warrantyExpiresAt = inspection.handover_date
    ? new Date(new Date(inspection.handover_date).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString()
    : null

  await admin
    .from('inspections')
    .update({
      paid_at: new Date().toISOString(),
      ...(warrantyExpiresAt ? { warranty_expires_at: warrantyExpiresAt } : {}),
    })
    .eq('id', inspectionId)

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  return NextResponse.json({ url: `${siteUrl}/inspect/${inspectionId}/report` })
}
