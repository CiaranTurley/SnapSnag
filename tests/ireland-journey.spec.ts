import { test, expect } from '@playwright/test'
import {
  gotoHome, dismissCookieBanner, completeQuestionnaire,
  waitForChecklist, passItem, failItemWithSeverity,
  waitForPaywall, fillStripeCard, getInspectionIdFromUrl,
  COUNTRY_PRICES, STRIPE_CARDS,
} from './helpers'

test.describe('Ireland full user journey', () => {
  test('complete inspection, pay, download PDF, verify report', async ({ page }) => {
    // ── 1. Homepage ────────────────────────────────────────────────────────────
    await gotoHome(page, 'IE')
    await dismissCookieBanner(page)

    await expect(page).toHaveTitle(/snapsnag/i)
    await expect(page.getByText(/ireland/i).first()).toBeVisible()
    await expect(page.getByText(/EUR/)).toBeVisible()

    // ── 2. Start inspection ────────────────────────────────────────────────────
    await page.getByRole('link', { name: /start.*inspection|inspect.*free/i }).first().click()

    // Disclaimer screen
    await expect(page.getByText(/disclaimer|important|not a substitute/i)).toBeVisible({ timeout: 10_000 })
    await page.getByRole('button', { name: /i understand|start.*inspection|begin/i }).click()

    // Must be redirected to questionnaire
    await expect(page).toHaveURL(/\/inspect\/start/)

    // ── 3. Complete questionnaire ──────────────────────────────────────────────
    await completeQuestionnaire(page, 'IE')

    // ── 4. Checklist loads ────────────────────────────────────────────────────
    await waitForChecklist(page)

    // First room should be outside the property
    await expect(page.getByText(/outside/i).first()).toBeVisible()

    // ── 5. Pass first item, fail second ───────────────────────────────────────
    await passItem(page)

    // Fail second item
    await failItemWithSeverity(page, 'Minor cosmetic')

    // ── 6. Complete 8 more items (10 total triggers paywall) ──────────────────
    for (let i = 0; i < 8; i++) {
      await passItem(page)
    }

    // ── 7. Paywall appears with EUR price ─────────────────────────────────────
    await waitForPaywall(page)
    await expect(page.getByText(COUNTRY_PRICES['IE'])).toBeVisible()

    // Summary shows item counts
    await expect(page.getByText(/pass|passed/i).first()).toBeVisible()
    await expect(page.getByText(/fail|failed/i).first()).toBeVisible()

    // ── 8. Payment via Stripe test card ───────────────────────────────────────
    const inspectionId = getInspectionIdFromUrl(page)
    await page.getByRole('button', { name: /pay|unlock|get.*report/i }).first().click()

    // Wait for Stripe Elements to render
    await page.waitForTimeout(3_000)
    await fillStripeCard(page, STRIPE_CARDS.success)

    await page.getByRole('button', { name: /pay|submit|confirm/i }).last().click()

    // ── 9. Redirected back after payment ──────────────────────────────────────
    await page.waitForURL(/\/inspect\/.+\/(checklist|report)/, { timeout: 60_000 })

    // ── 10. Navigate to report page ───────────────────────────────────────────
    await page.goto(`/inspect/${inspectionId}/report`)
    await page.waitForLoadState('networkidle')

    await expect(page.getByText(/download|pdf|report/i).first()).toBeVisible({ timeout: 15_000 })

    // ── 11. Download PDF ───────────────────────────────────────────────────────
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30_000 }),
      page.getByRole('button', { name: /download.*pdf|pdf.*report/i }).first().click(),
    ])
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i)

    // ── 12. Verify report authenticity ────────────────────────────────────────
    // Get verification code from the page
    const verifyCode = await page.getByText(/[A-Z0-9]{6,8}/).first().textContent()

    await page.goto('/verify')
    await page.waitForLoadState('networkidle')

    if (verifyCode) {
      const codeClean = verifyCode.replace(/[^A-Z0-9]/g, '').slice(0, 8)
      const codeInput = page.getByRole('textbox')
      await codeInput.fill(codeClean)
      await page.getByRole('button', { name: /verify|check|submit/i }).click()

      await expect(page.getByText(/genuine|verified|authentic|confirmed/i)).toBeVisible({ timeout: 15_000 })
    }
  })
})
