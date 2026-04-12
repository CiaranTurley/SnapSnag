import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { Resend } from 'resend'

// Thresholds and alert amounts per country (in local currency)
const VAT_CONFIG: Record<string, {
  currency: string
  alertAt: number
  threshold: number
  label: string
  action: string
}> = {
  IE: {
    currency: 'EUR',
    alertAt: 30_000,
    threshold: 37_500,
    label: 'Ireland',
    action: 'Register for VAT with Revenue at revenue.ie. Threshold is €37,500.',
  },
  UK: {
    currency: 'GBP',
    alertAt: 80_000,
    threshold: 90_000,
    label: 'United Kingdom',
    action: 'Register for VAT with HMRC at gov.uk/vat-registration. Threshold is £90,000.',
  },
  AU: {
    currency: 'AUD',
    alertAt: 65_000,
    threshold: 75_000,
    label: 'Australia',
    action: 'Register for GST with the ATO at ato.gov.au. Threshold is AUD $75,000.',
  },
  CA: {
    currency: 'CAD',
    alertAt: 25_000,
    threshold: 30_000,
    label: 'Canada',
    action: 'Register for GST/HST with the CRA at canada.ca. Threshold is CAD $30,000.',
  },
}

// Stripe currency → country mapping
const CURRENCY_TO_COUNTRY: Record<string, string> = {
  eur: 'IE',
  gbp: 'UK',
  aud: 'AU',
  cad: 'CA',
  usd: 'US',
}

// Called on the 1st of every month at 08:00 UTC
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createSupabaseAdminClient()
  const ownerEmail = process.env.OWNER_EMAIL
  if (!ownerEmail) {
    console.warn('[vat-monitor] OWNER_EMAIL not set')
    return NextResponse.json({ error: 'OWNER_EMAIL not set' }, { status: 500 })
  }

  // Fetch all paid inspections in the last 12 months
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1)

  const { data: inspections } = await admin
    .from('inspections')
    .select('amount_cents, currency, paid_at')
    .not('paid_at', 'is', null)
    .gte('paid_at', twelveMonthsAgo.toISOString())

  // Aggregate revenue by country
  const revenueByCountry: Record<string, number> = {}

  for (const insp of inspections ?? []) {
    const country = CURRENCY_TO_COUNTRY[insp.currency?.toLowerCase() ?? '']
    if (!country) continue
    revenueByCountry[country] = (revenueByCountry[country] ?? 0) + (insp.amount_cents ?? 0) / 100
  }

  // Check for alerts
  const alerts: string[] = []

  for (const [country, config] of Object.entries(VAT_CONFIG)) {
    const revenue = revenueByCountry[country] ?? 0
    if (revenue >= config.alertAt) {
      const pct = Math.round((revenue / config.threshold) * 100)
      alerts.push(`
        <tr>
          <td style="padding:12px;border-bottom:1px solid #1C2840;font-weight:600;color:#FF4D4F">${config.label}</td>
          <td style="padding:12px;border-bottom:1px solid #1C2840">${config.currency} ${revenue.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="padding:12px;border-bottom:1px solid #1C2840">${config.currency} ${config.threshold.toLocaleString()}</td>
          <td style="padding:12px;border-bottom:1px solid #1C2840">${pct}%</td>
          <td style="padding:12px;border-bottom:1px solid #1C2840;color:#FFB340">${config.action}</td>
        </tr>
      `)
    }
  }

  if (alerts.length === 0) {
    console.log('[vat-monitor] No VAT threshold alerts this month')
    return NextResponse.json({ alerts: 0 })
  }

  // Send alert email
  const resend = new Resend(process.env.RESEND_API_KEY!)
  const date = new Date().toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' })

  const html = `
    <div style="font-family:sans-serif;max-width:700px;margin:0 auto;background:#0A0F1A;color:#FAFAF8;padding:32px;border-radius:12px">
      <div style="margin-bottom:24px">
        <span style="font-size:22px;font-weight:900">Snap</span><span style="font-size:22px;font-weight:900;color:#00C9A7">Snag</span>
        <span style="font-size:14px;color:#6B7280;margin-left:12px">Financial Alert</span>
      </div>
      <div style="background:#FF4D4F22;border:1px solid #FF4D4F55;border-radius:10px;padding:16px;margin-bottom:24px">
        <p style="color:#FF4D4F;font-weight:700;font-size:16px;margin:0 0 4px">⚠️ ACTION REQUIRED: Approaching VAT Registration Threshold</p>
        <p style="color:#9CA3AF;font-size:13px;margin:0">As of ${date}, SnapSnag is approaching the VAT registration threshold in one or more countries. Review the table below and take action.</p>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        <thead>
          <tr style="background:#111827">
            <th style="padding:12px;text-align:left;color:#6B7280;font-size:12px;text-transform:uppercase">Country</th>
            <th style="padding:12px;text-align:left;color:#6B7280;font-size:12px;text-transform:uppercase">12-Month Revenue</th>
            <th style="padding:12px;text-align:left;color:#6B7280;font-size:12px;text-transform:uppercase">Threshold</th>
            <th style="padding:12px;text-align:left;color:#6B7280;font-size:12px;text-transform:uppercase">%</th>
            <th style="padding:12px;text-align:left;color:#6B7280;font-size:12px;text-transform:uppercase">Action</th>
          </tr>
        </thead>
        <tbody>${alerts.join('')}</tbody>
      </table>
      <p style="color:#6B7280;font-size:12px">This alert was generated automatically by SnapSnag on ${date}. Revenue figures are based on Stripe payments recorded in the database.</p>
    </div>
  `

  await resend.emails.send({
    from: 'SnapSnag Alerts <alerts@snapsnag.ie>',
    to: ownerEmail,
    subject: `ACTION REQUIRED: SnapSnag approaching VAT threshold in ${alerts.length > 1 ? 'multiple countries' : 'one country'}`,
    html,
  })

  console.log(`[vat-monitor] Sent VAT alert for ${alerts.length} country/ies`)
  return NextResponse.json({ alerts: alerts.length })
}
