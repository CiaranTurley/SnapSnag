import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { triggerWarrantyReminder } from '@/lib/email'

// Called daily at 09:00 by Vercel Cron (see vercel.json)
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createSupabaseAdminClient()
  const today = new Date()

  // Find inspections where warranty expires in exactly 30 days (± 12 hours window)
  const targetStart = new Date(today)
  targetStart.setDate(targetStart.getDate() + 29)
  targetStart.setHours(12, 0, 0, 0)

  const targetEnd = new Date(today)
  targetEnd.setDate(targetEnd.getDate() + 31)
  targetEnd.setHours(12, 0, 0, 0)

  const { data: inspections, error } = await admin
    .from('inspections')
    .select('id, address, user_id, warranty_expires_at, verification_code')
    .eq('warranty_reminder_sent', false)
    .gte('warranty_expires_at', targetStart.toISOString())
    .lte('warranty_expires_at', targetEnd.toISOString())
    .in('status', ['paid', 'completed'])

  if (error) {
    console.error('Warranty reminder fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!inspections?.length) {
    return NextResponse.json({ sent: 0, message: 'No reminders due today' })
  }

  let sent = 0

  for (const inspection of inspections) {
    const { data: { user } } = await admin.auth.admin.getUserById(inspection.user_id)
    if (!user?.email) continue

    const { data: userRow } = await admin.from('users').select('name').eq('id', inspection.user_id).single()

    const expiryDateFormatted = new Date(inspection.warranty_expires_at).toLocaleDateString('en-IE', {
      day: 'numeric', month: 'long', year: 'numeric',
    })

    const reportUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/inspect/${inspection.id}/report`

    try {
      await triggerWarrantyReminder({
        email: user.email,
        name: userRow?.name ?? '',
        address: inspection.address ?? 'Your property',
        expiryDateFormatted,
        reportUrl,
        verificationCode: inspection.verification_code ?? '—',
      })

      await admin
        .from('inspections')
        .update({ warranty_reminder_sent: true })
        .eq('id', inspection.id)

      sent++
    } catch (err) {
      console.error(`Failed to send warranty reminder for inspection ${inspection.id}:`, err)
    }
  }

  return NextResponse.json({ sent, total: inspections.length })
}
