import { Page } from '@playwright/test'

// ─── Country configs ──────────────────────────────────────────────────────────

export type Country = 'IE' | 'UK' | 'AU' | 'US' | 'CA'

export const COUNTRY_PRICES: Record<Country, string> = {
  IE: '€19.95',
  UK: '£23.95',
  AU: 'A$39.95',
  US: '$29.95',
  CA: 'C$34.95',
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

export async function loginAsTestUser(page: Page) {
  const email    = process.env.TEST_USER_EMAIL    ?? 'test@snapsnag.ie'
  const password = process.env.TEST_USER_PASSWORD ?? 'TestPassword123!'

  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  // Dismiss cookie banner first (it arrives shortly after hydration)
  await dismissCookieBanner(page)

  // Wait for form to be stable, then fill credentials
  const emailInput = page.getByPlaceholder(/you@example\.com/i)
  await emailInput.waitFor({ timeout: 10_000 })
  await emailInput.click()
  await emailInput.fill(email)

  const pwInput = page.locator('input[type="password"]')
  await pwInput.click()
  await pwInput.fill(password)

  // Force-click Log in in case cookie banner still overlaps
  await page.getByRole('button', { name: /^log in$/i }).click({ force: true })

  // Give up to 20s for the redirect — slow middleware can add a few seconds
  try {
    await page.waitForURL(/\/dashboard|\/inspect/, { timeout: 20_000 })
  } catch {
    // Capture toast error message if present
    const toastText = await page.locator('[role="status"]').first().textContent().catch(() => '')
    const bodyText  = await page.evaluate(() => document.body.innerText)
    throw new Error(
      `Login failed for ${email} — still on ${page.url()}.\n` +
      `Supabase error: ${toastText || '(no toast found)'}\n` +
      `Check TEST_USER_EMAIL/TEST_USER_PASSWORD in .env.local and that the user exists in Supabase with a confirmed email.\n` +
      `Page text: ${bodyText.slice(0, 200)}`
    )
  }
}

export async function dismissCookieBanner(page: Page) {
  const banner = page.getByRole('button', { name: 'Essential only' })
  if (await banner.isVisible({ timeout: 6000 }).catch(() => false)) {
    await banner.click({ force: true })
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
  const isUSCA = country === 'US' || country === 'CA'

  // Dismiss cookie banner if it appeared again on this page
  await dismissCookieBanner(page)

  // Click through disclaimer (page starts in disclaimer stage before showing form)
  const disclaimerBtn = page.getByRole('button', { name: /i understand|start.*inspection/i })
  if (await disclaimerBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await disclaimerBtn.click({ force: true })
  }

  // Wait for form to be visible after disclaimer click
  await page.waitForURL(/\/inspect\/start/, { timeout: 10_000 })
  await page.getByPlaceholder(/address line 1/i).waitFor({ timeout: 20_000 })

  // Section 1 – Property details
  await fillAddress(page, country)
  await clickOption(page, 'Semi-detached house')
  // Bedrooms — NumBtn rendered as buttons with text '1'..'7+'
  await page.getByRole('button', { name: /^3$/ }).first().click()
  // Bathrooms
  await page.getByRole('button', { name: /^2$/ }).last().click()
  // Features
  await page.getByText('Front garden').first().click()
  await page.getByText('Back garden').first().click()
  // Size — US/CA uses sq ft; others use sqm
  const sizeLabel = isUSCA ? '1,100–1,600 sq ft' : '100–150 sqm'
  await clickOption(page, sizeLabel)
  await page.getByRole('button', { name: /next|continue/i }).click()

  // Section 2 – Builder info
  // Placeholder: "e.g. Cairn Homes, Bellway, etc."
  await page.getByPlaceholder(/cairn|bellway|e\.g\./i).fill('Test Builder Ltd')
  // Handover date
  await page.locator('input[type="date"]').first().fill(today)
  // Inspection type — label is "I already have the keys"
  await clickOption(page, 'I already have the keys')
  await clickOption(page, 'Block built')
  // Is managed? — click 'No' OptionCard
  await clickOption(page, 'No')
  await page.getByRole('button', { name: /next|continue/i }).click()

  // Section 3 – Contract inclusions
  await page.getByText('Fitted kitchen').first().click()
  await page.getByRole('button', { name: /next|continue/i }).click()

  // Section 4 – Building services
  // Heating system
  await clickOption(page, 'Gas boiler')
  // Pressurised cylinder: 'Yes' / 'No' / 'Not sure' — pick first 'Yes'
  await page.getByText('Yes', { exact: true }).nth(0).click()
  // HRV: 'Yes' / 'No' / 'Not sure' — pick second 'No' (nth(1)) so we don't undo pressurised
  await page.getByText('No', { exact: true }).nth(1).click()
  // Energy cert — unique label: 'Yes, I have it'
  await clickOption(page, 'Yes, I have it')
  await page.getByRole('button', { name: /next|continue/i }).click()

  // Section 5 – Known issues
  // "Has the builder flagged any outstanding items?" — pick No
  await page.getByText('No', { exact: true }).first().click()
  await page.getByRole('button', { name: /next|continue/i }).click()

  // Section 6 – Inspector info
  // Placeholder: "Full name"
  await page.getByPlaceholder(/full name/i).fill('Test Inspector')
  await page.locator('input[type="date"]').last().fill(today)
  await clickOption(page, 'Overcast but dry')
  await clickOption(page, 'Just me')
  await page.getByRole('button', { name: /build my checklist|start inspection|begin|create/i }).click()
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

// ─── Checklist / completion helpers ──────────────────────────────────────────

/** Navigate through all rooms to the last one, then click Finish and handle speed warning */
export async function finishInspection(page: Page) {
  // Keep clicking Next Room until the Finish button appears
  for (let i = 0; i < 20; i++) {
    const finishBtn = page.getByRole('button', { name: /finish/i })
    if (await finishBtn.isVisible({ timeout: 600 }).catch(() => false)) break
    const nextBtn = page.getByRole('button', { name: /next room/i })
    if (await nextBtn.isVisible({ timeout: 600 }).catch(() => false)) {
      await nextBtn.click()
      await page.waitForTimeout(400)
    } else {
      break
    }
  }
  // Click Finish — may trigger speed-warning modal
  await page.getByRole('button', { name: /finish/i }).click()
  // Handle speed-warning if it appears (inspection < 45 min)
  const speedWarn = page.getByText(/quick inspection/i)
  if (await speedWarn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await page.getByRole('button', { name: /yes.*finished/i }).click()
  }
  // Wait for the complete page
  await page.waitForURL(/\/complete/, { timeout: 20_000 })
  await page.waitForLoadState('networkidle')
}

// ─── Payment helpers ──────────────────────────────────────────────────────────

/**
 * Intercept the checkout-session API and simulate a successful payment
 * by calling the test-only mark-paid endpoint from Node.js (with auth cookies forwarded).
 * Call this BEFORE clicking the "Get report" button.
 */
export async function interceptPaymentWithSuccess(page: Page) {
  const baseURL = 'http://localhost:3000'

  await page.route('**/api/create-checkout-session', async route => {
    const body = JSON.parse(route.request().postData() ?? '{}')
    const { inspectionId } = body

    // Forward auth cookies from the browser to the Node.js fetch
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')

    const markRes = await fetch(`${baseURL}/api/test/mark-paid`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
      },
      body: JSON.stringify({ inspectionId }),
    })
    const markData = await markRes.json() as { url?: string; error?: string }

    // Return a relative path so the app navigates within the test server
    let reportUrl = markData.url ?? ''
    try { reportUrl = new URL(reportUrl).pathname } catch { /* already relative */ }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ url: reportUrl }),
    })
  })
}

/** @deprecated — tests now use interceptPaymentWithSuccess() + router.push */
export async function fillStripeCard(_page: Page, _card: typeof STRIPE_CARDS.success) {
  // Stripe Hosted Checkout is a full-page redirect — not accessible via iframe selectors.
  // Use interceptPaymentWithSuccess() before clicking "Get report" instead.
}

/** @deprecated — no mid-inspection paywall; use finishInspection() instead */
export async function waitForPaywall(page: Page) {
  await finishInspection(page)
}

// ─── Supabase direct check ────────────────────────────────────────────────────

export function getInspectionIdFromUrl(page: Page): string {
  const url = page.url()
  const match = url.match(/\/inspect\/([^/]+)/)
  if (!match) throw new Error(`Cannot extract inspection ID from URL: ${url}`)
  return match[1]
}
