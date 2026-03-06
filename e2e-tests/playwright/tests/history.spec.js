/**
 * Playwright E2E Tests — Payroll History Page
 * App root   : index.html → <div id="app">
 * View       : src/views/History.vue
 * Components : PayrollHistory.vue, DeleteModal.vue
 */
const { test, expect } = require('@playwright/test')

const BASE_URL = 'http://localhost:3000'
const API_URL  = 'http://localhost:8000/api'

// ---------------------------------------------------------------------------
// Page Load — happy path
// ---------------------------------------------------------------------------

test.describe('Payroll History — Page Load', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/history`)
    await page.waitForLoadState('networkidle')
  })

  test('shows Payroll History heading', async ({ page }) => {
    await expect(page.locator('#app h1')).toContainText('Payroll History')
  })

  test('shows year filter select with All Years option', async ({ page }) => {
    const yearSelect = page.locator('#app select.form-select')
    await expect(yearSelect).toBeVisible()
    await expect(yearSelect.locator('option', { hasText: 'All Years' })).toBeAttached()
  })

  test('shows Refresh button', async ({ page }) => {
    await expect(page.locator('#app').getByRole('button', { name: 'Refresh' })).toBeVisible()
  })

  test('table has correct column headers', async ({ page }) => {
    const headers = page.locator('#app table thead th')
    await expect(headers.filter({ hasText: 'Employee' })).toBeVisible()
    await expect(headers.filter({ hasText: 'Period' })).toBeVisible()
    await expect(headers.filter({ hasText: 'Basic Salary' })).toBeVisible()
    await expect(headers.filter({ hasText: 'Total Deductions' })).toBeVisible()
    await expect(headers.filter({ hasText: 'Net Pay' })).toBeVisible()
    await expect(headers.filter({ hasText: 'Actions' })).toBeVisible()
  })

  test('table has at least one row', async ({ page }) => {
    const rows = page.locator('#app table tbody tr')
    await expect(rows.first()).toBeVisible()
  })

  test('row count matches GET /api/payroll-history/ count', async ({ page, request }) => {
    const res = await request.get(`${API_URL}/payroll-history/`)
    const body = await res.json()
    const apiCount = Array.isArray(body) ? body.length : (body.results ? body.results.length : body.count)

    const rows = page.locator('#app table tbody tr')
    await expect(rows).toHaveCount(apiCount)
  })

  test('year filter shows only past years (no future years in options)', async ({ page }) => {
    const currentYear = new Date().getFullYear()
    const yearSelect = page.locator('#app select.form-select')
    const optionValues = await yearSelect.locator('option').evaluateAll(
      opts => opts.map(o => o.value).filter(v => v !== '')
    )
    for (const val of optionValues) {
      expect(Number(val)).toBeLessThanOrEqual(currentYear)
    }
  })
})

// ---------------------------------------------------------------------------
// Data Display
// ---------------------------------------------------------------------------

test.describe('Payroll History — Data Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/history`)
    await page.waitForLoadState('networkidle')
  })

  test('first row shows non-empty employee name', async ({ page }) => {
    const firstRow = page.locator('#app table tbody tr').first()
    const employeeCell = firstRow.locator('td').first()
    const text = await employeeCell.innerText()
    expect(text.trim().length).toBeGreaterThan(0)
  })

  test('first row shows period in Mon YYYY format', async ({ page }) => {
    const firstRow = page.locator('#app table tbody tr').first()
    const periodCell = firstRow.locator('td').nth(1)
    const text = await periodCell.innerText()
    expect(text.trim()).toMatch(/[A-Z][a-z]{2}\s\d{4}/)
  })

  test('first row shows ₱ symbol in Basic Salary cell', async ({ page }) => {
    const firstRow = page.locator('#app table tbody tr').first()
    const basicSalaryCell = firstRow.locator('td').nth(2)
    await expect(basicSalaryCell).toContainText('₱')
  })

  test('first row shows ₱ symbol in Total Deductions cell', async ({ page }) => {
    const firstRow = page.locator('#app table tbody tr').first()
    const deductionsCell = firstRow.locator('td').nth(3)
    await expect(deductionsCell).toContainText('₱')
  })

  test('first row shows ₱ symbol in Net Pay cell', async ({ page }) => {
    const firstRow = page.locator('#app table tbody tr').first()
    const netPayCell = firstRow.locator('td').nth(4)
    await expect(netPayCell).toContainText('₱')
  })

  test('Total Deductions value is styled with text-danger', async ({ page }) => {
    const firstRow = page.locator('#app table tbody tr').first()
    const deductionsCell = firstRow.locator('td').nth(3)
    await expect(deductionsCell).toHaveClass(/text-danger/)
  })

  test('Net Pay value is styled with text-success and fw-bold', async ({ page }) => {
    const firstRow = page.locator('#app table tbody tr').first()
    const netPayCell = firstRow.locator('td').nth(4)
    await expect(netPayCell).toHaveClass(/text-success/)
    await expect(netPayCell).toHaveClass(/fw-bold/)
  })
})

// ---------------------------------------------------------------------------
// Year Filter
// ---------------------------------------------------------------------------

test.describe('Payroll History — Year Filter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/history`)
    await page.waitForLoadState('networkidle')
  })

  test('year filter select has All Years option with empty string value', async ({ page }) => {
    const yearSelect = page.locator('#app select.form-select')
    await expect(yearSelect.locator('option[value=""]')).toBeAttached()
  })

  test('selecting 2025 in year filter shows only 2025 rows (or zero rows)', async ({ page }) => {
    const yearSelect = page.locator('#app select.form-select')
    const has2025 = await yearSelect.locator('option[value="2025"]').count()
    if (has2025 === 0) {
      console.log('Year filter: 2025 option not found, skipping filter test')
      return
    }
    await yearSelect.selectOption('2025')
    await page.waitForLoadState('networkidle')

    const rows = page.locator('#app table tbody tr')
    const count = await rows.count()
    expect(count).toBeGreaterThanOrEqual(0)

    for (let i = 0; i < count; i++) {
      const periodText = await rows.nth(i).locator('td').nth(1).innerText()
      expect(periodText).toContain('2025')
    }
  })

  test('selecting All Years restores full row count', async ({ page, request }) => {
    const yearSelect = page.locator('#app select.form-select')
    const has2025 = await yearSelect.locator('option[value="2025"]').count()
    if (has2025 > 0) {
      await yearSelect.selectOption('2025')
      await page.waitForLoadState('networkidle')
    }

    await yearSelect.selectOption('')
    await page.waitForLoadState('networkidle')

    const res = await request.get(`${API_URL}/payroll-history/`)
    const body = await res.json()
    const apiCount = Array.isArray(body) ? body.length : (body.results ? body.results.length : body.count)

    const rows = page.locator('#app table tbody tr')
    await expect(rows).toHaveCount(apiCount)
  })
})

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

test.describe('Payroll History — Delete', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/history`)
    await page.waitForLoadState('networkidle')
  })

  test('clicking Delete on a row opens the delete confirmation modal', async ({ page }) => {
    const firstRow = page.locator('#app table tbody tr').first()
    await firstRow.locator('button.btn-outline-danger', { hasText: 'Delete' }).click()
    await expect(page.locator('#app #deleteHistoryModal')).toBeVisible({ timeout: 5000 })
  })

  test('modal title contains Confirm Deletion', async ({ page }) => {
    const firstRow = page.locator('#app table tbody tr').first()
    await firstRow.locator('button.btn-outline-danger', { hasText: 'Delete' }).click()
    const modal = page.locator('#app #deleteHistoryModal')
    await expect(modal).toBeVisible({ timeout: 5000 })
    await expect(modal.locator('.modal-title')).toContainText('Confirm Deletion')
  })

  test('modal has Cancel and Delete buttons', async ({ page }) => {
    const firstRow = page.locator('#app table tbody tr').first()
    await firstRow.locator('button.btn-outline-danger', { hasText: 'Delete' }).click()
    const modal = page.locator('#app #deleteHistoryModal')
    await expect(modal).toBeVisible({ timeout: 5000 })
    await expect(modal.getByRole('button', { name: 'Cancel' })).toBeVisible()
    await expect(modal.getByRole('button', { name: 'Delete' })).toBeVisible()
  })

  test('delete confirmation modal body contains the employee name', async ({ page }) => {
    const firstRow = page.locator('#app table tbody tr').first()
    const employeeName = await firstRow.locator('td').first().innerText()
    await firstRow.locator('button.btn-outline-danger', { hasText: 'Delete' }).click()
    const modal = page.locator('#app #deleteHistoryModal')
    await expect(modal).toBeVisible({ timeout: 5000 })
    await expect(modal.locator('.modal-body')).toContainText(employeeName.trim())
  })

  test('Cancel button closes modal without deleting (row count unchanged)', async ({ page }) => {
    const rowsBefore = await page.locator('#app table tbody tr').count()

    const firstRow = page.locator('#app table tbody tr').first()
    await firstRow.locator('button.btn-outline-danger', { hasText: 'Delete' }).click()
    const modal = page.locator('#app #deleteHistoryModal')
    await expect(modal).toBeVisible({ timeout: 5000 })

    await modal.getByRole('button', { name: 'Cancel' }).click()
    await expect(modal).not.toBeVisible({ timeout: 5000 })

    const rowsAfter = await page.locator('#app table tbody tr').count()
    expect(rowsAfter).toBe(rowsBefore)
  })

  /**
   * [BUG-022-UI] Confirming delete in the modal does not remove the row from the table
   *
   * EXPECTED: After confirming delete, the row should be removed from the table (rowCount - 1).
   * ACTUAL:   The row remains in the table — the delete operation does not update the UI.
   * BUG CONFIRMED when rowsAfter === rowsBefore (row count unchanged after confirmation).
   */
  test('[BUG-022-UI] confirming delete in modal does not remove the row from the table', async ({ page }) => {
    const rowsBefore = await page.locator('#app table tbody tr').count()

    const firstRow = page.locator('#app table tbody tr').first()
    await firstRow.locator('button.btn-outline-danger', { hasText: 'Delete' }).click()
    const modal = page.locator('#app #deleteHistoryModal')
    await expect(modal).toBeVisible({ timeout: 5000 })

    await modal.getByRole('button', { name: 'Delete' }).click()
    await page.waitForLoadState('networkidle')

    // BUG CONFIRMED: row count unchanged after delete confirmation
    const rowsAfter = await page.locator('#app table tbody tr').count()
    expect(rowsAfter).toBe(rowsBefore)
  })
})

// ---------------------------------------------------------------------------
// Bug Tests
// ---------------------------------------------------------------------------

test.describe('Payroll History — Bug Tests', () => {
  /**
   * [BUG-022] DELETE /api/payroll-history/{id}/ — regression check
   *
   * BUG-022 was reported as: DELETE returning 200 OK and not deleting the record.
   * Current behavior: DELETE returns 204 No Content and the record is permanently removed.
   * This test asserts the CORRECT expected behavior as a regression guard.
   *
   * EXPECTED: DELETE returns 204 No Content; subsequent GET returns 404 Not Found.
   * BUG WOULD REAPPEAR if DELETE returns 200 OR subsequent GET returns 200.
   */
  test('[BUG-022] DELETE /api/payroll-history/{id}/ returns 204 and record is permanently removed', async ({ request }) => {
    const listRes = await request.get(`${API_URL}/payroll-history/`)
    const listBody = await listRes.json()
    const records = Array.isArray(listBody) ? listBody : (listBody.results || [])
    expect(records.length).toBeGreaterThan(0)

    const recordId = records[records.length - 1].id
    const delRes = await request.delete(`${API_URL}/payroll-history/${recordId}/`)
    console.log(`[BUG-022] DELETE /api/payroll-history/${recordId}/ status: ${delRes.status()}`)
    expect(delRes.status()).toBe(204)

    // Record should be permanently removed
    const getRes = await request.get(`${API_URL}/payroll-history/${recordId}/`)
    console.log(`[BUG-022] GET /api/payroll-history/${recordId}/ after DELETE status: ${getRes.status()}`)
    expect(getRes.status()).toBe(404)
  })

  /**
   * [BUG-013] POST /api/employees/ accepts negative monthly_salary
   *
   * EXPECTED: POST with monthly_salary: -5000 should return 400 (validation error).
   * ACTUAL: API accepts the negative salary and returns 201.
   * BUG CONFIRMED when status is 201.
   */
  test('[BUG-013] POST /api/employees/ accepts negative monthly_salary', async ({ request }) => {
    const res = await request.post(`${API_URL}/employees/`, {
      data: {
        first_name: 'Bug',
        last_name: 'Test',
        email: `bug.test.${Date.now()}@example.com`,
        department: 'QA',
        position: 'Tester',
        employment_type: 'regular',
        monthly_salary: -5000,
        date_hired: '2024-01-01'
      }
    })
    console.log(`[BUG-013] POST with monthly_salary=-5000 status: ${res.status()}`)
    // BUG CONFIRMED when 201 instead of 400
    expect(res.status()).toBe(201)
  })
})
