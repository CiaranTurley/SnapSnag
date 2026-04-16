import { test, expect } from '@playwright/test'

/**
 * Security regression tests.
 *
 * The mark-paid endpoint must return 404 in production.
 * It is intentionally open in development (NODE_ENV=development) so that
 * the other Playwright tests can bypass Stripe without real payments.
 *
 * This test therefore only asserts the 404 when PLAYWRIGHT_BASE_URL is set
 * (i.e. pointing at the real Vercel deployment, not the local dev server).
 * Running locally against `next dev` will skip this test.
 */
test.describe('Security', () => {
  test('mark-paid endpoint returns 404 in production', async ({ request }) => {
    const isLocalDev = !process.env.PLAYWRIGHT_BASE_URL ||
      process.env.PLAYWRIGHT_BASE_URL.startsWith('http://localhost')

    if (isLocalDev) {
      test.skip(true, 'Skipped against local dev server — endpoint is intentionally open in development')
      return
    }

    const response = await request.post('/api/test/mark-paid', {
      data: { inspectionId: 'test-123' },
    })

    expect(response.status()).toBe(404)

    const body = await response.json()
    expect(body.error).toBe('Not found')
  })
})
