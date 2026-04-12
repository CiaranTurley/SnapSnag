import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

function isAdmin(req: NextRequest) {
  return req.cookies.get('ss_admin')?.value === '1'
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createSupabaseAdminClient()

  const { data, error } = await supabase
    .from('defect_database')
    .select('country, room, severity, property_type, item_description')
    .limit(5000)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = data ?? []

  // Aggregate by country
  const byCountry: Record<string, number> = {}
  const byRoom: Record<string, number> = {}
  const bySeverity: Record<string, number> = {}
  const byPropertyType: Record<string, number> = {}
  const byItem: Record<string, number> = {}

  for (const r of rows) {
    if (r.country)       byCountry[r.country] = (byCountry[r.country] ?? 0) + 1
    if (r.room)          byRoom[r.room] = (byRoom[r.room] ?? 0) + 1
    if (r.severity)      bySeverity[r.severity] = (bySeverity[r.severity] ?? 0) + 1
    if (r.property_type) byPropertyType[r.property_type] = (byPropertyType[r.property_type] ?? 0) + 1
    if (r.item_description) byItem[r.item_description] = (byItem[r.item_description] ?? 0) + 1
  }

  const topItems = Object.entries(byItem)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([item, count]) => ({ item, count }))

  return NextResponse.json({
    total: rows.length,
    byCountry: Object.entries(byCountry).map(([label, value]) => ({ label, value })),
    byRoom: Object.entries(byRoom).sort(([,a],[,b]) => b - a).slice(0, 10).map(([label, value]) => ({ label, value })),
    bySeverity: Object.entries(bySeverity).map(([label, value]) => ({ label, value })),
    byPropertyType: Object.entries(byPropertyType).map(([label, value]) => ({ label, value })),
    topItems,
  })
}
