import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getExpertSubscription } from '@/lib/expertUtils'

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sub = await getExpertSubscription(user.id)
  if (!sub) return NextResponse.json({ error: 'Expert subscription required' }, { status: 403 })

  const { inspection_id } = await req.json() as { inspection_id: string }
  if (!inspection_id) return NextResponse.json({ error: 'inspection_id required' }, { status: 400 })

  const admin = createSupabaseAdminClient()

  // Fetch handover_date to compute warranty expiry
  const { data: inspRow } = await admin
    .from('inspections')
    .select('handover_date')
    .eq('id', inspection_id)
    .single()

  const warrantyExpiresAt = inspRow?.handover_date
    ? new Date(new Date(inspRow.handover_date).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString()
    : null

  const { error } = await admin
    .from('inspections')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      is_expert_inspection: true,
      ...(warrantyExpiresAt ? { warranty_expires_at: warrantyExpiresAt } : {}),
    })
    .eq('id', inspection_id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
