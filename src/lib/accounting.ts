/**
 * Xero accounting integration.
 *
 * Handles OAuth token management (stored in Supabase app_settings),
 * invoice creation for one-time payments and subscriptions,
 * and credit note creation for refunds.
 *
 * Required env vars:
 *   XERO_CLIENT_ID
 *   XERO_CLIENT_SECRET
 *   XERO_REDIRECT_URI   — e.g. https://snapsnag.ie/api/xero/callback
 *
 * One-time setup: visit /api/xero/connect (admin-protected) to authorise.
 */

import { XeroClient, Invoice, LineItem, CreditNote, Contact } from 'xero-node'
import { createSupabaseAdminClient } from '@/lib/supabase-admin'

// ─── Tax type codes per country (configure in your Xero account) ─────────────
// These are the standard Xero tax type strings for each region.
// Verify these match your Xero organisation's tax settings.
const TAX_TYPE: Record<string, string> = {
  IE: 'OUTPUT2',   // Ireland 23% VAT
  UK: 'OUTPUT2',   // UK 20% VAT
  AU: 'OUTPUT',    // Australia 10% GST
  US: 'NONE',      // USA — no transaction-level tax
  CA: 'OUTPUT',    // Canada 5% GST (federal)
}

const TAX_RATE: Record<string, number> = {
  IE: 0.23,
  UK: 0.20,
  AU: 0.10,
  US: 0,
  CA: 0.05,
}

// Sales account code — configure to match your Xero chart of accounts
const ACCOUNT_CODE = process.env.XERO_ACCOUNT_CODE ?? '200'

// ─── Build XeroClient ─────────────────────────────────────────────────────────
function buildXeroClient(): XeroClient {
  return new XeroClient({
    clientId: process.env.XERO_CLIENT_ID!,
    clientSecret: process.env.XERO_CLIENT_SECRET!,
    redirectUris: [process.env.XERO_REDIRECT_URI!],
    scopes: [
      'openid',
      'profile',
      'email',
      'accounting.transactions',
      'accounting.contacts',
      'offline_access',
    ],
  })
}

// ─── Token storage (Supabase app_settings) ───────────────────────────────────

async function getStoredTokens(): Promise<{ tokenSet: Record<string, unknown>; tenantId: string } | null> {
  const admin = createSupabaseAdminClient()
  const { data } = await admin
    .from('app_settings')
    .select('value')
    .eq('key', 'xero_token_set')
    .single()

  const { data: tenantData } = await admin
    .from('app_settings')
    .select('value')
    .eq('key', 'xero_tenant_id')
    .single()

  if (!data?.value || !tenantData?.value) return null

  return {
    tokenSet: typeof data.value === 'string' ? JSON.parse(data.value) : data.value,
    tenantId: tenantData.value as string,
  }
}

async function saveTokens(tokenSet: Record<string, unknown>, tenantId?: string): Promise<void> {
  const admin = createSupabaseAdminClient()
  await admin.from('app_settings').upsert(
    { key: 'xero_token_set', value: JSON.stringify(tokenSet) },
    { onConflict: 'key' }
  )
  if (tenantId) {
    await admin.from('app_settings').upsert(
      { key: 'xero_tenant_id', value: tenantId },
      { onConflict: 'key' }
    )
  }
}

// ─── Get authenticated XeroClient (handles refresh) ──────────────────────────

export async function getXeroClient(): Promise<{ xero: XeroClient; tenantId: string } | null> {
  const stored = await getStoredTokens()
  if (!stored) {
    console.warn('[xero] No stored tokens — visit /api/xero/connect to authorise')
    return null
  }

  const xero = buildXeroClient()
  xero.setTokenSet(stored.tokenSet as Parameters<typeof xero.setTokenSet>[0])

  // Refresh if expired (xero-node handles expiry check)
  try {
    const refreshed = await xero.refreshToken()
    await saveTokens(refreshed as unknown as Record<string, unknown>)
    xero.setTokenSet(refreshed as Parameters<typeof xero.setTokenSet>[0])
  } catch {
    // Token may still be valid — proceed and let the API call fail if not
  }

  return { xero, tenantId: stored.tenantId }
}

// ─── Exported for OAuth callback ─────────────────────────────────────────────

export { buildXeroClient, saveTokens }

// ─── Helper: find or create a Xero contact by email ─────────────────────────

async function findOrCreateContact(
  xero: XeroClient,
  tenantId: string,
  email: string,
  name: string
): Promise<string> {
  // Try to find by email via where clause
  try {
    const existing = await xero.accountingApi.getContacts(
      tenantId,
      undefined,            // ifModifiedSince
      `EmailAddress="${email}"`, // where
    )
    const contacts = existing.body.contacts
    if (contacts && contacts.length > 0 && contacts[0].contactID) {
      return contacts[0].contactID
    }
  } catch {
    // Fall through to create
  }

  const created = await xero.accountingApi.createContacts(tenantId, {
    contacts: [{ name: name || email, emailAddress: email } as Contact],
  })
  return created.body.contacts?.[0]?.contactID ?? ''
}

// ─── Create Xero invoice for an inspection payment ───────────────────────────

export async function createInspectionInvoice(params: {
  customerEmail: string
  customerName: string
  country: string
  amountCents: number
  currency: string
  stripePaymentIntentId: string
  inspectionId: string
}): Promise<string | null> {
  const client = await getXeroClient()
  if (!client) return null

  const { xero, tenantId } = client
  const taxType = TAX_TYPE[params.country] ?? 'NONE'
  const taxRate = TAX_RATE[params.country] ?? 0

  // Amount is already inclusive of tax from Stripe — back-calculate ex-tax amount
  const totalInclTax = params.amountCents / 100
  const netAmount = taxRate > 0 ? totalInclTax / (1 + taxRate) : totalInclTax

  const contactId = await findOrCreateContact(xero, tenantId, params.customerEmail, params.customerName)

  const lineItem: LineItem = {
    description: `SnapSnag Inspection Report — ${params.country}`,
    quantity: 1,
    unitAmount: parseFloat(netAmount.toFixed(2)),
    taxType,
    accountCode: ACCOUNT_CODE,
  }

  const invoice: Invoice = {
    type: Invoice.TypeEnum.ACCREC,
    contact: { contactID: contactId } as Contact,
    lineItems: [lineItem],
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    reference: params.stripePaymentIntentId,
    status: Invoice.StatusEnum.AUTHORISED,
    currencyCode: params.currency as unknown as Invoice['currencyCode'],
  }

  try {
    const result = await xero.accountingApi.createInvoices(tenantId, { invoices: [invoice] })
    const created = result.body.invoices?.[0]
    console.log(`[xero] Invoice created: ${created?.invoiceID} for ${params.customerEmail}`)
    return created?.invoiceID ?? null
  } catch (err) {
    console.error('[xero] Failed to create invoice:', err)
    return null
  }
}

// ─── Create Xero invoice for an expert subscription payment ──────────────────

export async function createSubscriptionInvoice(params: {
  customerEmail: string
  customerName: string
  country: string
  amountCents: number
  currency: string
  stripeInvoiceId: string
  interval: 'month' | 'year'
}): Promise<string | null> {
  const client = await getXeroClient()
  if (!client) return null

  const { xero, tenantId } = client
  const taxType = TAX_TYPE[params.country] ?? 'NONE'
  const taxRate = TAX_RATE[params.country] ?? 0

  const totalInclTax = params.amountCents / 100
  const netAmount = taxRate > 0 ? totalInclTax / (1 + taxRate) : totalInclTax

  const contactId = await findOrCreateContact(xero, tenantId, params.customerEmail, params.customerName)
  const planLabel = params.interval === 'year' ? 'Annual' : 'Monthly'

  const lineItem: LineItem = {
    description: `SnapSnag Expert Subscription — ${planLabel} — ${params.country}`,
    quantity: 1,
    unitAmount: parseFloat(netAmount.toFixed(2)),
    taxType,
    accountCode: ACCOUNT_CODE,
  }

  const invoice: Invoice = {
    type: Invoice.TypeEnum.ACCREC,
    contact: { contactID: contactId } as Contact,
    lineItems: [lineItem],
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    reference: params.stripeInvoiceId,
    status: Invoice.StatusEnum.AUTHORISED,
    currencyCode: params.currency as unknown as Invoice['currencyCode'],
  }

  try {
    const result = await xero.accountingApi.createInvoices(tenantId, { invoices: [invoice] })
    const created = result.body.invoices?.[0]
    console.log(`[xero] Subscription invoice created: ${created?.invoiceID}`)
    return created?.invoiceID ?? null
  } catch (err) {
    console.error('[xero] Failed to create subscription invoice:', err)
    return null
  }
}

// ─── Create Xero credit note for a refund ────────────────────────────────────

export async function createCreditNote(params: {
  customerEmail: string
  customerName: string
  country: string
  amountCents: number
  currency: string
  stripeRefundId: string
  originalInvoiceId?: string
}): Promise<string | null> {
  const client = await getXeroClient()
  if (!client) return null

  const { xero, tenantId } = client
  const taxType = TAX_TYPE[params.country] ?? 'NONE'
  const taxRate = TAX_RATE[params.country] ?? 0

  const totalInclTax = params.amountCents / 100
  const netAmount = taxRate > 0 ? totalInclTax / (1 + taxRate) : totalInclTax

  const contactId = await findOrCreateContact(xero, tenantId, params.customerEmail, params.customerName)

  const creditNote: CreditNote = {
    type: CreditNote.TypeEnum.ACCRECCREDIT,
    contact: { contactID: contactId } as Contact,
    lineItems: [{
      description: `SnapSnag Refund — ${params.country}`,
      quantity: 1,
      unitAmount: parseFloat(netAmount.toFixed(2)),
      taxType,
      accountCode: ACCOUNT_CODE,
    }],
    date: new Date().toISOString().split('T')[0],
    reference: params.stripeRefundId,
    status: CreditNote.StatusEnum.AUTHORISED,
    currencyCode: params.currency as unknown as CreditNote['currencyCode'],
  }

  try {
    const result = await xero.accountingApi.createCreditNotes(tenantId, { creditNotes: [creditNote] })
    const created = result.body.creditNotes?.[0]
    console.log(`[xero] Credit note created: ${created?.creditNoteID}`)
    return created?.creditNoteID ?? null
  } catch (err) {
    console.error('[xero] Failed to create credit note:', err)
    return null
  }
}
