import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

function isAdmin(req: NextRequest) {
  return req.cookies.get('ss_admin')?.value === '1'
}

function randomCode(len = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('gift_cards')
    .select('id, code, amount_cents, currency, purchased_by_email, redeemed_by, redeemed_at, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ gift_cards: data ?? [] })
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { currency, amount_cents, quantity } = await req.json()

  if (!currency || !amount_cents || !quantity) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  if (quantity > 100) {
    return NextResponse.json({ error: 'Max 100 codes per batch' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient()

  // Generate unique codes
  const codes: string[] = []
  let attempts = 0
  while (codes.length < quantity && attempts < quantity * 3) {
    attempts++
    const code = randomCode(8)
    if (!codes.includes(code)) codes.push(code)
  }

  const rows = codes.map(code => ({
    code,
    amount_cents,
    currency,
  }))

  const { data, error } = await supabase
    .from('gift_cards')
    .insert(rows)
    .select('code, amount_cents, currency')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ gift_cards: data ?? [] })
}
