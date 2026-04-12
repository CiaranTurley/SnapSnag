#!/usr/bin/env node
/**
 * Lighthouse performance test runner
 *
 * Usage:
 *   node tests/performance.js
 *   PLAYWRIGHT_BASE_URL=https://staging.snapsnag.ie node tests/performance.js
 *
 * Exit code 0 = all passed, 1 = one or more pages failed thresholds
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const lighthouse = require('lighthouse').default ?? require('lighthouse')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const chromeLauncher = require('chrome-launcher')

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

// Pages to test and their minimum scores (0–100)
const PAGES = [
  {
    name: 'Homepage',
    path: '/',
    thresholds: {
      performance: 90,
      accessibility: 95,
      'best-practices': 85,
      seo: 90,
    },
  },
  {
    name: 'Questionnaire',
    path: '/inspect/start?country=IE',
    thresholds: {
      performance: 85,
      accessibility: 90,
      'best-practices': 85,
      seo: 80,
    },
  },
  {
    name: 'Blog listing',
    path: '/blog',
    thresholds: {
      performance: 90,
      accessibility: 95,
      'best-practices': 85,
      seo: 95,
    },
  },
  {
    name: 'Privacy policy',
    path: '/privacy',
    thresholds: {
      performance: 90,
      accessibility: 95,
      'best-practices': 85,
      seo: 90,
    },
  },
]

// Absolute minimums — build fails if any page drops below these
const HARD_FLOOR = {
  performance: 80,
  accessibility: 85,
}

// Max acceptable page load time on simulated Fast 3G (ms)
const MAX_LOAD_TIME_MS = 3_000

const LIGHTHOUSE_FLAGS = {
  logLevel: 'error',
  output: 'json',
  onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
  // Simulate Fast 3G
  throttlingMethod: 'simulate',
  throttling: {
    rttMs: 40,
    throughputKbps: 1_638.4,
    requestLatencyMs: 0,
    downloadThroughputKbps: 1_638.4,
    uploadThroughputKbps: 768,
    cpuSlowdownMultiplier: 4,
  },
}

async function runLighthouse(url) {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless', '--no-sandbox', '--disable-dev-shm-usage'] })
  try {
    const result = await lighthouse(url, { ...LIGHTHOUSE_FLAGS, port: chrome.port })
    return result.lhr
  } finally {
    await chrome.kill()
  }
}

function scorePercent(value) {
  return Math.round((value ?? 0) * 100)
}

async function main() {
  let exitCode = 0
  const results = []

  console.log(`\nLighthouse performance audit — ${BASE_URL}\n${'─'.repeat(60)}`)

  for (const page of PAGES) {
    const url = `${BASE_URL}${page.path}`
    process.stdout.write(`Testing ${page.name} (${url}) ... `)

    let lhr
    try {
      lhr = await runLighthouse(url)
    } catch (err) {
      console.error(`FAILED TO RUN: ${err.message}`)
      exitCode = 1
      continue
    }

    const categories = lhr.categories
    const scores = {
      performance:     scorePercent(categories.performance?.score),
      accessibility:   scorePercent(categories.accessibility?.score),
      'best-practices': scorePercent(categories['best-practices']?.score),
      seo:             scorePercent(categories.seo?.score),
    }

    // Interactive time (FID proxy) from audits
    const tti = lhr.audits['interactive']?.numericValue ?? 0
    const fcp = lhr.audits['first-contentful-paint']?.numericValue ?? 0

    const pageResult = { name: page.name, url, scores, tti, fcp, failures: [] }

    // Check per-page thresholds
    for (const [category, min] of Object.entries(page.thresholds)) {
      if (scores[category] < min) {
        pageResult.failures.push(`${category}: ${scores[category]} < ${min} required`)
        exitCode = 1
      }
    }

    // Check hard floor
    for (const [category, floor] of Object.entries(HARD_FLOOR)) {
      if (scores[category] < floor) {
        pageResult.failures.push(`HARD FLOOR ${category}: ${scores[category]} < ${floor}`)
        exitCode = 1
      }
    }

    // Check load time (use FCP as proxy for initial load on Fast 3G)
    if (fcp > MAX_LOAD_TIME_MS) {
      pageResult.failures.push(`FCP ${Math.round(fcp)}ms > ${MAX_LOAD_TIME_MS}ms limit`)
      exitCode = 1
    }

    results.push(pageResult)

    const status = pageResult.failures.length === 0 ? '✅ PASS' : '❌ FAIL'
    console.log(status)
    console.log(`  Performance: ${scores.performance}  Accessibility: ${scores.accessibility}  Best-practices: ${scores['best-practices']}  SEO: ${scores.seo}`)
    console.log(`  FCP: ${Math.round(fcp)}ms  TTI: ${Math.round(tti)}ms`)
    if (pageResult.failures.length > 0) {
      for (const f of pageResult.failures) {
        console.log(`  ⚠️  ${f}`)
      }
    }
    console.log()
  }

  console.log('─'.repeat(60))
  if (exitCode === 0) {
    console.log('✅ All Lighthouse checks passed.\n')
  } else {
    console.log('❌ One or more Lighthouse checks failed. See above.\n')
  }

  process.exit(exitCode)
}

main().catch(err => {
  console.error('Lighthouse runner error:', err)
  process.exit(1)
})
