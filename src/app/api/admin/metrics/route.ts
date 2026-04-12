import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

function isAdmin(req: NextRequest) {
  return req.cookies.get('ss_admin')?.value === '1'
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createSupabaseAdminClient()
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayISO = todayStart.toISOString()

  const [inspToday, revenueToday, expertSubs, openTickets] = await Promise.all([
    // Inspections created today
    supabase
      .from('inspections')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayISO),

    // Revenue today (paid inspections)
    supabase
      .from('inspections')
      .select('amount_cents, currency')
      .gte('paid_at', todayISO)
      .not('paid_at', 'is', null),

    // Active expert subscribers
    supabase
      .from('expert_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),

    // Open + escalated support tickets
    supabase
      .from('support_tickets')
      .select('id', { count: 'exact', head: true })
      .in('status', ['open', 'escalated']),
  ])

  // Sum revenue in EUR (convert other currencies approximately)
  const RATES: Record<string, number> = { EUR: 1, GBP: 1.17, AUD: 0.59, USD: 0.93, CAD: 0.68 }
  const revenueEUR = (revenueToday.data ?? []).reduce((sum, row) => {
    const rate = RATES[row.currency?.toUpperCase() ?? 'EUR'] ?? 1
    return sum + (row.amount_cents ?? 0) / 100 * rate
  }, 0)

  return NextResponse.json({
    inspectionsToday: inspToday.count ?? 0,
    revenueToday: Math.round(revenueEUR * 100) / 100,
    activeExperts: expertSubs.count ?? 0,
    openTickets: openTickets.count ?? 0,
  })
}
