import { NextRequest, NextResponse } from 'next/server'
import { buildXeroClient } from '@/lib/accounting'

// Admin-only: initiate Xero OAuth2 connection
// Visit /api/xero/connect?admin_key=[ADMIN_PASSWORD] to start the flow
export async function GET(req: NextRequest) {
  const adminKey = req.nextUrl.searchParams.get('admin_key')
  if (adminKey !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.XERO_CLIENT_ID || !process.env.XERO_CLIENT_SECRET || !process.env.XERO_REDIRECT_URI) {
    return NextResponse.json(
      { error: 'XERO_CLIENT_ID, XERO_CLIENT_SECRET, and XERO_REDIRECT_URI must be set' },
      { status: 500 }
    )
  }

  const xero = buildXeroClient()
  const consentUrl = await xero.buildConsentUrl()
  return NextResponse.redirect(consentUrl)
}
