import { Page, expect } from '@playwright/test'

// ─── Country configs ──────────────────────────────────────────────────────────

export type Country = 'IE' | 'UK' | 'AU' | 'US' | 'CA'

export const COUNTRY_PRICES: Record<Country, string> = {
  IE: 'EUR19.95',
  UK: 'GBP23.95',  // displayed as GBP23.95
  AU: '$39.95',
  US: '$29.95',
  CA: '$34.95',
}

export const COUNTRY_TERMINOLOGY: Record<Country, { sockets: string; warranty: string }> = {
  IE: { sockets: 'socket', warranty: 'HomeBond' },
  UK: { sockets: 'socket', warranty: 'NHBC' },
  AU: { sockets: 'powerpoint', warranty: 'HBC' },
  US: { sockets: 'outlet', warranty: 'Builder Warranty' },
  CA: { sockets: 'outlet', warranty: 'Tarion' },
}

export const COUNTRY_ADDRESSES: Record<Country, { address1: string; address2: string; city: string; county: string; postcode: string }> = {
  IE: { address1: '1 Test Street', address2: '', city: 'Dublin', county: 'Dublin', postcode: 'D01 AB12' },
  UK: { address1: '1 Test Road', address2: '', city: 'London', county: 'Greater London', postcode: 'SW1A 1AA' },
  AU: { address1: '1 Test Avenue', address2: '', city: 'Sydney', county: 'NSW', postcode: '2000' },
  US: { address1: '1 Test Blvd', address2: '', city: 'Austin', county: 'Texas', postcode: '78701' },
  CA: { address1: '1 Test Lane', address2: '', city: 'Toronto', county: 'Ontario', postcode: 'M5V 1J1' },
}

// Stripe test cards
export const STRIPE_CARDS = {
  success: { number: '4242 4242 4242 4242', expiry: '12/28', cvc: '123' },
  declined: { number: '4000 0000 0000 0002', expiry: '12/28', cvc: '123' },
}

// ─── Navigation helpers ───────────────────────────────────────────────────────

export async function gotoHome(page: Page, country: Country) {
  await page.goto(`/?country=${country}`)
  await page.waitForLoadState('networkidle')
}

export async function dismissCookieBanner(page: Page) {
  const banner = page.getByText('Essential only')
  if (await banner.isVisible({ timeout: 3000 }).catch(() => false)) {
    await banner.click()
  }
}

// ─── Questionnaire helpers ────────────────────────────────────────────────────

export async function clickOption(page: Page, label: string) {
  await page.getByText(label, { exact: true }).first().click()
}

export async function fillAddress(page: Page, country: Country) {
  const addr = COUNTRY_ADDRESSES[country]
  await page.getByPlaceholder(/address line 1/i).fill(addr.address1)
  if (addr.address2) await page.getByPlaceholder(/address line 2/i).fill(addr.address2)
  await page.getByPlaceholder(/city|town/i).fill(addr.city)
  await page.getByPlaceholder(/county|state|province/i).fill(addr.county)
  await page.getByPlaceholder(/postcode|zip|postal/i).fill(addr.postcode)
}

export async function completeQuestionnaire(page: Page, country: Country) {
  const today = new Date().toISOString().split('T')[0]

  // Section 1 – Property details
  await fillAddress(page, country)
  await clickOption(page, 'Semi-detached house')
  // Bedrooms
  await page.getByRole('button', { name: '3' }).first().click()
  // Bathrooms
  await page.getByRole('button', { name: '2' }).last().click()
  // Features
  await page.getByText('Front garden').click()
  await page.getByText('Back garden').click()
  // Size
  await clickOption(page, '100–150 sqm')
  // Proceed to section 2
  await page.getByRole('button', { name: /next|continue/i }).click()

  // Section 2 – Builder info
  await page.getByPlaceholder(/builder|developer/i).fill('Test Builder Ltd')
  // Handover date
  const handoverInput = page.locator('input[type="date"]').first()
  await handoverInput.fill(today)
  await clickOption(page, 'Post-completion')
  await clickOption(page, 'Block built')
  // Is managed? No
  await page.getByText('No', { exact: true }).first().click()
  await page.getByRole('button', { name: /next|continue/i }).click()

  // Section 3 – Contract inclusions
  await page.getByText('Fitted kitchen').click()
  await page.getByRole('button', { name: /next|continue/i }).click()

  // Section 4 – Building services
  await clickOption(page, 'Gas boiler')
  // Pressurised cylinder, HRV, energy cert — pick first available option in each group
  const optionButtons = page.locator('button[class*="border"]')
  // pressurised cylinder
  await page.getByText(/yes|pressurised/i).first().click()
  // HRV
  await page.getByText(/hrv|mvhr|no hrv/i).first().click()
  // Energy cert
  await page.getByText(/ber|epc|nathers|energy/i).first().click()
  await page.getByRole('button', { name: /next|continue/i }).click()

  // Section 5 – Known issues
  await page.getByText('No', { exact: true }).first().click()
  await page.getByRole('button', { name: /next|continue/i }).click()

  // Section 6 – Inspector info
  await page.getByPlaceholder(/inspector name|your name/i).fill('Test Inspector')
  const inspDateInput = page.locator('input[type="date"]').last()
  await inspDateInput.fill(today)
  await clickOption(page, 'Overcast but dry')
  await clickOption(page, 'Just me')
  await page.getByRole('button', { name: /start inspection|begin|create/i }).click()
}

// ─── Checklist helpers ────────────────────────────────────────────────────────

export async function waitForChecklist(page: Page) {
  await page.waitForURL(/\/inspect\/.+\/checklist/, { timeout: 30_000 })
  await page.waitForLoadState('networkidle')
}

export async function passItem(page: Page) {
  await page.getByRole('button', { name: /^pass$/i }).first().click()
  await page.waitForTimeout(400)
}

export async function failItemWithSeverity(page: Page, severity: 'Minor cosmetic' | 'Major defect' | 'Critical / safety') {
  await page.getByRole('button', { name: /^fail$/i }).first().click()
  await page.waitForTimeout(300)
  await page.getByText(severity, { exact: true }).click()
  await page.waitForTimeout(400)
}

export async function completeNItems(page: Page, n: number) {
  for (let i = 0; i < n; i++) {
    await passItem(page)
  }
}

// ─── Payment helpers ──────────────────────────────────────────────────────────

export async function waitForPaywall(page: Page) {
  // After n items the paywall modal/screen appears
  await expect(page.getByText(/unlock|pay|report/i)).toBeVisible({ timeout: 20_000 })
}

export async function fillStripeCard(page: Page, card: typeof STRIPE_CARDS.success) {
  // Stripe embeds an iframe for card number
  const cardFrame = page.frameLocator('iframe[name*="card-number"], iframe[title*="card number"]').first()
  await cardFrame.locator('input').fill(card.number)

  const expiryFrame = page.frameLocator('iframe[name*="expiry"], iframe[title*="expiry"]').first()
  await expiryFrame.locator('input').fill(card.expiry)

  const cvcFrame = page.frameLocator('iframe[name*="cvc"], iframe[title*="cvc"]').first()
  await cvcFrame.locator('input').fill(card.cvc)
}

// ─── Supabase direct check ────────────────────────────────────────────────────

export function getInspectionIdFromUrl(page: Page): string {
  const url = page.url()
  const match = url.match(/\/inspect\/([^/]+)/)
  if (!match) throw new Error(`Cannot extract inspection ID from URL: ${url}`)
  return match[1]
}
