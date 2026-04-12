import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

function isAdmin(req: NextRequest) {
  return req.cookies.get('ss_admin')?.value === '1'
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createSupabaseAdminClient()

  const { data: subs, error } = await supabase
    .from('expert_subscriptions')
    .select('id, user_id, company_name, status, stripe_price_id, created_at, current_period_end')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Get total revenue per expert from inspections
  const userIds = (subs ?? []).map(s => s.user_id)
  const revenueMap: Record<string, number> = {}

  if (userIds.length > 0) {
    const { data: inspRevenue } = await supabase
      .from('inspections')
      .select('user_id, amount_cents')
      .in('user_id', userIds)
      .not('paid_at', 'is', null)

    for (const row of inspRevenue ?? []) {
      if (row.user_id) {
        revenueMap[row.user_id] = (revenueMap[row.user_id] ?? 0) + (row.amount_cents ?? 0)
      }
    }
  }

  // Get user emails
  const emailMap: Record<string, string> = {}
  for (const userId of userIds) {
    const { data: { user } } = await supabase.auth.admin.getUserById(userId)
    if (user?.email) emailMap[userId] = user.email
  }

  const result = (subs ?? []).map(s => ({
    ...s,
    email: emailMap[s.user_id] ?? '',
    revenue_cents: revenueMap[s.user_id] ?? 0,
    plan: s.stripe_price_id === process.env.STRIPE_EXPERT_ANNUAL_PRICE_ID ? 'Annual' : 'Monthly',
  }))

  return NextResponse.json({ experts: result })
}
