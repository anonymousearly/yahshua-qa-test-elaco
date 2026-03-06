/**
 * Playwright E2E Tests — Calculator Page
 * App root  : index.html → <div id="app">
 * View      : src/views/Calculator.vue
 * Components: PayrollForm.vue, PayrollResults.vue
 */

const { test, expect } = require('@playwright/test')

const BASE_URL = 'http://localhost:3000'
const API_URL  = 'http://localhost:8000/api'

// ---------------------------------------------------------------------------
// Happy Path
// ---------------------------------------------------------------------------

test.describe('Calculator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/calculate`)
    await page.waitForLoadState('networkidle')
  })

  test('loads and shows page title "Payroll Calculator"', async ({ page }) => {
    await expect(page.locator('#app h1')).toContainText('Payroll Calculator')
  })

  test('shows Calculate Payroll card header', async ({ page }) => {
    await expect(page.locator('#app .card-header')).toContainText('Calculate Payroll')
  })

  test('shows employee select dropdown', async ({ page }) => {
    await expect(page.locator('#app select.form-select').nth(0)).toBeVisible()
  })

  test('shows month select dropdown with 12 options', async ({ page }) => {
    const monthSelect = page.locator('#app select.form-select').nth(1)
    await expect(monthSelect).toBeVisible()
    await expect(monthSelect.locator('option')).toHaveCount(12)
  })

  test('shows year select dropdown', async ({ page }) => {
    await expect(page.locator('#app select.form-select').nth(2)).toBeVisible()
  })

  test('shows Override Salary input', async ({ page }) => {
    await expect(page.locator('#app input[type="number"]')).toBeVisible()
  })

  test('shows Calculate Payroll submit button', async ({ page }) => {
    await expect(page.locator('#app button.btn.btn-success.btn-lg')).toContainText('Calculate Payroll')
  })

  test('submitting without selecting an employee shows an error', async ({ page }) => {
    await page.locator('#app button.btn.btn-success.btn-lg').click()
    // HTML5 `required` on the employee select blocks form submission —
    // no API call is made, so the result card must not appear.
    await expect(page.locator('#app .card.border-success')).not.toBeVisible()
  })

  test('selecting an employee and calculating shows result card', async ({ page }) => {
    await page.locator('#app select.form-select').nth(0).selectOption({ index: 1 })
    await page.locator('#app button.btn.btn-success.btn-lg').click()
    await expect(page.locator('#app .card.border-success')).toBeVisible({ timeout: 10000 })
  })

  test('result card shows Net Pay with ₱ symbol', async ({ page }) => {
    await page.locator('#app select.form-select').nth(0).selectOption({ index: 1 })
    await page.locator('#app button.btn.btn-success.btn-lg').click()
    await expect(page.locator('#app .card.border-success')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('#app .display-5.fw-bold.text-success')).toContainText('₱')
  })

  test('result card shows Total Deductions with ₱ symbol', async ({ page }) => {
    await page.locator('#app select.form-select').nth(0).selectOption({ index: 1 })
    await page.locator('#app button.btn.btn-success.btn-lg').click()
    await expect(page.locator('#app .card.border-success')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('#app .h4.text-danger')).toContainText('₱')
  })

  test('result card shows SSS deduction row', async ({ page }) => {
    await page.locator('#app select.form-select').nth(0).selectOption({ index: 1 })
    await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/calculate-payroll') && res.request().method() === 'POST'),
      page.locator('#app button.btn.btn-success.btn-lg').click(),
    ])
    await expect(page.locator('#app .card.border-success')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('#app .card.border-success').getByText('SSS')).toBeVisible()
  })

  test('result card shows PhilHealth deduction row', async ({ page }) => {
    await page.locator('#app select.form-select').nth(0).selectOption({ index: 1 })
    await page.locator('#app button.btn.btn-success.btn-lg').click()
    await expect(page.locator('#app .card.border-success')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('#app .card.border-success').getByText('PhilHealth')).toBeVisible()
  })

  test('result card shows Pag-IBIG deduction row', async ({ page }) => {
    await page.locator('#app select.form-select').nth(0).selectOption({ index: 1 })
    await page.locator('#app button.btn.btn-success.btn-lg').click()
    await expect(page.locator('#app .card.border-success')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('#app .card.border-success').getByText('Pag-IBIG')).toBeVisible()
  })

  test('result card shows Income Tax deduction row', async ({ page }) => {
    await page.locator('#app select.form-select').nth(0).selectOption({ index: 1 })
    await page.locator('#app button.btn.btn-success.btn-lg').click()
    await expect(page.locator('#app .card.border-success')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('#app .card.border-success').getByText('Income Tax')).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Bug Tests
// ---------------------------------------------------------------------------

test.describe('Calculator — Bug Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/calculate`)
    await page.waitForLoadState('networkidle')
  })

  /**
   * [BUG-007] System allows payroll calculation for a period before employee hire date
   *
   * EXPECTED: The system should validate the payroll period against the employee's
   *           Date Hired and reject the request with an appropriate error message.
   * ACTUAL:   The system ignores the hire date check and successfully generates a
   *           Payroll Result for a period before the employee was hired.
   * BUG CONFIRMED when the result card is shown with no hire-date validation error.
   */
  test('[BUG-007] System allows payroll calculation for a period before employee hire date', async ({ page, request }) => {
    // Fetch the first employee to know their hire date
    const res = await request.get(`${API_URL}/employees/`)
    const employees = await res.json()
    const employee = employees[0]

    // Dropdown year range: currentYear-2 … currentYear+3 (e.g. 2024–2029 in 2026).
    // Setting Jan of the earliest available year maximises the chance the period
    // is before the employee's hire date without going outside the dropdown range.
    const currentYear = new Date().getFullYear()
    const earliestYear = currentYear - 2

    // Select the employee from the dropdown
    await page.locator('#app select.form-select').nth(0).selectOption({ value: String(employee.id) })
    // Set month → January, year → earliest selectable year
    await page.locator('#app select.form-select').nth(1).selectOption({ value: '1' })
    await page.locator('#app select.form-select').nth(2).selectOption({ value: String(earliestYear) })

    await page.locator('#app button.btn.btn-success.btn-lg').click()

    // BUG CONFIRMED: result card shown — no hire-date validation error displayed
    // EXPECTED: .alert.alert-danger with a "before hire date" message
    // ACTUAL:   .card.border-success rendered — request accepted without restriction
    await expect(page.locator('#app .card.border-success')).toBeVisible({ timeout: 10000 })
    console.log(`[BUG-007] Payroll calculated for Jan ${earliestYear} — employee hired on ${employee.date_hired}`)
  })

  /**
   * [BUG-008] Override Salary value of 0 does not override the employee salary
   *
   * EXPECTED: Entering 0 should use ₱0 as the override, or show a validation error.
   *           The net pay should reflect a ₱0 basic salary (i.e. ₱0.00 or an error).
   * ACTUAL:   The 0 is falsy in JS, so the condition `override_salary !== null &&
   *           override_salary !== ''` is true but the backend treats 0 as blank,
   *           resulting in the employee's recorded salary being used silently.
   * BUG CONFIRMED when the displayed net pay is NOT ₱0.00.
   */
  test('[BUG-008] Override Salary value of 0 does not override the employee salary', async ({ page }) => {
    await page.locator('#app select.form-select').nth(0).selectOption({ index: 1 })

    const salaryInput = page.locator('#app input[type="number"]')
    await salaryInput.fill('0')

    await page.locator('#app button.btn.btn-success.btn-lg').click()
    await expect(page.locator('#app .card.border-success')).toBeVisible({ timeout: 10000 })

    // BUG CONFIRMED: net pay does not reflect a ₱0 override — employee salary used instead
    // EXPECTED: net pay = ₱0.00 (or a validation error blocking submission)
    // ACTUAL:   net pay = employee's normal salary-based calculation
    const netPay = page.locator('#app .display-5.fw-bold.text-success')
    const netPayText = await netPay.innerText()
    expect(netPayText).not.toContain('₱0.00')
    console.log(`[BUG-008] Net pay with override=0: ${netPayText} (zero was silently ignored)`)
  })

  /**
   * [BUG-009] Override Salary accepts unrealistically low values causing negative net pay
   *
   * EXPECTED: The system should reject salary values too low to cover mandatory
   *           government deductions (e.g. ₱1) and show a validation error such as
   *           "Salary is too low to cover required government deductions".
   * ACTUAL:   The system accepts ₱1 and produces a negative Net Pay (e.g. ₱-384.02)
   *           because SSS minimum bracket contributions exceed the ₱1 salary.
   * BUG CONFIRMED when the result card is shown with a negative net pay value.
   */
  test('[BUG-009] Override Salary accepts unrealistically low values causing negative net pay', async ({ page }) => {
    await page.locator('#app select.form-select').nth(0).selectOption({ index: 1 })

    const salaryInput = page.locator('#app input[type="number"]')
    await salaryInput.fill('1')

    await page.locator('#app button.btn.btn-success.btn-lg').click()
    await expect(page.locator('#app .card.border-success')).toBeVisible({ timeout: 10000 })

    // BUG CONFIRMED: negative net pay displayed — no low-salary guard in place
    // EXPECTED: validation error preventing a net pay below ₱0
    // ACTUAL:   ₱-xxx.xx shown (SSS minimum bracket alone exceeds the ₱1 salary)
    const netPayText = await page.locator('#app .display-5.fw-bold.text-success').innerText()
    expect(netPayText).toContain('₱-')
    console.log(`[BUG-009] Net pay with override salary ₱1: ${netPayText}`)
  })

  /**
   * [BUG-010] Override Salary input has no min attribute — accepts negative values
   *
   * EXPECTED: The input should carry min="0" so the browser's built-in constraint
   *           validation blocks negative salary entries before form submission.
   * ACTUAL:   The min attribute is absent on the <input type="number"> element,
   *           allowing any negative value to be typed and submitted.
   * BUG CONFIRMED when getAttribute('min') returns null.
   */
  test('[BUG-010] Override Salary input has no min attribute — accepts negative values', async ({ page }) => {
    const salaryInput = page.locator('#app input[type="number"]')
    const minAttr = await salaryInput.getAttribute('min')

    // BUG CONFIRMED: min attribute is absent — no browser-level constraint on negatives
    // EXPECTED: min="0"
    // ACTUAL:   min attribute not present on the input element
    expect(minAttr).toBeNull()
    console.log(`[BUG-010] Override Salary input min="${minAttr}" — negative values accepted by browser`)
  })

  /**
   * [BUG-011] Year dropdown includes future years beyond current year
   *
   * EXPECTED: The Year dropdown should be restricted to the current year and past
   *           years only — no future payroll periods should be selectable.
   * ACTUAL:   The dropdown range is currentYear-2 to currentYear+3, exposing up to
   *           three future years (e.g. 2027, 2028, 2029 in 2026).
   * BUG CONFIRMED when at least one option value exceeds the current year.
   */
  test('[BUG-011] Year dropdown includes future years beyond current year', async ({ page }) => {
    const yearSelect = page.locator('#app select.form-select').nth(2)
    const currentYear = new Date().getFullYear()

    const optionValues = await yearSelect.locator('option').evaluateAll(
      opts => opts.map(o => parseInt(o.value, 10)).filter(v => !isNaN(v))
    )
    const futureYears = optionValues.filter(v => v > currentYear)

    // BUG CONFIRMED: future year options exist in the dropdown
    // EXPECTED: no years greater than currentYear
    // ACTUAL:   years up to currentYear+3 are selectable
    expect(futureYears.length).toBeGreaterThan(0)
    console.log(`[BUG-011] Year options: ${optionValues.join(', ')} — future years present: ${futureYears.join(', ')}`)
  })

  /**
   * [BUG-012] Pag-IBIG ₱200 monthly cap — regression check
   *
   * BUG-012 was reported as: Pag-IBIG cap of ₱200 not applied when salary > ₱5,000
   *           (API returned e.g. ₱100.02 for ₱5,001 instead of ₱200.00).
   * Current behavior: cap IS applied correctly — pagibig_employee = ₱200 for salary ₱50,000.
   * This test asserts the CORRECT expected behavior as a regression guard.
   *
   * EXPECTED: pagibig_employee = ₱200.00 (2% of salary, capped at ₱200 for salary > ₱5,000).
   * BUG WOULD REAPPEAR if pagibig_employee > 200 for a salary well above ₱5,000.
   */
  test('[BUG-012] Pag-IBIG employee contribution is correctly capped at ₱200 for salary above ₱5,000', async ({ request }) => {
    const empRes = await request.get(`${API_URL}/employees/`)
    const employees = await empRes.json()
    const employeeId = employees[0].id

    const res = await request.post(`${API_URL}/calculate-payroll/`, {
      data: {
        employee_id: employeeId,
        period_month: 1,
        period_year: 2025,
        override_salary: 50000,
      },
    })
    const body = await res.json()
    const pagibig = Number(body.pagibig_employee ?? body.pagibig ?? null)

    // Regression: cap must be applied — pagibig_employee must not exceed ₱200
    // EXPECTED: ₱200.00 (HDMF cap for salary > ₱5,000)
    expect(pagibig).toBe(200)
    console.log(`[BUG-012] pagibig_employee for salary ₱50,000: ₱${pagibig} (cap correctly applied)`)
  })
})
