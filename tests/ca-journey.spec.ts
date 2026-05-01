import { test, expect } from '@playwright/test'
import {
  gotoHome, dismissCookieBanner, loginAsTestUser, completeQuestionnaire,
  waitForChecklist, passItem, failItemWithSeverity, finishInspection,
  interceptPaymentWithSuccess, getInspectionIdFromUrl,
  COUNTRY_PRICES,
} from './helpers'

test.describe('Canada full user journey', () => {
  test('CA inspection with CAD pricing and Tarion references', async ({ page }) => {
    await loginAsTestUser(page)

    await gotoHome(page, 'CA')
    await dismissCookieBanner(page)

    await expect(page.getByText(/canada/i).first()).toBeVisible()
    await expect(page.getByText(/C\$/).first()).toBeVisible()

    await page.getByRole('link', { name: /start.*inspection|inspect.*free/i }).first().click()
    await expect(page).toHaveURL(/\/inspect\/start/, { timeout: 15_000 })

    await completeQuestionnaire(page, 'CA')
    await waitForChecklist(page)
    const inspectionId = getInspectionIdFromUrl(page)

    await expect(page.getByText(/outside/i).first()).toBeVisible({ timeout: 15_000 })

    await passItem(page)
    await failItemWithSeverity(page, 'Minor cosmetic')
    await passItem(page)

    await finishInspection(page)
    await expect(page.getByText(COUNTRY_PRICES['CA'])).toBeVisible({ timeout: 10_000 })

    await interceptPaymentWithSuccess(page)
    await page.getByRole('button', { name: /get.*report/i }).click()

    await page.waitForURL(/\/inspect\/.+\/report/, { timeout: 30_000 })
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/download|pdf|report/i).first()).toBeVisible({ timeout: 15_000 })
    expect(page.url()).toContain(inspectionId)
  })
})
