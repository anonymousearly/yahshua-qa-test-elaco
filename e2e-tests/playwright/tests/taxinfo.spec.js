/**
 * Playwright E2E Tests — Tax Information Page
 * View      : src/views/TaxInfo.vue
 */

const { test, expect, request } = require('@playwright/test')

const BASE_URL = 'http://localhost:3000'
const API_URL  = 'http://localhost:8000/api'

// ---------------------------------------------------------------------------
// Page Load — happy path
// ---------------------------------------------------------------------------

test.describe('Tax Info — Page Load', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/tax-info`)
    await page.waitForLoadState('networkidle')
  })

  test('shows Tax Information heading', async ({ page }) => {
    await expect(page.locator('#app h1')).toContainText('Tax Information')
  })

  test('shows TRAIN Law Income Tax Brackets card header', async ({ page }) => {
    await expect(page.getByText('TRAIN Law Income Tax Brackets')).toBeVisible()
  })

  test('shows SSS Contributions card', async ({ page }) => {
    await expect(page.locator('.card', { hasText: 'SSS Contributions' })).toBeVisible()
  })

  test('shows PhilHealth card', async ({ page }) => {
    await expect(page.locator('.card', { hasText: 'PhilHealth' })).toBeVisible()
  })

  test('shows Pag-IBIG / HDMF card', async ({ page }) => {
    await expect(page.locator('.card', { hasText: 'Pag-IBIG / HDMF' })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Tax Brackets Table
// ---------------------------------------------------------------------------

test.describe('Tax Info — Tax Brackets Table', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/tax-info`)
    await page.waitForLoadState('networkidle')
  })

  test('table has exactly 6 rows', async ({ page }) => {
    const rows = page.locator('table tbody tr')
    await expect(rows).toHaveCount(6)
  })

  test('first row label contains ₱0 and ₱250,000', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first()
    await expect(firstRow).toContainText('₱0')
    await expect(firstRow).toContainText('₱250,000')
  })

  test('first row rate badge shows 0% with bg-success class', async ({ page }) => {
    const zeroBadge = page.locator('span.badge.bg-success').first()
    await expect(zeroBadge).toBeVisible()
    await expect(zeroBadge).toContainText('0%')
  })

  test('remaining 5 rows show non-zero rates with bg-primary class', async ({ page }) => {
    const rows = page.locator('table tbody tr')
    // rows 2–6 (indices 1–5) should have bg-primary badges
    for (let i = 1; i <= 5; i++) {
      const row = rows.nth(i)
      const badge = row.locator('span.badge.bg-primary')
      await expect(badge).toBeVisible()
      const rateText = await badge.innerText()
      expect(rateText).not.toBe('0%')
    }
  })

  test('table has correct column headers', async ({ page }) => {
    const headers = page.locator('table thead th')
    await expect(headers.filter({ hasText: 'Annual Taxable Income' })).toBeVisible()
    await expect(headers.filter({ hasText: 'Base Tax' })).toBeVisible()
    await expect(headers.filter({ hasText: 'Rate' })).toBeVisible()
    await expect(headers.filter({ hasText: 'On Excess Over' })).toBeVisible()
  })

  test('API returns exactly 6 tax brackets', async ({ request }) => {
    const res = await request.get(`${API_URL}/tax-brackets/`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    const brackets = body.brackets ?? body
    expect(Array.isArray(brackets)).toBe(true)
    expect(brackets.length).toBe(6)
  })
})

// ---------------------------------------------------------------------------
// SSS Contributions Card
// ---------------------------------------------------------------------------

test.describe('Tax Info — SSS Contributions Card', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/tax-info`)
    await page.waitForLoadState('networkidle')
  })

  test('SSS card shows 4.5% employee share', async ({ page }) => {
    const sssCard = page.locator('.card', { hasText: 'SSS Contributions' })
    await expect(sssCard).toContainText('4.5%')
  })

  test('SSS card shows 9.5% employer share', async ({ page }) => {
    const sssCard = page.locator('.card', { hasText: 'SSS Contributions' })
    await expect(sssCard).toContainText('9.5%')
  })

  test('SSS card shows ₱20,000 salary ceiling', async ({ page }) => {
    const sssCard = page.locator('.card', { hasText: 'SSS Contributions' })
    await expect(sssCard).toContainText('₱20,000')
  })
})

// ---------------------------------------------------------------------------
// PhilHealth Card
// ---------------------------------------------------------------------------

test.describe('Tax Info — PhilHealth Card', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/tax-info`)
    await page.waitForLoadState('networkidle')
  })

  test('PhilHealth card shows 5% total rate', async ({ page }) => {
    const philCard = page.locator('.card', { hasText: 'PhilHealth' })
    await expect(philCard).toContainText('5%')
  })

  test('PhilHealth card shows 2.5% each share', async ({ page }) => {
    const philCard = page.locator('.card', { hasText: 'PhilHealth' })
    await expect(philCard).toContainText('2.5%')
  })

  test('PhilHealth card shows ₱10,000 salary floor', async ({ page }) => {
    const philCard = page.locator('.card', { hasText: 'PhilHealth' })
    await expect(philCard).toContainText('₱10,000')
  })

  test('PhilHealth card shows ₱100,000 salary ceiling', async ({ page }) => {
    const philCard = page.locator('.card', { hasText: 'PhilHealth' })
    await expect(philCard).toContainText('₱100,000')
  })
})

// ---------------------------------------------------------------------------
// Pag-IBIG / HDMF Card
// ---------------------------------------------------------------------------

test.describe('Tax Info — Pag-IBIG / HDMF Card', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/tax-info`)
    await page.waitForLoadState('networkidle')
  })

  test('Pag-IBIG card shows 2% contribution rate', async ({ page }) => {
    const pagibigCard = page.locator('.card', { hasText: 'Pag-IBIG / HDMF' })
    await expect(pagibigCard).toContainText('2%')
  })

  test('Pag-IBIG card shows ₱200 monthly cap', async ({ page }) => {
    const pagibigCard = page.locator('.card', { hasText: 'Pag-IBIG / HDMF' })
    await expect(pagibigCard).toContainText('₱200')
  })
})
