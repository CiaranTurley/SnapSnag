import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { getExpertSubscription } from '@/lib/expertUtils'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import JSZip from 'jszip'

// Dynamic import to avoid bundler issues with @react-pdf/renderer
async function getReportDocument() {
  const mod = await import('@/lib/pdf/ReportDocument')
  return mod.ReportDocument
}

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sub = await getExpertSubscription(user.id)
  if (!sub) return NextResponse.json({ error: 'Expert subscription required' }, { status: 403 })

  const { inspection_ids } = await req.json() as { inspection_ids: string[] }
  if (!inspection_ids?.length) return NextResponse.json({ error: 'inspection_ids required' }, { status: 400 })
  if (inspection_ids.length > 50) return NextResponse.json({ error: 'Maximum 50 reports per export' }, { status: 400 })

  const admin = createSupabaseAdminClient()

  // Fetch all inspections (must belong to this user)
  const { data: inspections } = await admin
    .from('inspections')
    .select('*')
    .in('id', inspection_ids)
    .eq('user_id', user.id)
    .in('status', ['completed', 'paid'])

  if (!inspections?.length) return NextResponse.json({ error: 'No completed inspections found' }, { status: 404 })

  const ReportDocument = await getReportDocument()
  const zip = new JSZip()

  const companyBranding = {
    companyName:    sub.company_name,
    companyLogoUrl: sub.company_logo_url ?? undefined,
    contactEmail:   sub.contact_email,
    phone:          sub.phone ?? undefined,
    website:        sub.website ?? undefined,
  }

  for (const inspection of inspections) {
    const { data: items } = await admin
      .from('checklist_items')
      .select('*')
      .eq('inspection_id', inspection.id)
      .order('room_name')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await (renderToBuffer as any)(
      createElement(ReportDocument, {
        inspection,
        items: items ?? [],
        warrantyName:    inspection.country === 'IE' ? 'HomeBond' :
                         inspection.country === 'UK' ? 'NHBC Buildmark' :
                         inspection.country === 'AU' ? 'Statutory Warranty' :
                         'Builder Warranty',
        energyCertName:  inspection.country === 'IE' ? 'BER' :
                         inspection.country === 'UK' ? 'EPC' :
                         inspection.country === 'AU' ? 'NatHERS' :
                         'Energy Rating',
        companyBranding,
      })
    )

    const safeName = (inspection.property_address ?? inspection.id)
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .slice(0, 60)

    zip.file(`${safeName}.pdf`, pdfBuffer)
  }

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })

  return new NextResponse(new Uint8Array(zipBuffer), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="snapsnag-reports-${Date.now()}.zip"`,
    },
  })
}
