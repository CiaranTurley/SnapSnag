import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { COUNTRY_CONFIG } from '@/lib/countryConfig'
import { generateExcelReport } from '@/lib/excel/generateExcelReport'
import type { CountryCode } from '@/lib/countryConfig'

export async function POST(req: NextRequest) {
  try {
    const { inspectionId } = await req.json()

    if (!inspectionId) {
      return NextResponse.json({ error: 'Missing inspectionId' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createSupabaseServerClient() as any

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const { data: inspection, error: inspError } = await supabase
      .from('inspections')
      .select('*')
      .eq('id', inspectionId)
      .eq('user_id', user.id)
      .single()

    if (inspError || !inspection) {
      return NextResponse.json({ error: 'Inspection not found' }, { status: 404 })
    }

    const { data: items, error: itemsError } = await supabase
      .from('checklist_items')
      .select('*')
      .eq('inspection_id', inspectionId)
      .order('room_order', { ascending: true })
      .order('item_order', { ascending: true })

    if (itemsError) {
      return NextResponse.json({ error: 'Failed to fetch checklist items' }, { status: 500 })
    }

    const countryCode = (inspection.country as CountryCode) ?? 'IE'
    const cfg = COUNTRY_CONFIG[countryCode] ?? COUNTRY_CONFIG['IE']

    const buffer = generateExcelReport(inspection, items ?? [], cfg.warrantyName)

    const filename = `SnapSnag-Report-${inspection.verification_code ?? inspectionId.slice(0, 8)}.xlsx`

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch (err) {
    console.error('Excel generation error:', err)
    return NextResponse.json({ error: 'Excel generation failed' }, { status: 500 })
  }
}
