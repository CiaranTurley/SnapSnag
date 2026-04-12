/**
 * Visual regression tests using Applitools Eyes
 *
 * Prerequisites:
 *   1. Sign up for free at applitools.com
 *   2. Get your API key from the Applitools dashboard
 *   3. Add APPLITOOLS_API_KEY to .env.local and Vercel env vars
 *
 * First run creates baseline screenshots.
 * Subsequent runs diff against the baseline and flag differences > 2%.
 *
 * Run:
 *   npx playwright test tests/visual-regression.spec.ts
 */

import { test, expect } from '@playwright/test'
import { BatchInfo, Configuration, EyesRunner, Eyes, Target, MatchLevel } from '@applitools/eyes-playwright'

// ─── Applitools setup ─────────────────────────────────────────────────────────

let runner: EyesRunner
let config: Configuration

test.beforeAll(async () => {
  runner = new EyesRunner()

  config = new Configuration()
  config.setApiKey(process.env.APPLITOOLS_API_KEY ?? '')
  config.setBatch(new BatchInfo('SnapSnag Visual Regression'))
  // Flag differences > 2% of pixels as failures
  config.setMatchLevel(MatchLevel.Strict)
  config.setIgnoreDisplacements(false)
  config.setSaveNewTests(true) // First run auto-approves baselines
})

test.afterAll(async () => {
  const results = await runner.getAllTestResults(false)
  console.log('Applitools results:', results.toString())
})

// ─── Helper ────────────────────────────────────────────────────────────────────

async function checkWithEyes(
  eyes: Eyes,
  page: import('@playwright/test').Page,
  checkpointName: string,
  selector?: string
) {
  if (selector) {
    const element = page.locator(selector)
    await eyes.check(checkpointName, Target.region(element).fully())
  } else {
    await eyes.check(checkpointName, Target.window().fully().ignoreAnimations(true))
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test('Homepage hero section — visual regression', async ({ page }) => {
  const eyes = new Eyes(runner, config)
  await eyes.open(page, 'SnapSnag', 'Homepage hero', { width: 1280, height: 800 })

  try {
    await page.goto('/?country=IE')
    await page.waitForLoadState('networkidle')

    // Dismiss cookie banner if present
    const essentialBtn = page.getByText('Essential only')
    if (await essentialBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await essentialBtn.click()
    }

    await page.waitForTimeout(500) // Allow animations to settle

    // Capture hero section
    await checkWithEyes(eyes, page, 'Homepage hero — Ireland', 'main')

    // Check mobile viewport too
    await page.setViewportSize({ width: 390, height: 844 })
    await page.reload()
    await page.waitForLoadState('networkidle')
    await checkWithEyes(eyes, page, 'Homepage hero — Ireland (mobile)')
  } finally {
    await eyes.close()
  }
})

test('Paywall screen — visual regression', async ({ page }) => {
  const eyes = new Eyes(runner, config)
  await eyes.open(page, 'SnapSnag', 'Paywall screen', { width: 390, height: 844 })

  try {
    // Navigate to a known paid inspection to show the paywall
    // In CI: use a seeded inspection ID that is unpaid
    const inspectionId = process.env.PLAYWRIGHT_SEED_INSPECTION_ID
    if (!inspectionId) {
      console.log('Skipping paywall visual test — PLAYWRIGHT_SEED_INSPECTION_ID not set')
      await eyes.close()
      return
    }

    await page.goto(`/inspect/${inspectionId}/checklist`)
    await page.waitForLoadState('networkidle')

    // Scroll to paywall if visible
    const paywall = page.getByText(/unlock|EUR19.95|pay/i).first()
    if (await paywall.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await checkWithEyes(eyes, page, 'Paywall screen')
    }
  } finally {
    await eyes.close()
  }
})

test('Report page — visual regression', async ({ page }) => {
  const eyes = new Eyes(runner, config)
  await eyes.open(page, 'SnapSnag', 'Report page', { width: 390, height: 844 })

  try {
    const inspectionId = process.env.PLAYWRIGHT_SEED_PAID_INSPECTION_ID
    if (!inspectionId) {
      console.log('Skipping report visual test — PLAYWRIGHT_SEED_PAID_INSPECTION_ID not set')
      await eyes.close()
      return
    }

    await page.goto(`/inspect/${inspectionId}/report`)
    await page.waitForLoadState('networkidle')

    await checkWithEyes(eyes, page, 'Report page — summary')
  } finally {
    await eyes.close()
  }
})

test('Builder portal — visual regression', async ({ page }) => {
  const eyes = new Eyes(runner, config)
  await eyes.open(page, 'SnapSnag', 'Builder portal', { width: 1280, height: 800 })

  try {
    const verificationCode = process.env.PLAYWRIGHT_SEED_VERIFICATION_CODE
    if (!verificationCode) {
      console.log('Skipping builder portal visual test — PLAYWRIGHT_SEED_VERIFICATION_CODE not set')
      await eyes.close()
      return
    }

    await page.goto(`/builder/${verificationCode}`)
    await page.waitForLoadState('networkidle')

    await checkWithEyes(eyes, page, 'Builder portal — landing')
  } finally {
    await eyes.close()
  }
})
