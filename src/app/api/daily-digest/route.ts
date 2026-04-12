import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { Resend } from 'resend'

// Runs daily at 08:00 UTC (09:00 Irish Standard Time / 08:00 in winter)
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const ownerEmail = process.env.OWNER_EMAIL
  if (!ownerEmail) {
    return NextResponse.json({ error: 'OWNER_EMAIL not set' }, { status: 500 })
  }

  const admin = createSupabaseAdminClient()
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString()

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  // ── Fetch all metrics in parallel ───────────────────────────────────────────
  const [
    signupsYesterday,
    revenueYesterday,
    revenueMonth,
    inspectionsYesterday,
    expertActive,
    expertNewYesterday,
    expertCancelledYesterday,
    ticketsYesterday,
    ticketsResolvedYesterday,
    ticketsEscalated,
  ] = await Promise.all([
    // New signups yesterday
    admin
      .from('users')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', yesterdayStr),

    // Revenue yesterday (all paid inspections)
    admin
      .from('inspections')
      .select('amount_cents, currency')
      .not('paid_at', 'is', null)
      .gte('paid_at', yesterdayStr),

    // Revenue this month
    admin
      .from('inspections')
      .select('amount_cents, currency')
      .not('paid_at', 'is', null)
      .gte('paid_at', startOfMonth),

    // Inspections completed yesterday
    admin
      .from('inspections')
      .select('id', { count: 'exact', head: true })
      .not('paid_at', 'is', null)
      .gte('paid_at', yesterdayStr),

    // Active expert subscriptions
    admin
      .from('expert_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),

    // New expert subscriptions yesterday
    admin
      .from('expert_subscriptions')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', yesterdayStr),

    // Expert cancellations yesterday
    admin
      .from('expert_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'cancelled')
      .gte('updated_at', yesterdayStr),

    // Support tickets yesterday
    admin
      .from('support_tickets')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', yesterdayStr),

    // Support tickets resolved yesterday
    admin
      .from('support_tickets')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'resolved')
      .gte('updated_at', yesterdayStr),

    // Open escalations
    admin
      .from('support_tickets')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'escalated'),
  ])

  // ── Revenue calculations ─────────────────────────────────────────────────────
  // Group by currency and sum
  function sumByCurrency(rows: { amount_cents: number; currency: string }[] | null) {
    const totals: Record<string, number> = {}
    for (const row of rows ?? []) {
      const cur = (row.currency ?? 'eur').toUpperCase()
      totals[cur] = (totals[cur] ?? 0) + (row.amount_cents ?? 0) / 100
    }
    return totals
  }

  function formatRevenue(totals: Record<string, number>): string {
    if (Object.keys(totals).length === 0) return '€0.00'
    return Object.entries(totals)
      .map(([cur, amt]) => {
        const sym = cur === 'EUR' ? '€' : cur === 'GBP' ? '£' : cur === 'AUD' ? 'A$' : cur === 'CAD' ? 'CA$' : '$'
        return `${sym}${amt.toFixed(2)}`
      })
      .join(' + ')
  }

  const revYesterdayTotals = sumByCurrency(revenueYesterday.data as { amount_cents: number; currency: string }[] | null)
  const revMonthTotals = sumByCurrency(revenueMonth.data as { amount_cents: number; currency: string }[] | null)

  // ── Counts ───────────────────────────────────────────────────────────────────
  const counts = {
    signups: signupsYesterday.count ?? 0,
    inspections: inspectionsYesterday.count ?? 0,
    expertActive: expertActive.count ?? 0,
    expertNew: expertNewYesterday.count ?? 0,
    expertCancelled: expertCancelledYesterday.count ?? 0,
    tickets: ticketsYesterday.count ?? 0,
    ticketsResolved: ticketsResolvedYesterday.count ?? 0,
    escalated: ticketsEscalated.count ?? 0,
  }

  // ── Flags ────────────────────────────────────────────────────────────────────
  const flags: string[] = []
  if (counts.escalated > 0) {
    flags.push(`⚠️ <strong>ACTION REQUIRED:</strong> ${counts.escalated} support ticket${counts.escalated === 1 ? '' : 's'} need${counts.escalated === 1 ? 's' : ''} your attention`)
  }

  const flagsHtml = flags.length > 0
    ? flags.map(f => `
        <div style="background:#FF4D4F1A;border:1px solid #FF4D4F44;border-radius:8px;padding:12px 16px;margin-bottom:8px;font-size:14px;color:#FAFAF8">
          ${f}
        </div>`).join('')
    : `<div style="background:#00C9A71A;border:1px solid #00C9A744;border-radius:8px;padding:12px 16px;font-size:14px;color:#9CA3AF">✓ No flags today.</div>`

  // ── Build date string ─────────────────────────────────────────────────────
  const dateLabel = yesterday.toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://snapsnag.ie'

  // ── HTML email ───────────────────────────────────────────────────────────────
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:640px;margin:0 auto;background:#0A0F1A;color:#FAFAF8;border-radius:16px;overflow:hidden">

      <!-- Header -->
      <div style="background:#111827;padding:24px 32px;border-bottom:1px solid #1C2840">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <span style="font-size:20px;font-weight:900">Snap</span><span style="font-size:20px;font-weight:900;color:#00C9A7">Snag</span>
          <span style="font-size:13px;color:#6B7280;margin-left:8px">Daily Digest</span>
        </div>
        <p style="margin:0;color:#6B7280;font-size:13px">${dateLabel}</p>
      </div>

      <div style="padding:32px">

        <!-- Flags -->
        <div style="margin-bottom:28px">
          <p style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6B7280;margin:0 0 10px;font-weight:600">FLAGS</p>
          ${flagsHtml}
        </div>

        <!-- Revenue -->
        <div style="margin-bottom:28px">
          <p style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6B7280;margin:0 0 12px;font-weight:600">REVENUE</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            ${metricCard('Yesterday', formatRevenue(revYesterdayTotals))}
            ${metricCard('This Month', formatRevenue(revMonthTotals))}
          </div>
        </div>

        <!-- Users -->
        <div style="margin-bottom:28px">
          <p style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6B7280;margin:0 0 12px;font-weight:600">USERS</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            ${metricCard('New Signups', String(counts.signups))}
            ${metricCard('Inspections Completed', String(counts.inspections))}
          </div>
        </div>

        <!-- Expert Subscriptions -->
        <div style="margin-bottom:28px">
          <p style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6B7280;margin:0 0 12px;font-weight:600">EXPERT SUBSCRIPTIONS</p>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
            ${metricCard('Active', String(counts.expertActive))}
            ${metricCard('New Yesterday', String(counts.expertNew), '#00D68F')}
            ${metricCard('Cancelled', String(counts.expertCancelled), counts.expertCancelled > 0 ? '#FF4D4F' : undefined)}
          </div>
        </div>

        <!-- Support -->
        <div style="margin-bottom:28px">
          <p style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6B7280;margin:0 0 12px;font-weight:600">SUPPORT</p>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
            ${metricCard('Tickets Yesterday', String(counts.tickets))}
            ${metricCard('Resolved', String(counts.ticketsResolved), '#00D68F')}
            ${metricCard('Open Escalations', String(counts.escalated), counts.escalated > 0 ? '#FF4D4F' : undefined)}
          </div>
        </div>

        <!-- Links -->
        <div style="border-top:1px solid #1C2840;padding-top:20px;display:flex;gap:16px;flex-wrap:wrap">
          <a href="${siteUrl}/admin" style="font-size:13px;color:#00C9A7;text-decoration:none">Admin Dashboard →</a>
          <a href="${siteUrl}/admin/support" style="font-size:13px;color:#6B7280;text-decoration:none">Support Queue →</a>
          <a href="https://dashboard.stripe.com" style="font-size:13px;color:#6B7280;text-decoration:none">Stripe →</a>
          <a href="https://go.xero.com" style="font-size:13px;color:#6B7280;text-decoration:none">Xero →</a>
        </div>

      </div>
    </div>
  `

  const resend = new Resend(process.env.RESEND_API_KEY!)
  await resend.emails.send({
    from: 'SnapSnag <digest@snapsnag.ie>',
    to: ownerEmail,
    subject: `SnapSnag Daily — ${dateLabel}`,
    html,
  })

  return NextResponse.json({ sent: true, flags: flags.length, ...counts })
}

// ── Small helper for metric cards ────────────────────────────────────────────
function metricCard(label: string, value: string, valueColor?: string) {
  return `
    <div style="background:#111827;border:1px solid #1C2840;border-radius:10px;padding:16px">
      <p style="margin:0 0 6px;font-size:11px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px">${label}</p>
      <p style="margin:0;font-size:22px;font-weight:700;color:${valueColor ?? '#FAFAF8'}">${value}</p>
    </div>
  `
}
