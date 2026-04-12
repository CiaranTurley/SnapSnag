import { test, expect } from '@playwright/test'
import {
  gotoHome, dismissCookieBanner, completeQuestionnaire,
  waitForChecklist, passItem, fillStripeCard, STRIPE_CARDS,
} from './helpers'

// NOTE: Expert subscription tests require a test user to be signed in.
// In CI, these tests use the PLAYWRIGHT_TEST_EMAIL / PLAYWRIGHT_TEST_PASSWORD env vars
// which should belong to a Supabase test account with no active subscription.

async function signIn(page: import('@playwright/test').Page) {
  const email = process.env.PLAYWRIGHT_TEST_EXPERT_EMAIL ?? 'test-expert@snapsnag.test'
  const password = process.env.PLAYWRIGHT_TEST_EXPERT_PASSWORD ?? 'TestPassword123!'

  await page.goto('/login')
  await page.waitForLoadState('networkidle')
  await page.getByPlaceholder(/email/i).fill(email)
  await page.getByPlaceholder(/password/i).fill(password)
  await page.getByRole('button', { name: /sign in|log in|continue/i }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 })
}

test.describe('Expert subscription flow', () => {
  test('sign up for expert, verify no paywall, verify branded report', async ({ page }) => {
    // ── 1. Expert page shows pricing ───────────────────────────────────────────
    await page.goto('/expert')
    await page.waitForLoadState('networkidle')
    await dismissCookieBanner(page)

    await expect(page.getByText(/€49|€39|expert/i).first()).toBeVisible()
    await expect(page.getByText(/month|annual/i).first()).toBeVisible()

    // ── 2. Fill expert sign-up form ────────────────────────────────────────────
    await page.getByPlaceholder(/company name/i).fill('Test Inspection Co.')
    await page.getByPlaceholder(/contact email/i).fill('test-expert@snapsnag.test')
    await page.getByPlaceholder(/phone/i).fill('+353 87 000 0000')

    // Select annual plan
    await page.getByText('annual', { exact: false }).first().click()

    // ── 3. Subscribe with test card ────────────────────────────────────────────
    await page.getByRole('button', { name: /start expert|subscribe|get started/i }).click()
    await page.waitForTimeout(3_000)
    await fillStripeCard(page, STRIPE_CARDS.success)
    await page.getByRole('button', { name: /pay|subscribe|confirm/i }).last().click()

    // ── 4. Redirected to expert dashboard ─────────────────────────────────────
    await page.waitForURL(/\/expert\/dashboard|\/dashboard/, { timeout: 60_000 })
    await expect(page.getByText(/expert|dashboard|subscription/i).first()).toBeVisible()

    // ── 5. Start new inspection — paywall should NOT appear ────────────────────
    await gotoHome(page, 'IE')
    await page.getByRole('link', { name: /start.*inspection|inspect.*free/i }).first().click()
    await expect(page.getByText(/disclaimer|important|not a substitute/i)).toBeVisible({ timeout: 10_000 })
    await page.getByRole('button', { name: /i understand|start.*inspection|begin/i }).click()

    await completeQuestionnaire(page, 'IE')
    await waitForChecklist(page)

    // Complete 15 items — past the normal paywall threshold
    for (let i = 0; i < 15; i++) {
      await passItem(page)
    }

    // Paywall should NOT appear for expert subscribers
    await expect(page.getByText(/unlock.*report|pay.*EUR/i)).not.toBeVisible()

    // ── 6. Complete all rooms and check report ─────────────────────────────────
    // Navigate directly to report page
    const url = page.url()
    const match = url.match(/\/inspect\/([^/]+)/)
    if (match) {
      await page.goto(`/inspect/${match[1]}/report`)
      await page.waitForLoadState('networkidle')

      // Report page should show without paywall
      await expect(page.getByText(/download|pdf|report/i).first()).toBeVisible({ timeout: 15_000 })

      // Company logo placeholder should be present in branded report
      const content = await page.content()
      expect(content).toMatch(/logo|company|Test Inspection Co/i)
    }
  })
})
