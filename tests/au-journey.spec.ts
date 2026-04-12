import { test, expect } from '@playwright/test'
import {
  gotoHome, dismissCookieBanner, completeQuestionnaire,
  waitForChecklist, passItem, failItemWithSeverity,
  waitForPaywall, fillStripeCard, getInspectionIdFromUrl,
  COUNTRY_PRICES, STRIPE_CARDS,
} from './helpers'

test.describe('Australia full user journey', () => {
  test('AU inspection with AUD pricing, powerpoints terminology, and HBC references', async ({ page }) => {
    // ── Homepage shows AU context ──────────────────────────────────────────────
    await gotoHome(page, 'AU')
    await dismissCookieBanner(page)

    await expect(page.getByText(/australia/i).first()).toBeVisible()
    await expect(page.getByText(/AUD|\$.*AUD/i)).toBeVisible()

    // ── Start inspection ───────────────────────────────────────────────────────
    await page.getByRole('link', { name: /start.*inspection|inspect.*free/i }).first().click()
    await expect(page.getByText(/disclaimer|important|not a substitute/i)).toBeVisible({ timeout: 10_000 })
    await page.getByRole('button', { name: /i understand|start.*inspection|begin/i }).click()
    await expect(page).toHaveURL(/\/inspect\/start/)

    // ── Questionnaire ──────────────────────────────────────────────────────────
    await completeQuestionnaire(page, 'AU')

    // ── Checklist loads ────────────────────────────────────────────────────────
    await waitForChecklist(page)

    // Verify AU-specific terminology — "powerpoints" instead of "sockets"
    const pageText = await page.content()
    expect(pageText.toLowerCase()).toContain('powerpoint')

    // Verify HBC warranty reference
    expect(pageText).toContain('HBC')

    // ── Complete 10 items ──────────────────────────────────────────────────────
    await passItem(page)
    await failItemWithSeverity(page, 'Minor cosmetic')
    for (let i = 0; i < 8; i++) {
      await passItem(page)
    }

    // ── Paywall shows AUD price ────────────────────────────────────────────────
    await waitForPaywall(page)
    await expect(page.getByText(COUNTRY_PRICES['AU'])).toBeVisible()

    // ── Payment ────────────────────────────────────────────────────────────────
    const inspectionId = getInspectionIdFromUrl(page)
    await page.getByRole('button', { name: /pay|unlock|get.*report/i }).first().click()
    await page.waitForTimeout(3_000)
    await fillStripeCard(page, STRIPE_CARDS.success)
    await page.getByRole('button', { name: /pay|submit|confirm/i }).last().click()

    await page.waitForURL(/\/inspect\/.+\/(checklist|report)/, { timeout: 60_000 })

    await page.goto(`/inspect/${inspectionId}/report`)
    await expect(page.getByText(/download|pdf|report/i).first()).toBeVisible({ timeout: 15_000 })
  })
})
