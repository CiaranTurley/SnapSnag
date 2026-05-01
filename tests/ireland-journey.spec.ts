import { test, expect } from '@playwright/test'
import {
  gotoHome, dismissCookieBanner, loginAsTestUser, completeQuestionnaire,
  waitForChecklist, passItem, failItemWithSeverity, finishInspection,
  interceptPaymentWithSuccess, getInspectionIdFromUrl,
  COUNTRY_PRICES,
} from './helpers'

test.describe('Ireland full user journey', () => {
  test('complete inspection, pay, and access report', async ({ page }) => {
    // ── 0. Authenticate ────────────────────────────────────────────────────────
    await loginAsTestUser(page)

    // ── 1. Homepage ────────────────────────────────────────────────────────────
    await gotoHome(page, 'IE')
    await dismissCookieBanner(page)

    await expect(page).toHaveTitle(/snapsnag/i)
    await expect(page.getByText(/ireland/i).first()).toBeVisible()
    await expect(page.getByText(/€/).first()).toBeVisible()

    // ── 2. Start inspection ────────────────────────────────────────────────────
    await page.getByRole('link', { name: /start.*inspection|inspect.*free/i }).first().click()
    await expect(page).toHaveURL(/\/inspect\/start/, { timeout: 15_000 })

    // ── 3. Complete questionnaire ──────────────────────────────────────────────
    await completeQuestionnaire(page, 'IE')

    // ── 4. Checklist loads ────────────────────────────────────────────────────
    await waitForChecklist(page)
    const inspectionId = getInspectionIdFromUrl(page)
    await expect(page.getByText(/outside/i).first()).toBeVisible()

    // ── 5. Complete a few items ───────────────────────────────────────────────
    await passItem(page)
    await failItemWithSeverity(page, 'Minor cosmetic')
    await passItem(page)

    // ── 6. Navigate through rooms and finish ──────────────────────────────────
    await finishInspection(page)

    // ── 7. Complete page shows Ireland price ──────────────────────────────────
    await expect(page.getByText(COUNTRY_PRICES['IE'])).toBeVisible({ timeout: 10_000 })

    // ── 8. Intercept payment and simulate success ─────────────────────────────
    await interceptPaymentWithSuccess(page)
    await page.getByRole('button', { name: /get.*report/i }).click()

    // ── 9. Report page ────────────────────────────────────────────────────────
    await page.waitForURL(/\/inspect\/.+\/report/, { timeout: 30_000 })
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/download|pdf|report/i).first()).toBeVisible({ timeout: 15_000 })

    // ── 10. Verify report page content ────────────────────────────────────────
    // Report page should show the inspection ID in URL and some content
    expect(page.url()).toContain(inspectionId)
    // Download button should be present (PDF generation API tested separately)
    await expect(page.getByRole('button', { name: /download|pdf/i }).first()).toBeVisible({ timeout: 10_000 })
  })
})
