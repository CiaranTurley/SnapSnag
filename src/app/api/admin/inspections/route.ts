import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

function isAdmin(req: NextRequest) {
  return req.cookies.get('ss_admin')?.value === '1'
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createSupabaseAdminClient()

  const { data, error } = await supabase
    .from('inspections')
    .select('id, country, address, created_at, paid_at, status, amount_cents, currency, completed_at, verification_code')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ inspections: data ?? [] })
}
