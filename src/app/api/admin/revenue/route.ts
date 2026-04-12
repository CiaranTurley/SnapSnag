import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

function isAdmin(req: NextRequest) {
  return req.cookies.get('ss_admin')?.value === '1'
}

const COUNTRY_CURRENCIES: Record<string, string> = {
  IE: 'EUR', UK: 'GBP', AU: 'AUD', US: 'USD', CA: 'CAD',
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createSupabaseAdminClient()

  const since = new Date()
  since.setDate(since.getDate() - 30)
  since.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('inspections')
    .select('paid_at, amount_cents, country, currency')
    .gte('paid_at', since.toISOString())
    .not('paid_at', 'is', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Build day × country matrix
  const days: Record<string, Record<string, number>> = {}
  const countries = ['IE', 'UK', 'AU', 'US', 'CA']

  // Pre-fill all 30 days
  for (let i = 0; i < 30; i++) {
    const d = new Date(since)
    d.setDate(d.getDate() + i)
    const key = d.toISOString().split('T')[0]
    days[key] = { IE: 0, UK: 0, AU: 0, US: 0, CA: 0 }
  }

  for (const row of data ?? []) {
    const day = (row.paid_at as string).split('T')[0]
    const country = row.country ?? 'IE'
    if (days[day] && countries.includes(country)) {
      days[day][country] += (row.amount_cents ?? 0) / 100
    }
  }

  // Convert to array sorted by date
  const series = Object.entries(days)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({ date, ...vals }))

  return NextResponse.json({ series, countries })
}
