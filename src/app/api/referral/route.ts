import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

// GET /api/referral — get current user's referral code + credit balance
export async function GET() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createSupabaseAdminClient()
  const { data } = await admin
    .from('users')
    .select('referral_code, credit_balance')
    .eq('id', user.id)
    .single()

  return NextResponse.json({
    referralCode: data?.referral_code ?? null,
    creditBalance: data?.credit_balance ?? 0,
  })
}

// POST /api/referral/claim — store referral code from localStorage against account
export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { referralCode } = await req.json() as { referralCode: string }
  if (!referralCode) return NextResponse.json({ error: 'referralCode required' }, { status: 400 })

  const admin = createSupabaseAdminClient()

  // Check user doesn't already have a referred_by set
  const { data: me } = await admin
    .from('users')
    .select('referred_by, first_paid_done')
    .eq('id', user.id)
    .single()

  if (me?.referred_by) return NextResponse.json({ ok: true, message: 'Already referred' })
  if (me?.first_paid_done) return NextResponse.json({ error: 'Too late — already completed first payment' }, { status: 400 })

  // Ensure referrer exists and is not the same user
  const { data: referrer } = await admin
    .from('users')
    .select('id')
    .eq('referral_code', referralCode.toUpperCase())
    .neq('id', user.id)
    .single()

  if (!referrer) return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 })

  await admin.from('users').update({ referred_by: referralCode.toUpperCase() }).eq('id', user.id)

  return NextResponse.json({ ok: true })
}
