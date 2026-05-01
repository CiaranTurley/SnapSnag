import { test, expect } from '@playwright/test'
import {
  gotoHome, dismissCookieBanner, loginAsTestUser, completeQuestionnaire,
  waitForChecklist, passItem, failItemWithSeverity, finishInspection,
  interceptPaymentWithSuccess, getInspectionIdFromUrl,
  COUNTRY_PRICES,
} from './helpers'

test.describe('Payment failure and retry', () => {
  test('API error shows clear message, user can retry and succeed', async ({ page }) => {
    await loginAsTestUser(page)

    await gotoHome(page, 'IE')
    await dismissCookieBanner(page)

    await page.getByRole('link', { name: /start.*inspection|inspect.*free/i }).first().click()
    await expect(page).toHaveURL(/\/inspect\/start/, { timeout: 15_000 })

    await completeQuestionnaire(page, 'IE')
    await waitForChecklist(page)
    const inspectionId = getInspectionIdFromUrl(page)

    await passItem(page)
    await failItemWithSeverity(page, 'Minor cosmetic')
    await passItem(page)

    await finishInspection(page)
    await expect(page.getByText(COUNTRY_PRICES['IE'])).toBeVisible({ timeout: 10_000 })

    // ── Step 1: Simulate checkout API failure ─────────────────────────────────
    await page.route('**/api/create-checkout-session', route =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Payment service unavailable' }),
      })
    )
    await page.getByRole('button', { name: /get.*report/i }).click()

    // ── Step 2: Error message is shown on complete page ───────────────────────
    await expect(
      page.getByText(/payment service unavailable|something went wrong/i)
    ).toBeVisible({ timeout: 10_000 })

    // ── Step 3: Button is still available for retry ───────────────────────────
    await expect(page.getByRole('button', { name: /get.*report/i })).toBeVisible()

    // ── Step 4: Remove failure intercept, retry with success ──────────────────
    await page.unroute('**/api/create-checkout-session')
    await interceptPaymentWithSuccess(page)
    await page.getByRole('button', { name: /get.*report/i }).click()

    // ── Step 5: Payment succeeds and report is accessible ─────────────────────
    await page.waitForURL(/\/inspect\/.+\/report/, { timeout: 30_000 })
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/download|pdf|report/i).first()).toBeVisible({ timeout: 15_000 })
    expect(page.url()).toContain(inspectionId)
  })
})
