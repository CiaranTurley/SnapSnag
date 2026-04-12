import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

// Called internally after an inspection is marked paid
export async function POST(req: NextRequest) {
  // Verify internal secret — not a public endpoint
  const secret = req.headers.get('x-internal-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { inspection_id } = await req.json() as { inspection_id: string }
  if (!inspection_id) return NextResponse.json({ error: 'inspection_id required' }, { status: 400 })

  const admin = createSupabaseAdminClient()

  const { data: inspection } = await admin
    .from('inspections')
    .select('country, property_type, address')
    .eq('id', inspection_id)
    .single()

  if (!inspection) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: items } = await admin
    .from('checklist_items')
    .select('room, item_description, severity, status')
    .eq('inspection_id', inspection_id)
    .eq('status', 'fail')

  if (!items?.length) return NextResponse.json({ recorded: 0 })

  // Extract region — last part of address before country (rough heuristic)
  const addressParts = (inspection.address ?? '').split(',').map((s: string) => s.trim())
  const region = addressParts.length >= 2 ? addressParts[addressParts.length - 2] : null

  const rows = items.map(item => ({
    country:          inspection.country,
    property_type:    inspection.property_type ?? null,
    region,
    room:             item.room,
    item_description: item.item_description,
    severity:         item.severity ?? null,
  }))

  await admin.from('defect_database').insert(rows)

  return NextResponse.json({ recorded: rows.length })
}
