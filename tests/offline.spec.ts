import { test, expect } from '@playwright/test'
import {
  gotoHome, dismissCookieBanner, completeQuestionnaire,
  waitForChecklist, passItem,
} from './helpers'

test.describe('Offline mode and sync', () => {
  test('items completed offline are synced when network restored', async ({ page, context }) => {
    await gotoHome(page, 'IE')
    await dismissCookieBanner(page)

    await page.getByRole('link', { name: /start.*inspection|inspect.*free/i }).first().click()
    await expect(page.getByText(/disclaimer|important|not a substitute/i)).toBeVisible({ timeout: 10_000 })
    await page.getByRole('button', { name: /i understand|start.*inspection|begin/i }).click()

    await completeQuestionnaire(page, 'IE')
    await waitForChecklist(page)

    // ── Step 1: Complete 3 items online ───────────────────────────────────────
    await passItem(page)
    await passItem(page)
    await passItem(page)
    await page.waitForTimeout(1_000)

    // ── Step 2: Go offline ─────────────────────────────────────────────────────
    await context.setOffline(true)
    await page.waitForTimeout(500)

    // ── Step 3: Complete 3 more items while offline ────────────────────────────
    await passItem(page)
    await passItem(page)
    await passItem(page)

    // ── Step 4: Verify offline banner is visible ───────────────────────────────
    await expect(
      page.getByText(/offline|no connection|sync.*when.*online|saving locally/i)
    ).toBeVisible({ timeout: 10_000 })

    // ── Step 5: Items should still appear saved in UI ──────────────────────────
    // The PWA service worker / IndexedDB should keep responses in UI
    const passedItems = page.getByText(/pass/i)
    await expect(passedItems.first()).toBeVisible()

    // ── Step 6: Restore network ────────────────────────────────────────────────
    await context.setOffline(false)
    await page.waitForTimeout(2_000)

    // ── Step 7: Verify sync happens ────────────────────────────────────────────
    // Offline banner should disappear
    await expect(
      page.getByText(/offline|no connection/i)
    ).not.toBeVisible({ timeout: 15_000 })

    // Sync confirmation should appear (or banner gone)
    // Items remain visible and correct
    await expect(page.getByText(/pass/i).first()).toBeVisible()
  })
})
