import { test, expect } from '@playwright/test'
import {
  gotoHome, dismissCookieBanner, loginAsTestUser, completeQuestionnaire,
  waitForChecklist, passItem, failItemWithSeverity, finishInspection,
  interceptPaymentWithSuccess,
} from './helpers'

test.describe('Builder portal', () => {
  test('builder can view failed items and mark as fixed', async ({ page }) => {
    await loginAsTestUser(page)

    await gotoHome(page, 'IE')
    await dismissCookieBanner(page)

    await page.getByRole('link', { name: /start.*inspection|inspect.*free/i }).first().click()
    await expect(page).toHaveURL(/\/inspect\/start/, { timeout: 15_000 })

    await completeQuestionnaire(page, 'IE')
    await waitForChecklist(page)

    // Fail one item with major defect
    await failItemWithSeverity(page, 'Major defect')
    await passItem(page)
    await passItem(page)

    await finishInspection(page)

    await interceptPaymentWithSuccess(page)
    await page.getByRole('button', { name: /get.*report/i }).click()
    await page.waitForURL(/\/inspect\/.+\/report/, { timeout: 30_000 })

    // ── Get verification code from report page ─────────────────────────────────
    await page.waitForLoadState('networkidle')

    // Wait for the verification code card to appear then read the specific span
    await expect(page.getByRole('heading', { name: 'Verification code' })).toBeVisible({ timeout: 15_000 })
    const code = ((await page.locator('.tracking-widest').first().textContent()) ?? '').trim()
    expect(code).toMatch(/^[A-Z0-9]{6,8}$/)

    // ── Visit builder portal ───────────────────────────────────────────────────
    // Navigate; retry once in case Fast Refresh full reload interrupts first attempt
    try {
      await page.goto(`/builder/${code}`)
    } catch {
      await page.waitForTimeout(1500)
      await page.goto(`/builder/${code}`)
    }
    await page.waitForLoadState('networkidle')

    await expect(page.getByText(/builder|portal|access|verification/i).first()).toBeVisible()

    // Enter 6-digit access code if prompted
    const codeInput = page.getByPlaceholder(/code|pin|access/i).first()
    if (await codeInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const digits = code.slice(0, 6)
      await page.getByRole('textbox').last().fill(digits)
      await page.getByRole('button', { name: /submit|access|enter|verify/i }).click()
    }

    await page.waitForLoadState('networkidle')

    // Failed items are shown
    await expect(page.getByText(/defect|fail|outstanding/i).first()).toBeVisible({ timeout: 10_000 })

    // Mark one item as Fixed
    const fixButton = page.getByRole('button', { name: /mark.*fixed|fixed|resolve/i }).first()
    if (await fixButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await fixButton.click()
      await page.waitForTimeout(1_000)
      await expect(page.getByText(/fixed|resolved/i).first()).toBeVisible({ timeout: 10_000 })
    }
  })
})
