import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    outstanding: 'Outstanding',
    in_progress: 'In Progress',
    fixed: 'Fixed',
    disputed: 'Disputed',
  }
  return map[status] ?? status
}

function statusEmoji(status: string): string {
  const map: Record<string, string> = {
    outstanding: '🔴',
    in_progress: '🟡',
    fixed: '✅',
    disputed: '⚪',
  }
  return map[status] ?? '⚪'
}

export async function POST(req: NextRequest) {
  try {
    const {
      buyerEmail,
      address,
      itemDescription,
      room,
      previousStatus,
      newStatus,
      builderNote,
    } = await req.json()

    if (!buyerEmail || !itemDescription || !newStatus) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const subject = `Builder has updated an item on your SnapSnag report`

    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0D0F1A; color: #ffffff; padding: 32px; border-radius: 12px;">
        <div style="margin-bottom: 24px;">
          <span style="font-size: 24px; font-weight: 900; color: #ffffff;">Snap</span>
          <span style="font-size: 24px; font-weight: 900; color: #00C9A7;">Snag</span>
        </div>

        <h2 style="color: #ffffff; font-size: 20px; margin-bottom: 8px;">Builder update for ${address}</h2>
        <p style="color: #9CA3AF; font-size: 14px; margin-bottom: 24px;">
          Your builder has updated the status of an item on your inspection report.
        </p>

        <div style="background: #1A1D2E; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 20px; margin-bottom: 24px;">
          <p style="color: #6B7280; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px;">Item</p>
          <p style="color: #ffffff; font-size: 15px; font-weight: 600; margin: 0 0 4px;">${itemDescription}</p>
          <p style="color: #6B7280; font-size: 13px; margin: 0 0 16px;">${room}</p>

          <div style="display: flex; gap: 12px; align-items: center;">
            <div style="text-align: center;">
              <p style="color: #6B7280; font-size: 11px; margin: 0 0 4px;">Previously</p>
              <p style="color: #ffffff; font-size: 13px; margin: 0;">${statusEmoji(previousStatus)} ${statusLabel(previousStatus)}</p>
            </div>
            <div style="color: #6B7280; font-size: 18px;">→</div>
            <div style="text-align: center;">
              <p style="color: #6B7280; font-size: 11px; margin: 0 0 4px;">Now</p>
              <p style="color: ${newStatus === 'fixed' ? '#22C55E' : newStatus === 'in_progress' ? '#F59E0B' : '#ffffff'}; font-size: 13px; font-weight: 700; margin: 0;">
                ${statusEmoji(newStatus)} ${statusLabel(newStatus)}
              </p>
            </div>
          </div>

          ${builderNote ? `
          <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1);">
            <p style="color: #6B7280; font-size: 11px; margin: 0 0 4px;">Builder note:</p>
            <p style="color: #D1D5DB; font-size: 13px; margin: 0;">${builderNote}</p>
          </div>
          ` : ''}
        </div>

        ${newStatus === 'fixed' ? `
        <div style="background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.3); border-radius: 10px; padding: 16px; margin-bottom: 24px;">
          <p style="color: #22C55E; font-size: 14px; font-weight: 600; margin: 0 0 4px;">Builder says this is fixed</p>
          <p style="color: #9CA3AF; font-size: 13px; margin: 0;">Log in to your SnapSnag report to accept or reject this update.</p>
        </div>
        ` : ''}

        <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://snapsnag.ie'}/dashboard"
           style="display: block; background: #00C9A7; color: #0D0F1A; text-decoration: none; text-align: center; padding: 14px 24px; border-radius: 10px; font-weight: 700; font-size: 15px; margin-bottom: 24px;">
          View your report →
        </a>

        <p style="color: #4B5563; font-size: 12px; text-align: center;">
          This notification was sent by SnapSnag on behalf of your builder.
          <br />SnapSnag Ltd · snapsnag.ie
        </p>
      </div>
    `

    // ── Send email ─────────────────────────────────────────────────────────────
    if (resend) {
      const { error } = await resend.emails.send({
        from: 'SnapSnag <noreply@snapsnag.ie>',
        to: buyerEmail,
        subject,
        html: htmlBody,
      })
      if (error) console.error('[notify-buyer] Resend error:', error)
    } else {
      console.log('[notify-buyer] No RESEND_API_KEY — would send to:', buyerEmail, '|', previousStatus, '→', newStatus)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Notify buyer error:', err)
    // Non-fatal — don't fail the builder update if email fails
    return NextResponse.json({ success: true, warning: 'Email notification failed' })
  }
}
