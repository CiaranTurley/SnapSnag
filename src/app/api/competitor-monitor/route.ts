import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { Resend } from 'resend'

// Runs every Monday at 08:00 UTC (alongside social scheduler)
// Required env vars: GOOGLE_API_KEY, GOOGLE_CSE_ID, OWNER_EMAIL

const SEARCH_QUERIES = [
  'snagging app homebuyer',
  'snag list app Ireland',
  'new build inspection app',
  'snagging app UK homebuyer',
  'Snaggit app',
  'new build snag list app',
  'property snagging software',
]

interface SearchResult {
  title: string
  link: string
  snippet: string
  query: string
}

async function googleSearch(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.GOOGLE_API_KEY
  const cx = process.env.GOOGLE_CSE_ID
  if (!apiKey || !cx) return []

  const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=5`

  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const data = await res.json()
    return (data.items ?? []).map((item: { title: string; link: string; snippet: string }) => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
      query,
    }))
  } catch {
    return []
  }
}

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

  // Run all searches in parallel
  const results = (await Promise.all(SEARCH_QUERIES.map(googleSearch))).flat()

  // Load previous week's results from Supabase app_settings
  const { data: prevData } = await admin
    .from('app_settings')
    .select('value')
    .eq('key', 'competitor_results_last_week')
    .single()

  const prevResults: SearchResult[] = prevData?.value
    ? (typeof prevData.value === 'string' ? JSON.parse(prevData.value) : prevData.value) as SearchResult[]
    : []

  const prevLinks = new Set(prevResults.map(r => r.link))

  // Identify new results (not seen last week)
  const newResults = results.filter(r => !prevLinks.has(r.link))
  const returningResults = results.filter(r => prevLinks.has(r.link))

  // Save current results for next week
  await admin.from('app_settings').upsert(
    { key: 'competitor_results_last_week', value: JSON.stringify(results) },
    { onConflict: 'key' }
  )

  // Build email
  const dateLabel = new Date().toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' })

  function resultRow(r: SearchResult, isNew: boolean) {
    return `
      <tr style="border-bottom:1px solid #1C2840">
        <td style="padding:12px 8px;vertical-align:top">
          ${isNew ? '<span style="background:#00C9A722;color:#00C9A7;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;text-transform:uppercase;margin-right:6px">NEW</span>' : ''}
          <a href="${r.link}" style="color:#00C9A7;font-size:13px;font-weight:600;text-decoration:none">${r.title}</a>
          <p style="margin:4px 0 0;font-size:12px;color:#6B7280;word-break:break-all">${r.link}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#9CA3AF">${r.snippet}</p>
        </td>
        <td style="padding:12px 8px;vertical-align:top;white-space:nowrap">
          <span style="font-size:11px;color:#6B7280;background:#111827;padding:3px 8px;border-radius:4px">${r.query}</span>
        </td>
      </tr>
    `
  }

  const newRowsHtml = newResults.length > 0
    ? newResults.map(r => resultRow(r, true)).join('')
    : `<tr><td colspan="2" style="padding:16px;color:#6B7280;font-size:13px">No new results this week.</td></tr>`

  const allRowsHtml = returningResults.map(r => resultRow(r, false)).join('')

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:700px;margin:0 auto;background:#0A0F1A;color:#FAFAF8;border-radius:16px;overflow:hidden">
      <div style="background:#111827;padding:24px 32px;border-bottom:1px solid #1C2840">
        <div style="margin-bottom:4px">
          <span style="font-size:20px;font-weight:900">Snap</span><span style="font-size:20px;font-weight:900;color:#00C9A7">Snag</span>
          <span style="font-size:13px;color:#6B7280;margin-left:8px">Weekly Competitor Monitor</span>
        </div>
        <p style="margin:0;color:#6B7280;font-size:13px">${dateLabel} · ${results.length} results across ${SEARCH_QUERIES.length} queries</p>
      </div>

      <div style="padding:32px">

        <!-- New results this week -->
        <div style="margin-bottom:32px">
          <p style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6B7280;margin:0 0 12px;font-weight:600">
            NEW THIS WEEK
            <span style="background:#00C9A722;color:#00C9A7;font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;margin-left:8px">${newResults.length}</span>
          </p>
          <table style="width:100%;border-collapse:collapse">
            ${newRowsHtml}
          </table>
        </div>

        <!-- All results -->
        ${returningResults.length > 0 ? `
        <div>
          <p style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6B7280;margin:0 0 12px;font-weight:600">ALL RESULTS THIS WEEK</p>
          <table style="width:100%;border-collapse:collapse">
            ${allRowsHtml}
          </table>
        </div>
        ` : ''}

        <div style="border-top:1px solid #1C2840;padding-top:20px;margin-top:24px">
          <p style="font-size:12px;color:#4B5563;margin:0">Queries searched: ${SEARCH_QUERIES.map(q => `"${q}"`).join(', ')}</p>
        </div>
      </div>
    </div>
  `

  const resend = new Resend(process.env.RESEND_API_KEY!)
  await resend.emails.send({
    from: 'SnapSnag <digest@snapsnag.ie>',
    to: ownerEmail,
    subject: `SnapSnag Weekly — Competitor Monitor (${newResults.length} new result${newResults.length === 1 ? '' : 's'})`,
    html,
  })

  return NextResponse.json({ sent: true, total: results.length, new: newResults.length })
}
