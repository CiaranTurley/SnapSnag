import { NextRequest, NextResponse } from 'next/server'
import { buildXeroClient, saveTokens } from '@/lib/accounting'

// Xero redirects here after OAuth authorisation
// Set XERO_REDIRECT_URI=https://yourdomain.com/api/xero/callback in Xero app settings
export async function GET(req: NextRequest) {
  const url = req.url

  try {
    const xero = buildXeroClient()
    const tokenSet = await xero.apiCallback(url)
    await xero.updateTenants()

    const tenants = xero.tenants
    if (!tenants || tenants.length === 0) {
      return NextResponse.json({ error: 'No Xero tenants found — make sure you have an active Xero organisation' }, { status: 400 })
    }

    const tenantId = tenants[0].tenantId
    await saveTokens(tokenSet as unknown as Record<string, unknown>, tenantId)

    console.log(`[xero] Connected to tenant: ${tenants[0].tenantName} (${tenantId})`)

    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:40px;background:#0A0F1A;color:#FAFAF8">
        <h2 style="color:#00C9A7">Xero connected ✓</h2>
        <p>Organisation: <strong>${tenants[0].tenantName}</strong></p>
        <p>Tenant ID: <code>${tenantId}</code></p>
        <p>Invoices will now be created automatically on every payment.</p>
      </body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  } catch (err) {
    console.error('[xero] OAuth callback error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
