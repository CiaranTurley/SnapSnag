import { test, expect } from '@playwright/test'
import {
  gotoHome, dismissCookieBanner, completeQuestionnaire,
  waitForChecklist, passItem, failItemWithSeverity,
  waitForPaywall, fillStripeCard, STRIPE_CARDS,
} from './helpers'

test.describe('Payment failure and retry', () => {
  test('declined card shows clear error, user can retry and succeed', async ({ page }) => {
    await gotoHome(page, 'IE')
    await dismissCookieBanner(page)

    await page.getByRole('link', { name: /start.*inspection|inspect.*free/i }).first().click()
    await expect(page.getByText(/disclaimer|important|not a substitute/i)).toBeVisible({ timeout: 10_000 })
    await page.getByRole('button', { name: /i understand|start.*inspection|begin/i }).click()

    await completeQuestionnaire(page, 'IE')
    await waitForChecklist(page)

    // Complete 10 items to trigger paywall
    await passItem(page)
    await failItemWithSeverity(page, 'Minor cosmetic')
    for (let i = 0; i < 8; i++) {
      await passItem(page)
    }

    await waitForPaywall(page)
    await page.getByRole('button', { name: /pay|unlock|get.*report/i }).first().click()
    await page.waitForTimeout(3_000)

    // ── Step 1: Enter declined card ────────────────────────────────────────────
    await fillStripeCard(page, STRIPE_CARDS.declined)
    await page.getByRole('button', { name: /pay|submit|confirm/i }).last().click()

    // ── Step 2: Verify clear error message ────────────────────────────────────
    await expect(
      page.getByText(/declined|card was declined|payment failed|try another card/i)
    ).toBeVisible({ timeout: 20_000 })

    // ── Step 3: User stays on payment screen (no page refresh required) ────────
    // Stripe form should still be visible
    await expect(page.getByRole('button', { name: /pay|submit|confirm/i }).last()).toBeVisible()

    // ── Step 4: Retry with correct card ───────────────────────────────────────
    await fillStripeCard(page, STRIPE_CARDS.success)
    await page.getByRole('button', { name: /pay|submit|confirm/i }).last().click()

    // ── Step 5: Payment succeeds ───────────────────────────────────────────────
    await page.waitForURL(/\/inspect\/.+\/(checklist|report)/, { timeout: 60_000 })
    // No error visible after successful payment
    await expect(
      page.getByText(/declined|card was declined/i)
    ).not.toBeVisible()
  })
})
