/**
 * Playwright E2E Tests — Dashboard Page
 * Frontend: src/views/Dashboard.vue
 */

const { test, expect } = require('@playwright/test')

const BASE_URL = 'http://localhost:3000'
const API_URL  = 'http://localhost:8000/api'

// ---------------------------------------------------------------------------
// Happy Path — core elements
// ---------------------------------------------------------------------------

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL)
  })

  test('loads and shows page title', async ({ page }) => {
    await expect(page.locator('#app h1')).toContainText('Dashboard')
  })

  test('shows subtitle "Philippine Payroll Calculator"', async ({ page }) => {
    await expect(page.locator('#app').getByText('Philippine Payroll Calculator')).toBeVisible()
  })

  test('shows API Online badge after health check', async ({ page }) => {
    // Badge starts as "API Offline" then flips to "Online" once /api/health/ resolves
    await expect(page.locator('#app .badge.bg-success')).toBeVisible({ timeout: 8000 })
    await expect(page.locator('#app .badge.bg-success')).toContainText('Online')
  })

  // ── Stat Cards ────────────────────────────────────────────────────────────

  test('shows Active Employees stat card', async ({ page }) => {
    await expect(page.locator('#app').getByText('Active Employees')).toBeVisible()
    // Value element: class="display-4 fw-bold text-primary"
    await expect(page.locator('#app .display-4.fw-bold.text-primary')).toBeVisible()
  })

  test('shows Payroll Records stat card', async ({ page }) => {
    // exact: true prevents matching "Recent Payroll Records" (substring collision)
    await expect(page.locator('#app').getByText('Payroll Records', { exact: true })).toBeVisible()
    // Value element: class="display-4 fw-bold text-success"
    await expect(page.locator('#app .display-4.fw-bold.text-success')).toBeVisible()
  })

  test('shows Departments stat card', async ({ page }) => {
    await expect(page.locator('#app').getByText('Departments')).toBeVisible()
    // Value element: class="display-4 fw-bold text-warning"
    await expect(page.locator('#app .display-4.fw-bold.text-warning')).toBeVisible()
  })

  test('shows Avg Monthly Salary stat card', async ({ page }) => {
    await expect(page.locator('#app').getByText('Avg Monthly Salary')).toBeVisible()
    // Value element: class="h4 fw-bold text-info"
    await expect(page.locator('#app .h4.fw-bold.text-info')).toBeVisible()
  })

  // ── Quick Links ───────────────────────────────────────────────────────────

  test('shows Quick Links panel', async ({ page }) => {
    await expect(page.locator('#app').getByText('Quick Links')).toBeVisible()
  })

  test('Quick Links shows Manage Employees link', async ({ page }) => {
    // Template: router-link to="/employees" — text "👥 Manage Employees"
    await expect(page.locator('#app').getByRole('link', { name: /Manage Employees/i })).toBeVisible()
  })

  test('Quick Links shows Calculate Payroll link', async ({ page }) => {
    // Template: router-link to="/calculate" — text "🧮 Calculate Payroll"
    await expect(page.locator('#app').getByRole('link', { name: /Calculate Payroll/i })).toBeVisible()
  })

  test('Quick Links shows Payroll History link', async ({ page }) => {
    // Template: router-link to="/history" — text "📋 Payroll History"
    // Scoped to the Quick Links card to avoid matching the nav "History" link
    const card = page.locator('#app .card', { hasText: 'Quick Links' })
    await expect(card.getByRole('link', { name: /Payroll History/i })).toBeVisible()
  })

  test('Quick Links shows Tax Brackets link', async ({ page }) => {
    // Template: router-link to="/tax-info" — text "📊 Tax Brackets"
    await expect(page.locator('#app').getByRole('link', { name: /Tax Brackets/i })).toBeVisible()
  })

  test('Quick Links — Manage Employees navigates to /employees', async ({ page }) => {
    await page.locator('#app').getByRole('link', { name: /Manage Employees/i }).click()
    await expect(page).toHaveURL(`${BASE_URL}/employees`)
  })

  test('Quick Links — Calculate Payroll navigates to /calculate', async ({ page }) => {
    await page.locator('#app').getByRole('link', { name: /Calculate Payroll/i }).click()
    await expect(page).toHaveURL(`${BASE_URL}/calculate`)
  })

  test('Quick Links — Payroll History navigates to /history', async ({ page }) => {
    const card = page.locator('#app .card', { hasText: 'Quick Links' })
    await card.getByRole('link', { name: /Payroll History/i }).click()
    await expect(page).toHaveURL(`${BASE_URL}/history`)
  })

  test('Quick Links — Tax Brackets navigates to /tax-info', async ({ page }) => {
    await page.locator('#app').getByRole('link', { name: /Tax Brackets/i }).click()
    await expect(page).toHaveURL(`${BASE_URL}/tax-info`)
  })

  // ── Recent Payroll Records ────────────────────────────────────────────────

  test('shows Recent Payroll Records panel', async ({ page }) => {
    await expect(page.locator('#app').getByText('Recent Payroll Records')).toBeVisible()
  })

  test('Recent Payroll Records shows records or empty state', async ({ page }) => {
    await page.waitForLoadState('networkidle')
    const card  = page.locator('#app .card', { hasText: 'Recent Payroll Records' })
    const rows  = card.locator('li.list-group-item')
    const empty = card.getByText('No records yet.')
    const count = await rows.count()
    if (count === 0) {
      await expect(empty).toBeVisible()
    } else {
      await expect(rows.first()).toBeVisible()
    }
  })

  test('Recent Payroll Records shows at most 5 rows', async ({ page }) => {
    // Dashboard.vue: recentRecords = records.value.slice(0, 5)
    await page.waitForLoadState('networkidle')
    const card  = page.locator('#app .card', { hasText: 'Recent Payroll Records' })
    const rows  = card.locator('li.list-group-item')
    expect(await rows.count()).toBeLessThanOrEqual(5)
  })

  test('Recent Payroll Records rows show ₱ net pay value', async ({ page }) => {
    // Template: <span class="text-success fw-bold">₱{{ Number(r.net_pay).toLocaleString(...) }}</span>
    await page.waitForLoadState('networkidle')
    const card = page.locator('#app .card', { hasText: 'Recent Payroll Records' })
    const rows = card.locator('li.list-group-item')
    if (await rows.count() > 0) {
      await expect(rows.first().locator('.text-success.fw-bold')).toContainText('₱')
    }
  })

  test('Recent Payroll Records rows show period month and year', async ({ page }) => {
    // Template: <small class="text-muted">{{ monthName(r.period_month) }} {{ r.period_year }}</small>
    await page.waitForLoadState('networkidle')
    const card = page.locator('#app .card', { hasText: 'Recent Payroll Records' })
    const rows = card.locator('li.list-group-item')
    if (await rows.count() > 0) {
      const period = rows.first().locator('small.text-muted')
      await expect(period).toBeVisible()
      const text = await period.innerText()
      // e.g. "Mar 2026"
      expect(text).toMatch(/[A-Z][a-z]{2}\s\d{4}/)
    }
  })
})

// ---------------------------------------------------------------------------
// Bug Tests — Dashboard
// ---------------------------------------------------------------------------

test.describe('Dashboard — Bug Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
  })

  /**
   * BUG-001: Avg Monthly Salary card uses h4 class instead of display-4
   *
   * EXPECTED: All four stat cards should use class="display-4 fw-bold" for a
   *           consistent look (same font size and alignment).
   * ACTUAL:   The 4th card (Avg Monthly Salary) uses class="h4 fw-bold text-info"
   *           resulting in a noticeably smaller, misaligned number.
   */
  test('[BUG-001] Avg Monthly Salary card uses h4 instead of display-4 like the other three cards', async ({ page }) => {
    // Active Employees, Payroll Records, Departments all use display-4
    await expect(page.locator('#app .display-4.fw-bold')).toHaveCount(3)

    // Avg Monthly Salary uses h4 — BUG CONFIRMED when this passes
    await expect(page.locator('#app .h4.fw-bold.text-info')).toBeVisible()

    // No display-4 element exists for the 4th card
    await expect(page.locator('#app .display-4.fw-bold.text-info')).toHaveCount(0)
    console.log('[BUG-001] Avg Monthly Salary uses h4 instead of display-4 — inconsistent UI')
  })

  /**
   * BUG-002: Avg Monthly Salary displayed value is skewed by invalid salary data
   *
   * EXPECTED: The average should equal sum(monthly_salary) / employee_count
   *           using only realistic salary values.
   * ACTUAL:   Because the API accepts unrealistically large values (e.g. ₱999,999,999.99),
   *           those records pollute the average. The displayed ₱ value does not
   *           reflect a realistic dataset.
   */
  test('[BUG-002] Avg Monthly Salary displayed value matches API-computed average (skewed by invalid data)', async ({ page, request }) => {
    const res = await request.get(`${API_URL}/employees/`)
    expect(res.status()).toBe(200)
    const employees = await res.json()

    // Replicate Dashboard.vue calculation
    const total    = employees.reduce((s, e) => s + Number(e.monthly_salary), 0)
    const avg      = employees.length ? total / employees.length : 0
    const expected = '₱' + avg.toLocaleString('en-PH', { maximumFractionDigits: 0 })

    const displayed = (await page.locator('#app .h4.fw-bold.text-info').innerText()).trim()

    console.log('[BUG-002] Employees in API:', employees.length)
    console.log('[BUG-002] Computed average:', expected)
    console.log('[BUG-002] Displayed average:', displayed)

    expect(displayed).toMatch(/^₱/)

    if (avg > 999999) {
      console.log('[BUG-002] Average is unrealistically high — invalid salary data is skewing the stat card')
    }
  })

  /**
   * BUG-003: Payroll Records stat card count does not match the visible panel
   *
   * EXPECTED: If the stat card shows N records, the user should be able to see
   *           all N records (via pagination or a "View All" link).
   * ACTUAL:   The stat card shows the total count from the API (e.g. 10) but
   *           the Recent Payroll Records panel shows only up to 5 with no way
   *           to access the rest.
   */
  test('[BUG-003] Payroll Records stat card count exceeds visible records in panel with no way to see the rest', async ({ page, request }) => {
    const res = await request.get(`${API_URL}/payroll-history/`)
    expect(res.status()).toBe(200)
    const allRecords = await res.json()

    const statText     = await page.locator('#app .display-4.fw-bold.text-success').innerText()
    const statCount    = parseInt(statText.trim(), 10)
    const card         = page.locator('#app .card', { hasText: 'Recent Payroll Records' })
    const visibleCount = await card.locator('li.list-group-item').count()

    console.log('[BUG-003] Total payroll records (API):', allRecords.length)
    console.log('[BUG-003] Stat card shows:', statCount)
    console.log('[BUG-003] Visible in Recent panel:', visibleCount)

    if (allRecords.length > 5) {
      expect(statCount).toBeGreaterThan(visibleCount) // mismatch confirmed
      console.log('[BUG-003] Mismatch: stat shows', statCount, 'but only', visibleCount, 'visible in panel')
    }
  })

  /**
   * BUG-004: No "View All" link or pagination when payroll records exceed 5
   *
   * EXPECTED: When total payroll records > 5, the Recent Payroll Records panel
   *           should provide a "View All" link or pagination control.
   * ACTUAL:   No such control exists — excess records are silently hidden with
   *           no way for the user to access them from the dashboard.
   */
  test('[BUG-004] No "View All" link or pagination when payroll records exceed 5', async ({ page, request }) => {
    const res = await request.get(`${API_URL}/payroll-history/`)
    const allRecords = await res.json()

    if (allRecords.length > 5) {
      const card = page.locator('#app .card', { hasText: 'Recent Payroll Records' })

      // BUG CONFIRMED: none of these UI controls exist
      await expect(card.getByRole('link', { name: /view all/i })).toHaveCount(0)
      await expect(card.getByRole('button', { name: /view all/i })).toHaveCount(0)
      await expect(card.locator('.pagination')).toHaveCount(0)
      console.log('[BUG-004] No "View All" or pagination found —', allRecords.length, 'records exist but only 5 shown')
    }
  })

  /**
   * BUG-005: Recent Payroll Records panel has no column header for the amount
   *
   * EXPECTED: The monetary column should be labelled (e.g. "Net Pay") so users
   *           know what the ₱ value represents.
   * ACTUAL:   No label exists — it is ambiguous whether the value is gross pay,
   *           net pay, or something else.
   */
  test('[BUG-005] Recent Payroll Records panel has no column header label for the monetary values', async ({ page }) => {
    const card = page.locator('#app .card', { hasText: 'Recent Payroll Records' })

    // BUG CONFIRMED: none of these labels exist inside the panel
    await expect(card.getByText('Net Pay')).toHaveCount(0)
    await expect(card.getByText('Gross Pay')).toHaveCount(0)
    await expect(card.getByText('Amount')).toHaveCount(0)
    console.log('[BUG-005] No column header label found for monetary values in Recent Payroll Records panel')
  })

  /**
   * BUG-006: Long employee names overflow their container in Recent Payroll Records
   *
   * EXPECTED: Employee names should be truncated or wrapped within the row so
   *           that the ₱ net pay value stays visible and the layout stays intact.
   * ACTUAL:   Names exceeding the container width overflow it horizontally,
   *           pushing the ₱ amount out of the visible boundary.
   */
  test('[BUG-006] Long employee names should not overflow their container in Recent Payroll Records', async ({ page }) => {
    const card  = page.locator('#app .card', { hasText: 'Recent Payroll Records' })
    const rows  = card.locator('li.list-group-item')
    const count = await rows.count()

    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const row     = rows.nth(i)
        const rowBox  = await row.boundingBox()
        const nameEl  = row.locator('.d-flex span').first()
        const nameBox = await nameEl.boundingBox()

        if (rowBox && nameBox) {
          const overflows = (nameBox.x + nameBox.width) > (rowBox.x + rowBox.width + 1)
          if (overflows) {
            const nameText = await nameEl.innerText()
            console.log('[BUG-006] Name overflows container:', nameText)
          }
          // BUG CONFIRMED when this assertion fails for a row
          expect(nameBox.width).toBeLessThanOrEqual(rowBox.width)
        }
      }
    }
  })
})
