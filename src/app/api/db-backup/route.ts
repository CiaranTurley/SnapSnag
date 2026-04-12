import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'
import { Resend } from 'resend'

// Runs every Sunday at 02:00 UTC
// Exports key tables to JSON, stores in Supabase Storage bucket 'backups', keeps last 4 weeks

const TABLES_TO_BACKUP = [
  'users',
  'inspections',
  'checklist_items',
  'expert_subscriptions',
  'gift_cards',
  'support_tickets',
  'defect_database',
  'builder_portal_items',
]

const MAX_BACKUPS = 4

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const ownerEmail = process.env.OWNER_EMAIL
  const admin = createSupabaseAdminClient()
  const timestamp = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  const backupKey = `weekly/backup-${timestamp}.json`

  const backup: Record<string, unknown[]> = {}
  const tableStats: { table: string; rows: number }[] = []
  const errors: string[] = []

  // Export each table
  for (const table of TABLES_TO_BACKUP) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (admin.from(table) as any).select('*')
      if (error) {
        errors.push(`${table}: ${error.message}`)
        backup[table] = []
      } else {
        backup[table] = data ?? []
        tableStats.push({ table, rows: (data ?? []).length })
      }
    } catch (err) {
      errors.push(`${table}: ${String(err)}`)
      backup[table] = []
    }
  }

  const backupJson = JSON.stringify({
    exported_at: new Date().toISOString(),
    tables: backup,
  })

  // Upload to Supabase Storage
  const { error: uploadError } = await admin.storage
    .from('backups')
    .upload(backupKey, backupJson, {
      contentType: 'application/json',
      upsert: true,
    })

  if (uploadError) {
    console.error('[db-backup] Upload failed:', uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // Prune old backups — keep only MAX_BACKUPS most recent
  const { data: files } = await admin.storage.from('backups').list('weekly', {
    sortBy: { column: 'name', order: 'desc' },
  })

  if (files && files.length > MAX_BACKUPS) {
    const toDelete = files.slice(MAX_BACKUPS).map(f => `weekly/${f.name}`)
    await admin.storage.from('backups').remove(toDelete)
    console.log(`[db-backup] Pruned ${toDelete.length} old backup(s)`)
  }

  // Build confirmation email
  const totalRows = tableStats.reduce((sum, t) => sum + t.rows, 0)
  const fileSizeKb = Math.round(Buffer.byteLength(backupJson, 'utf8') / 1024)
  const dateLabel = new Date().toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  if (ownerEmail) {
    const resend = new Resend(process.env.RESEND_API_KEY!)
    await resend.emails.send({
      from: 'SnapSnag <digest@snapsnag.ie>',
      to: ownerEmail,
      subject: `SnapSnag Backup Complete — ${dateLabel}`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;background:#0A0F1A;color:#FAFAF8;border-radius:16px;overflow:hidden">
          <div style="background:#111827;padding:24px 32px;border-bottom:1px solid #1C2840">
            <span style="font-size:20px;font-weight:900">Snap</span><span style="font-size:20px;font-weight:900;color:#00C9A7">Snag</span>
            <span style="font-size:13px;color:#6B7280;margin-left:8px">Weekly Backup</span>
          </div>
          <div style="padding:32px">
            <div style="background:#00C9A71A;border:1px solid #00C9A744;border-radius:10px;padding:16px;margin-bottom:24px">
              <p style="margin:0;font-size:15px;font-weight:600;color:#00C9A7">✓ Backup completed successfully</p>
              <p style="margin:4px 0 0;font-size:13px;color:#9CA3AF">${dateLabel}</p>
            </div>
            <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
              <tr style="border-bottom:1px solid #1C2840">
                <td style="padding:10px 0;color:#6B7280;font-size:13px">File</td>
                <td style="padding:10px 0;font-size:13px;text-align:right">${backupKey}</td>
              </tr>
              <tr style="border-bottom:1px solid #1C2840">
                <td style="padding:10px 0;color:#6B7280;font-size:13px">Size</td>
                <td style="padding:10px 0;font-size:13px;text-align:right">${fileSizeKb} KB</td>
              </tr>
              <tr style="border-bottom:1px solid #1C2840">
                <td style="padding:10px 0;color:#6B7280;font-size:13px">Total rows exported</td>
                <td style="padding:10px 0;font-size:13px;text-align:right">${totalRows.toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;color:#6B7280;font-size:13px">Tables backed up</td>
                <td style="padding:10px 0;font-size:13px;text-align:right">${TABLES_TO_BACKUP.length}</td>
              </tr>
            </table>
            <p style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6B7280;margin:0 0 10px;font-weight:600">TABLE BREAKDOWN</p>
            ${tableStats.map(t => `
              <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #111827">
                <span style="font-size:13px;color:#9CA3AF">${t.table}</span>
                <span style="font-size:13px;font-weight:600">${t.rows.toLocaleString()} rows</span>
              </div>
            `).join('')}
            ${errors.length > 0 ? `
              <div style="background:#FF4D4F1A;border:1px solid #FF4D4F44;border-radius:8px;padding:12px 16px;margin-top:20px">
                <p style="color:#FF4D4F;font-weight:600;margin:0 0 4px;font-size:13px">⚠️ Errors during backup:</p>
                ${errors.map(e => `<p style="margin:0;font-size:12px;color:#9CA3AF">${e}</p>`).join('')}
              </div>
            ` : ''}
          </div>
        </div>
      `,
    })
  }

  console.log(`[db-backup] Backup complete: ${backupKey} (${fileSizeKb} KB, ${totalRows} rows)`)
  return NextResponse.json({ success: true, file: backupKey, sizekb: fileSizeKb, totalRows, errors })
}
