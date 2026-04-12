import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { COUNTRY_CONFIG } from '@/lib/countryConfig'
import { ReportDocument } from '@/lib/pdf/ReportDocument'
import { getExpertSubscription } from '@/lib/expertUtils'
import type { CountryCode } from '@/lib/countryConfig'

export async function POST(req: NextRequest) {
  try {
    const { inspectionId } = await req.json()

    if (!inspectionId) {
      return NextResponse.json({ error: 'Missing inspectionId' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createSupabaseServerClient() as any

    // Check auth
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    // Fetch inspection
    const { data: inspection, error: inspError } = await supabase
      .from('inspections')
      .select('*')
      .eq('id', inspectionId)
      .eq('user_id', user.id)
      .single()

    if (inspError || !inspection) {
      return NextResponse.json({ error: 'Inspection not found' }, { status: 404 })
    }

    // Fetch all checklist items
    const { data: items, error: itemsError } = await supabase
      .from('checklist_items')
      .select('*')
      .eq('inspection_id', inspectionId)
      .order('room_order', { ascending: true })
      .order('item_order', { ascending: true })

    if (itemsError) {
      return NextResponse.json({ error: 'Failed to fetch checklist items' }, { status: 500 })
    }

    // Get country config
    const countryCode = (inspection.country as CountryCode) ?? 'IE'
    const cfg = COUNTRY_CONFIG[countryCode] ?? COUNTRY_CONFIG['IE']

    // Check for expert branding
    const expertSub = await getExpertSubscription(user.id)
    const companyBranding = expertSub ? {
      companyName:    expertSub.company_name,
      companyLogoUrl: expertSub.company_logo_url ?? undefined,
      contactEmail:   expertSub.contact_email,
      phone:          expertSub.phone ?? undefined,
      website:        expertSub.website ?? undefined,
    } : undefined

    // Build the PDF
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc = createElement(ReportDocument as any, {
      inspection,
      items: items ?? [],
      warrantyName: cfg.warrantyName,
      energyCertName: cfg.energyCertName,
      companyBranding,
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(doc as any)

    // Mark inspection as report_generated
    await supabase
      .from('inspections')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', inspectionId)

    const filename = `SnapSnag-Report-${inspection.verification_code ?? inspectionId.slice(0, 8)}.pdf`

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch (err) {
    console.error('PDF generation error:', err)
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
  }
}
