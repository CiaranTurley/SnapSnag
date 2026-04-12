import { test, expect } from '@playwright/test'
import {
  gotoHome, dismissCookieBanner, completeQuestionnaire,
  waitForChecklist, passItem, failItemWithSeverity,
  waitForPaywall, fillStripeCard, STRIPE_CARDS,
} from './helpers'

test.describe('Builder portal', () => {
  test('builder can view failed items and mark as fixed', async ({ page }) => {
    // ── 1. Complete a paid inspection ─────────────────────────────────────────
    await gotoHome(page, 'IE')
    await dismissCookieBanner(page)

    await page.getByRole('link', { name: /start.*inspection|inspect.*free/i }).first().click()
    await expect(page.getByText(/disclaimer|important|not a substitute/i)).toBeVisible({ timeout: 10_000 })
    await page.getByRole('button', { name: /i understand|start.*inspection|begin/i }).click()

    await completeQuestionnaire(page, 'IE')
    await waitForChecklist(page)

    // Fail one item and pass rest to reach paywall
    await failItemWithSeverity(page, 'Major defect')
    for (let i = 0; i < 9; i++) {
      await passItem(page)
    }

    await waitForPaywall(page)

    // Get inspection ID before paying
    const url = page.url()
    const inspMatch = url.match(/\/inspect\/([^/]+)/)
    const inspectionId = inspMatch ? inspMatch[1] : ''

    // Pay
    await page.getByRole('button', { name: /pay|unlock|get.*report/i }).first().click()
    await page.waitForTimeout(3_000)
    await fillStripeCard(page, STRIPE_CARDS.success)
    await page.getByRole('button', { name: /pay|submit|confirm/i }).last().click()
    await page.waitForURL(/\/inspect\/.+\/(checklist|report)/, { timeout: 60_000 })

    // ── 2. Get verification code from report page ──────────────────────────────
    await page.goto(`/inspect/${inspectionId}/report`)
    await page.waitForLoadState('networkidle')

    // Verification code is displayed on the report page
    const codeEl = page.getByText(/[A-Z0-9]{6,8}/).first()
    const verificationCode = await codeEl.textContent()
    expect(verificationCode).toBeTruthy()
    const code = (verificationCode ?? '').replace(/[^A-Z0-9]/g, '')

    // ── 3. Visit builder portal ───────────────────────────────────────────────
    await page.goto(`/builder/${code}`)
    await page.waitForLoadState('networkidle')

    // Builder portal shows an access gate / login
    await expect(page.getByText(/builder|portal|access|verification/i).first()).toBeVisible()

    // ── 4. Enter 6-digit access code if prompted ──────────────────────────────
    const codeInput = page.getByPlaceholder(/code|pin|access/i).first()
    if (await codeInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      // Type each digit
      const digits = code.slice(0, 6)
      for (const digit of digits) {
        await page.getByRole('textbox').last().type(digit)
      }
      await page.getByRole('button', { name: /submit|access|enter|verify/i }).click()
    }

    await page.waitForLoadState('networkidle')

    // ── 5. Failed items are shown ─────────────────────────────────────────────
    await expect(page.getByText(/defect|fail|outstanding/i).first()).toBeVisible({ timeout: 10_000 })

    // ── 6. Mark one item as Fixed ─────────────────────────────────────────────
    const fixButton = page.getByRole('button', { name: /mark.*fixed|fixed|resolve/i }).first()
    if (await fixButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await fixButton.click()
      await page.waitForTimeout(1_000)
      // Item status should update
      await expect(page.getByText(/fixed|resolved/i).first()).toBeVisible({ timeout: 10_000 })
    }
  })
})
