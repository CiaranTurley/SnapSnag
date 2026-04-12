import { test, expect } from '@playwright/test'
import {
  gotoHome, dismissCookieBanner, completeQuestionnaire,
  waitForChecklist, passItem,
} from './helpers'

// NOTE: This test creates a real user, completes an inspection, then deletes the account.
// Requires PLAYWRIGHT_DELETION_EMAIL / PLAYWRIGHT_DELETION_PASSWORD in env —
// a fresh Supabase test account created specifically for this test.

const TEST_EMAIL = process.env.PLAYWRIGHT_DELETION_EMAIL ?? 'test-delete@snapsnag.test'
const TEST_PASSWORD = process.env.PLAYWRIGHT_DELETION_PASSWORD ?? 'TestPassword123!'

test.describe('GDPR data deletion', () => {
  test('user can delete account and all data is removed', async ({ page }) => {
    // ── 1. Sign up as test user ───────────────────────────────────────────────
    await page.goto('/signup')
    await page.waitForLoadState('networkidle')
    await dismissCookieBanner(page)

    // Only fill if the account doesn't already exist (CI creates fresh DB)
    await page.getByPlaceholder(/email/i).fill(TEST_EMAIL)
    await page.getByPlaceholder(/password/i).fill(TEST_PASSWORD)
    const nameField = page.getByPlaceholder(/name/i).first()
    if (await nameField.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await nameField.fill('Test Delete User')
    }
    await page.getByRole('button', { name: /sign up|create account|continue/i }).click()

    // Might redirect to email confirmation or dashboard
    await page.waitForTimeout(3_000)

    // ── 2. Login (in case signup requires confirmation) ────────────────────────
    if (!page.url().includes('/dashboard')) {
      await page.goto('/login')
      await page.getByPlaceholder(/email/i).fill(TEST_EMAIL)
      await page.getByPlaceholder(/password/i).fill(TEST_PASSWORD)
      await page.getByRole('button', { name: /sign in|log in/i }).click()
      await page.waitForURL(/\/dashboard/, { timeout: 15_000 })
    }

    // ── 3. Create an inspection ───────────────────────────────────────────────
    await gotoHome(page, 'IE')
    await page.getByRole('link', { name: /start.*inspection|inspect.*free/i }).first().click()
    await expect(page.getByText(/disclaimer|important/i)).toBeVisible({ timeout: 10_000 })
    await page.getByRole('button', { name: /i understand|start.*inspection|begin/i }).click()

    await completeQuestionnaire(page, 'IE')
    await waitForChecklist(page)

    // Complete a few items
    await passItem(page)
    await passItem(page)
    await passItem(page)

    // ── 4. Navigate to account settings ──────────────────────────────────────
    await page.goto('/account/settings')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText(/account|settings|profile/i).first()).toBeVisible()

    // ── 5. Click delete account ───────────────────────────────────────────────
    const deleteBtn = page.getByRole('button', { name: /delete.*account|delete my account/i })
    await expect(deleteBtn).toBeVisible({ timeout: 10_000 })
    await deleteBtn.click()

    // ── 6. Confirmation modal appears ─────────────────────────────────────────
    await expect(page.getByText(/permanently delete|cannot be undone|are you sure/i)).toBeVisible({ timeout: 5_000 })

    // ── 7. Enter email confirmation ───────────────────────────────────────────
    const confirmInput = page.getByPlaceholder(/enter your email|confirm email/i)
    await expect(confirmInput).toBeVisible()
    await confirmInput.fill(TEST_EMAIL)

    // ── 8. Confirm deletion ────────────────────────────────────────────────────
    await page.getByRole('button', { name: /^delete$|confirm.*delete|permanently delete/i }).click()

    // ── 9. Verify redirected and logged out ───────────────────────────────────
    await page.waitForURL(/\/$|\/login|\/signup/, { timeout: 30_000 })

    // Should be on homepage or login — not dashboard
    expect(page.url()).not.toContain('/dashboard')
    expect(page.url()).not.toContain('/account')

    // ── 10. Verify login no longer works ─────────────────────────────────────
    await page.goto('/login')
    await page.getByPlaceholder(/email/i).fill(TEST_EMAIL)
    await page.getByPlaceholder(/password/i).fill(TEST_PASSWORD)
    await page.getByRole('button', { name: /sign in|log in/i }).click()

    // Should show error, not redirect to dashboard
    await expect(page.getByText(/invalid|not found|error|no account/i)).toBeVisible({ timeout: 10_000 })
    expect(page.url()).not.toContain('/dashboard')
  })
})
