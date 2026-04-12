import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

function isAdmin(req: NextRequest): boolean {
  return req.cookies.get('ss_admin')?.value === '1'
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = params
  const body = await req.json()
  const allowed = ['status', 'owner_note']
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('support_tickets')
    .update(updates)
    .eq('id', id)
    .select('id, status, owner_note, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ticket: data })
}
