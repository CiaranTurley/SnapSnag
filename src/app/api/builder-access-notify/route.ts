import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function POST(req: NextRequest) {
  try {
    const { verificationCode } = await req.json()
    if (!verificationCode) return NextResponse.json({ error: 'Missing verificationCode' }, { status: 400 })

    const admin = createSupabaseAdminClient()

    // Look up inspection and owner email
    const { data: inspection } = await admin
      .from('inspections')
      .select('id, property_address_line1, property_city, user_id, completed_at')
      .eq('verification_code', verificationCode)
      .single()

    if (!inspection) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: { user } } = await admin.auth.admin.getUserById(inspection.user_id)
    if (!user?.email) return NextResponse.json({ ok: true })

    const address = [inspection.property_address_line1, inspection.property_city].filter(Boolean).join(', ') || 'your property'

    await resend?.emails.send({
      from: 'SnapSnag <hello@snapsnagapp.com>',
      to: user.email,
      subject: 'Your builder has accessed the SnapSnag report',
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #111827;">
          <img src="https://snapsnagapp.com/icon-192.png" width="48" height="48" style="border-radius: 12px; margin-bottom: 24px;" />
          <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 8px;">Your builder has opened your report</h1>
          <p style="color: #6B7280; margin: 0 0 24px;">Someone just accessed the SnapSnag builder portal for <strong>${address}</strong>.</p>
          <p style="color: #6B7280; margin: 0 0 24px;">They can now view all failed items and update their status. You'll receive another notification when they mark items as fixed or respond to a defect.</p>
          <p style="color: #6B7280; margin: 0 0 4px; font-size: 13px;">Verification code: <strong>${verificationCode}</strong></p>
          <p style="color: #9CA3AF; font-size: 12px; margin: 32px 0 0;">SnapSnag · snapsnagapp.com</p>
        </div>
      `,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[builder-access-notify]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
