import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

function isAdmin(req: NextRequest): boolean {
  return req.cookies.get('ss_admin')?.value === '1'
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status   = searchParams.get('status')
  const category = searchParams.get('category')
  const limit    = parseInt(searchParams.get('limit') ?? '50')

  const supabase = createSupabaseAdminClient()
  let query = supabase
    .from('support_tickets')
    .select('id, user_id, user_email, inspection_id, category, messages, status, owner_note, created_at, updated_at')
    .order('status', { ascending: false }) // escalated first (alphabetically before open/resolved)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status)   query = query.eq('status', status)
  if (category) query = query.eq('category', category)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Sort: escalated first, then open, then resolved
  const order: Record<string, number> = { escalated: 0, open: 1, resolved: 2 }
  const sorted = (data ?? []).sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9))

  return NextResponse.json({ tickets: sorted })
}
