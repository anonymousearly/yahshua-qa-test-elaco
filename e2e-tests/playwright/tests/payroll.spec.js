/**
 * Playwright E2E Tests — PH Payroll Calculator
 *
 * Run with: npx playwright test (from e2e-tests/)
 *
 * These tests check both happy paths and known bugs.
 * Candidates should add more tests as they discover additional issues.
 */

const { test, expect, request } = require('@playwright/test')

const BASE_URL = 'http://localhost:3000'
const API_URL = 'http://localhost:8000/api'

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

test.describe('Dashboard', () => {
  test('loads and shows API status as Online', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Dashboard')).toBeVisible()
    await expect(page.getByText('Online')).toBeVisible()
  })

  test('shows employee count', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Active Employees')).toBeVisible()
  })

  /**
   * [BUG-001] Avg Monthly Salary card has alignment mismatch vs other stat cards
   *
   * EXPECTED: All four stat cards use the same .display-4.fw-bold class for
   *           their value element so they share equal font size and alignment.
   * ACTUAL:   The Avg Monthly Salary card uses .h4.fw-bold.text-info (smaller)
   *           while the other three cards use .display-4.fw-bold — causing a
   *           visible height and alignment inconsistency in the row.
   * BUG CONFIRMED when display-4 class is absent on the avg salary value.
   */
  test('[BUG-001] Avg Monthly Salary card uses h4 instead of display-4 (alignment mismatch)', async ({ page }) => {
    await page.goto('/')
    // Other three stat cards correctly use .display-4
    await expect(page.locator('.display-4.fw-bold.text-primary')).toBeVisible()
    await expect(page.locator('.display-4.fw-bold.text-success')).toBeVisible()
    await expect(page.locator('.display-4.fw-bold.text-warning')).toBeVisible()
    // BUG CONFIRMED: Avg Monthly Salary uses .h4 instead of .display-4
    // EXPECTED: .display-4.fw-bold.text-info to match other cards
    // ACTUAL:   .h4.fw-bold.text-info — smaller class, misaligned with peers
    await expect(page.locator('.display-4.fw-bold.text-info')).not.toBeVisible()
    await expect(page.locator('.h4.fw-bold.text-info')).toBeVisible()
    console.log('[BUG-001] Avg Monthly Salary value uses .h4 (not .display-4) — UI alignment mismatch confirmed')
  })

  /**
   * [BUG-004] Excessively long employee names break the Recent Payroll Records panel
   *
   * EXPECTED: Employee names in the Recent Payroll Records list should be truncated
   *           (e.g. via text-truncate) so the layout does not break.
   * ACTUAL:   The <span> for employee_name has no overflow protection — long names
   *           push the net pay amount outside the card boundary.
   * BUG CONFIRMED when the name <span> carries no text-truncate class.
   */
  test('[BUG-004] Recent Payroll Records panel does not truncate long employee names', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    // Check whether any recent payroll records are displayed
    const listItems = page.locator('.list-group-item .d-flex span').first()
    const count = await listItems.count()
    if (count > 0) {
      // BUG CONFIRMED: no text-truncate or overflow guard on the employee name span
      // EXPECTED: class should include text-truncate to prevent overflow
      // ACTUAL:   plain <span> with no truncation class
      const spanClass = await listItems.getAttribute('class')
      expect(spanClass).not.toContain('text-truncate')
      console.log('[BUG-004] Employee name span in Recent Payroll Records has no text-truncate — overflow confirmed')
    } else {
      console.log('[BUG-004] No recent records to inspect — create a payroll record first')
    }
  })
})

// ---------------------------------------------------------------------------
// Employee List
// ---------------------------------------------------------------------------

test.describe('Employee List', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/employees')
  })

  test('displays 5 employees from sample data', async ({ page }) => {
    const rows = page.locator('table tbody tr')
    await expect(rows).toHaveCount(5)
  })

  test('shows Juan Dela Cruz', async ({ page }) => {
    await expect(page.getByText('Juan Dela Cruz')).toBeVisible()
  })

  test('shows Ana Garcia as contractual', async ({ page }) => {
    await expect(page.getByText('Ana Garcia')).toBeVisible()
    await expect(page.getByText('contractual')).toBeVisible()
  })

  test('can open add employee form', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Employee' }).click()
    await expect(page.getByText('Add New Employee')).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Employees — Bug Tests (API-level)
// ---------------------------------------------------------------------------

test.describe('Employees — Bug Tests', () => {
  /**
   * [BUG-002] Text fields accept special characters as valid input
   *
   * EXPECTED: First Name, Last Name, Position, and Department should reject
   *           special characters (e.g. @@@@@@) with a validation error.
   * ACTUAL:   API accepts @@@@@@in all text fields and returns 201 Created —
   *           no character validation exists on the server side.
   * BUG CONFIRMED when status is 201 and first_name equals "@@@@@@".
   */
  test('[BUG-002] Employee text fields accept special characters as valid input', async ({ request }) => {
    const res = await request.post(`${API_URL}/employees/`, {
      data: {
        first_name: '@@@@@@',
        last_name: '@@@@@@',
        email: `bug002.${Date.now()}@example.com`,
        position: '@@@@@@',
        department: '@@@@@@',
        employment_type: 'regular',
        monthly_salary: '30000.00',
        date_hired: '2024-01-01',
      },
    })
    // BUG CONFIRMED: 201 returned — should be 400 for special-character names
    expect(res.status()).toBe(201)
    const body = await res.json()
    expect(body.first_name).toBe('@@@@@@')
    console.log('[BUG-002] POST /api/employees/ accepted first_name="@@@@@@" — no character validation')
  })

  /**
   * [BUG-003] Text fields accept excessively long input, breaking the table UI
   *
   * EXPECTED: Field length should be capped (e.g. max 50 chars) and long values
   *           should cause the table to truncate/wrap cleanly.
   * ACTUAL:   100-character first name is accepted and saved, causing the
   *           employee table columns to misalign when the record is displayed.
   * BUG CONFIRMED when status is 201 and first_name.length equals 100.
   */
  test('[BUG-003] Employee text fields accept excessively long input', async ({ request }) => {
    const longName = 'A'.repeat(100)
    const res = await request.post(`${API_URL}/employees/`, {
      data: {
        first_name: longName,
        last_name: 'Longtest',
        email: `bug003.${Date.now()}@example.com`,
        position: 'QA',
        department: 'Testing',
        employment_type: 'regular',
        monthly_salary: '30000.00',
        date_hired: '2024-01-01',
      },
    })
    // BUG CONFIRMED: 100-character name saved — no max-length server-side validation
    expect(res.status()).toBe(201)
    const body = await res.json()
    expect(body.first_name.length).toBe(100)
    console.log(`[BUG-003] POST /api/employees/ accepted first_name with ${body.first_name.length} characters`)
  })

  /**
   * [BUG-005] Name and text fields accept single-character input
   *
   * EXPECTED: All name fields should require at least 3 characters.
   * ACTUAL:   Single-character values (e.g. "A") are accepted and saved.
   * BUG CONFIRMED when status is 201 and first_name equals "A".
   */
  test('[BUG-005] Employee name fields accept single-character input', async ({ request }) => {
    const res = await request.post(`${API_URL}/employees/`, {
      data: {
        first_name: 'A',
        last_name: 'B',
        email: `bug005.${Date.now()}@example.com`,
        position: 'C',
        department: 'D',
        employment_type: 'regular',
        monthly_salary: '30000.00',
        date_hired: '2024-01-01',
      },
    })
    // BUG CONFIRMED: single-character name accepted — should require min 3 chars
    expect(res.status()).toBe(201)
    const body = await res.json()
    expect(body.first_name).toBe('A')
    console.log('[BUG-005] POST /api/employees/ accepted first_name="A" — no minimum length validation')
  })

  /**
   * [BUG-006] Monthly Salary field accepts unrealistically large values
   *
   * EXPECTED: System should enforce a realistic maximum salary (e.g. ₱999,999)
   *           and return 400 for values exceeding it.
   * ACTUAL:   ₱99,999,999 is accepted and saved without any validation error.
   * BUG CONFIRMED when status is 201 with a ₱99,999,999 salary.
   */
  test('[BUG-006] Monthly Salary field accepts unrealistically large values', async ({ request }) => {
    const res = await request.post(`${API_URL}/employees/`, {
      data: {
        first_name: 'Bug',
        last_name: 'Six',
        email: `bug006.${Date.now()}@example.com`,
        position: 'Tester',
        department: 'QA',
        employment_type: 'regular',
        monthly_salary: '99999999.00',
        date_hired: '2024-01-01',
      },
    })
    // BUG CONFIRMED: ₱99,999,999 salary accepted — no maximum salary validation
    expect(res.status()).toBe(201)
    const body = await res.json()
    console.log(`[BUG-006] POST /api/employees/ accepted monthly_salary="${body.monthly_salary}"`)
  })
})

// ---------------------------------------------------------------------------
// Payroll Calculator
// ---------------------------------------------------------------------------

test.describe('Payroll Calculator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calculate')
  })

  test('shows calculator form', async ({ page }) => {
    await expect(page.getByText('Payroll Calculator')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Calculate Payroll' })).toBeVisible()
  })

  test('calculates payroll and shows results', async ({ page }) => {
    // Select the first employee (Juan Dela Cruz)
    await page.locator('select').first().selectOption({ index: 1 })
    await page.getByRole('button', { name: 'Calculate Payroll' }).click()
    await expect(page.getByText('Payroll Result')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Net Pay')).toBeVisible()
  })

  /**
   * BUG #2: Negative salary input — no validation
   *
   * EXPECTED: Form should show validation error for -5000.
   * ACTUAL: Form submits successfully with negative salary.
   */
  test('[BUG #2] form accepts negative override salary without validation error', async ({ page }) => {
    await page.locator('select').first().selectOption({ index: 1 })
    const salaryInput = page.locator('input[type="number"]').first()
    await salaryInput.fill('-5000')

    // Check that there is no min attribute preventing negative input
    const minAttr = await salaryInput.getAttribute('min')
    expect(minAttr).toBeNull() // BUG CONFIRMED: min attribute is missing

    // Form submits without client-side error
    await page.getByRole('button', { name: 'Calculate Payroll' }).click()
    // BUG CONFIRMED: no client-side error stops the submission
    await expect(page.locator('.alert.alert-danger')).not.toBeVisible({ timeout: 3000 })
    // BUG CONFIRMED: API accepted negative salary and returned a result
    await expect(page.getByText('Payroll Result')).toBeVisible({ timeout: 10000 })
  })

  /**
   * [BUG-007] System allows payroll calculation for a period before employee hire date
   *
   * EXPECTED: The system should validate the selected period against the employee's
   *           Date Hired and block calculation with an error message.
   * ACTUAL:   The hire date is not checked — a payroll result is generated for
   *           a period that predates when the employee was actually hired.
   * BUG CONFIRMED when Payroll Result card appears without any hire-date error.
   */
  test('[BUG-007] System allows payroll calculation for a period before employee hire date', async ({ page, request }) => {
    const res = await request.get(`${API_URL}/employees/`)
    const employees = await res.json()
    const employee = employees[0]

    // Use the earliest available year in the dropdown (currentYear - 2)
    const earliestYear = new Date().getFullYear() - 2

    await page.locator('select').first().selectOption({ value: String(employee.id) })
    await page.locator('select').nth(1).selectOption({ value: '1' })       // January
    await page.locator('select').nth(2).selectOption({ value: String(earliestYear) })

    await page.getByRole('button', { name: 'Calculate Payroll' }).click()

    // BUG CONFIRMED: result card shown — no hire-date validation performed
    // EXPECTED: .alert.alert-danger with "before hire date" message
    // ACTUAL:   Payroll Result card rendered without restriction
    await expect(page.getByText('Payroll Result')).toBeVisible({ timeout: 10000 })
    console.log(`[BUG-007] Payroll calculated for Jan ${earliestYear} — employee "${employee.full_name}" hired on ${employee.date_hired}`)
  })

  /**
   * [BUG-008] Entering 0 in Override Salary does not override the employee salary
   *
   * EXPECTED: Entering 0 should use ₱0 as the override salary (or show a
   *           validation error requiring a value greater than 0).
   * ACTUAL:   0 is treated as falsy by the backend (data.get('override_salary') or ...)
   *           so the employee's recorded salary is used silently with no feedback.
   * BUG CONFIRMED when net pay displayed is NOT ₱0.00.
   */
  test('[BUG-008] Override Salary value of 0 does not override the employee salary', async ({ page }) => {
    await page.locator('select').first().selectOption({ index: 1 })
    const salaryInput = page.locator('input[type="number"]').first()
    await salaryInput.fill('0')

    await page.getByRole('button', { name: 'Calculate Payroll' }).click()
    await expect(page.getByText('Payroll Result')).toBeVisible({ timeout: 10000 })

    // BUG CONFIRMED: net pay is not ₱0.00 — the zero override was silently ignored
    // EXPECTED: net pay = ₱0.00 or a validation error blocking submission
    // ACTUAL:   employee's recorded salary used; user gets no feedback on why
    const netPayText = await page.locator('.display-5.fw-bold.text-success').innerText()
    expect(netPayText).not.toContain('₱0.00')
    console.log(`[BUG-008] Net pay with override=0: ${netPayText} (zero was silently ignored)`)
  })

  /**
   * [BUG-009] Override Salary accepts low values that produce negative net pay
   *
   * EXPECTED: System should reject any salary too low to cover mandatory deductions
   *           (SSS minimum bracket = ₱135, PhilHealth floor = ₱250) and show a
   *           warning such as "Salary is too low to cover required deductions".
   * ACTUAL:   Salary ₱1 is accepted; SSS (₱135) + PhilHealth (₱250) + Pag-IBIG
   *           (₱0.02) = ₱385.02 in deductions produce a net pay of ₱-384.02.
   * BUG CONFIRMED when net pay text contains ₱-.
   */
  test('[BUG-009] Override Salary accepts low values that produce negative net pay', async ({ page }) => {
    await page.locator('select').first().selectOption({ index: 1 })
    const salaryInput = page.locator('input[type="number"]').first()
    await salaryInput.fill('1')

    await page.getByRole('button', { name: 'Calculate Payroll' }).click()
    await expect(page.getByText('Payroll Result')).toBeVisible({ timeout: 10000 })

    // BUG CONFIRMED: negative net pay displayed — no low-salary guard in place
    // EXPECTED: validation error preventing a result where net pay < ₱0
    // ACTUAL:   ₱-384.02 shown (SSS minimum bracket alone exceeds the ₱1 salary)
    const netPayText = await page.locator('.display-5.fw-bold.text-success').innerText()
    expect(netPayText).toContain('₱-')
    console.log(`[BUG-009] Net pay with override salary ₱1: ${netPayText}`)
  })

  /**
   * [BUG-010] Override Salary input is missing the min="0" attribute
   *
   * EXPECTED: <input type="number"> should carry min="0" so the browser's
   *           built-in constraint validation blocks negative entries.
   * ACTUAL:   The min attribute is absent — any negative number can be entered
   *           and submitted without browser-level blocking.
   * BUG CONFIRMED when getAttribute('min') returns null.
   */
  test('[BUG-010] Override Salary input has no min attribute — accepts negative values', async ({ page }) => {
    const salaryInput = page.locator('input[type="number"]').first()
    const minAttr = await salaryInput.getAttribute('min')

    // BUG CONFIRMED: min attribute is absent — no browser-level constraint on negatives
    // EXPECTED: min="0"
    // ACTUAL:   min attribute not present on the <input> element
    expect(minAttr).toBeNull()
    console.log(`[BUG-010] Override Salary input min="${minAttr}" — negative values accepted by browser`)
  })

  /**
   * [BUG-011] Year dropdown includes future years beyond the current year
   *
   * EXPECTED: Year select should be restricted to the current year and past years
   *           only — payroll cannot be calculated for a period that has not occurred.
   * ACTUAL:   The dropdown range is currentYear-2 to currentYear+3, exposing up to
   *           three future years (e.g. 2027, 2028, 2029 when current year is 2026).
   * BUG CONFIRMED when at least one option value is greater than the current year.
   */
  test('[BUG-011] Year dropdown includes future years beyond the current year', async ({ page }) => {
    const yearSelect = page.locator('select').nth(2)
    const currentYear = new Date().getFullYear()

    const optionValues = await yearSelect.locator('option').evaluateAll(
      opts => opts.map(o => parseInt(o.value, 10)).filter(v => !isNaN(v))
    )
    const futureYears = optionValues.filter(v => v > currentYear)

    // BUG CONFIRMED: future year options exist in the dropdown
    // EXPECTED: no years greater than currentYear in the select options
    // ACTUAL:   years up to currentYear+3 are selectable (e.g. 2027, 2028, 2029)
    expect(futureYears.length).toBeGreaterThan(0)
    console.log(`[BUG-011] Year options: ${optionValues.join(', ')} — future years present: ${futureYears.join(', ')}`)
  })

  /**
   * [BUG-012] Pag-IBIG ₱200 monthly cap not applied correctly for salary > ₱5,000
   *
   * EXPECTED: When monthly salary exceeds ₱5,000, the Pag-IBIG employee
   *           contribution should be the flat cap of ₱200.00 per HDMF rules.
   * ACTUAL:   For salary ₱5,001 the system calculates 2% × ₱5,001 = ₱100.02
   *           via min(contribution, 200), which never reaches the ₱200 cap
   *           because the 2% amount is already below 200. The threshold logic
   *           produces a contribution below the expected flat ₱200.
   * BUG CONFIRMED when pagibig_employee ≠ 200 for a salary of ₱5,001.
   */
  test('[BUG-012] Pag-IBIG ₱200 cap not correctly applied for salary just above ₱5,000', async ({ request }) => {
    const listRes = await request.get(`${API_URL}/employees/`)
    const employees = await listRes.json()
    const employeeId = employees[0].id

    const res = await request.post(`${API_URL}/calculate-payroll/`, {
      data: {
        employee_id: employeeId,
        period_month: 1,
        period_year: 2025,
        override_salary: '5001',
      },
    })
    expect([200, 201]).toContain(res.status())
    const body = await res.json()
    const pagibig = Number(body.pagibig_employee)

    // BUG CONFIRMED: pagibig_employee ≠ 200 for salary ₱5,001
    // EXPECTED: ₱200.00 (flat cap when salary > ₱5,000 per HDMF rules)
    // ACTUAL:   ₱100.02 (min(2% × 5001, 200) = min(100.02, 200) = 100.02 — cap never fires)
    expect(pagibig).not.toBe(200)
    console.log(`[BUG-012] pagibig_employee for salary ₱5,001: ₱${pagibig} (expected ₱200.00)`)
  })
})

// ---------------------------------------------------------------------------
// Payroll History
// ---------------------------------------------------------------------------

test.describe('Payroll History', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/history')
  })

  test('displays 10 payroll records from fixtures', async ({ page }) => {
    const rows = page.locator('table tbody tr')
    await expect(rows).toHaveCount(10, { timeout: 10000 })
  })

  test('shows employee names in history', async ({ page }) => {
    await expect(page.getByText('Juan Dela Cruz').first()).toBeVisible()
  })

  test('can filter by year', async ({ page }) => {
    await page.locator('select').selectOption('2025')
    const rows = page.locator('table tbody tr')
    expect(await rows.count()).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// Tax Info
// ---------------------------------------------------------------------------

test.describe('Tax Info', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tax-info')
  })

  test('shows TRAIN Law tax table', async ({ page }) => {
    await expect(page.getByText('TRAIN Law Income Tax Brackets')).toBeVisible()
  })

  test('shows tax-exempt bracket', async ({ page }) => {
    await expect(page.getByText('₱0 – ₱250,000')).toBeVisible()
    await expect(page.getByText('0%')).toBeVisible()
  })

  test('shows all three contribution sections', async ({ page }) => {
    await expect(page.getByText('SSS Contributions')).toBeVisible()
    await expect(page.getByText('PhilHealth')).toBeVisible()
    await expect(page.getByText('Pag-IBIG / HDMF')).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// API Tests
// ---------------------------------------------------------------------------

test.describe('API Tests', () => {
  test('GET /api/health/ returns 200', async ({ request }) => {
    const res = await request.get(`${API_URL}/health/`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
  })

  test('GET /api/employees/ returns 5 employees', async ({ request }) => {
    const res = await request.get(`${API_URL}/employees/`)
    expect(res.status()).toBe(200)
    const employees = await res.json()
    expect(employees).toHaveLength(5)
  })

  test('GET /api/tax-brackets/ returns brackets array', async ({ request }) => {
    const res = await request.get(`${API_URL}/tax-brackets/`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.brackets).toHaveLength(6)
  })

  /**
   * BUG #1: Tax boundary — 250,000 should be exempt
   *
   * Using monthly salary of 20,833.33 (~250,000/year)
   * EXPECTED: income_tax = 0.00
   * ACTUAL: income_tax > 0 due to >= boundary bug
   */
  test('[BUG #1] income_tax is non-zero for annual salary of exactly 250,000', async ({ request }) => {
    const res = await request.post(`${API_URL}/calculate-payroll/`, {
      data: {
        employee_id: 1,
        period_month: 7,
        period_year: 2025,
        override_salary: 20833.33,
      },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    console.log('Income tax for ~250k annual salary:', body.income_tax)
    // BUG CONFIRMED when income_tax > 0:
    // expect(Number(body.income_tax)).toBe(0)  // This line would FAIL due to Bug #1
    expect(Number(body.income_tax)).toBeGreaterThan(0) // This PASSES, confirming Bug #1
  })

  /**
   * BUG #3: Wrong HTTP status for missing employee
   *
   * EXPECTED: HTTP 404
   * ACTUAL: HTTP 200
   */
  test('[BUG #3] calculate-payroll returns 200 (not 404) for nonexistent employee', async ({ request }) => {
    const res = await request.post(`${API_URL}/calculate-payroll/`, {
      data: {
        employee_id: 99999,
        period_month: 1,
        period_year: 2025,
      },
      failOnStatusCode: false,
    })
    // BUG CONFIRMED: status is 200 instead of 404
    expect(res.status()).toBe(200) // Should be 404 — this passing confirms Bug #3
    const body = await res.json()
    expect(body).toHaveProperty('error')
    console.log('BUG #3: Got status', res.status(), 'expected 404. Body:', body)
  })

  test('GET /api/employees/99999/ returns 404 (correct behavior)', async ({ request }) => {
    const res = await request.get(`${API_URL}/employees/99999/`, {
      failOnStatusCode: false,
    })
    expect(res.status()).toBe(404)
  })

  test('POST /api/employees/ creates a new employee', async ({ request }) => {
    const res = await request.post(`${API_URL}/employees/`, {
      data: {
        first_name: 'Test',
        last_name: 'Candidate',
        email: `qa.test.${Date.now()}@example.com`,
        position: 'QA Engineer',
        department: 'Quality Assurance',
        employment_type: 'regular',
        monthly_salary: '50000.00',
        date_hired: '2024-01-01',
      },
    })
    expect(res.status()).toBe(201)
    const body = await res.json()
    expect(body.full_name).toBe('Test Candidate')
  })

  test('GET /api/payroll-history/ returns 10 records', async ({ request }) => {
    const res = await request.get(`${API_URL}/payroll-history/`)
    expect(res.status()).toBe(200)
    const records = await res.json()
    expect(records.length).toBeGreaterThanOrEqual(10)
  })

  /**
   * [BUG-013] POST /api/employees/ accepts negative monthly_salary without validation
   *
   * EXPECTED: API should return 400 Bad Request for negative monthly_salary values.
   * ACTUAL:   API returns 201 Created and saves the record with "-100.00" as salary.
   * BUG CONFIRMED when status is 201 and body.monthly_salary equals "-100.00".
   */
  test('[BUG-013] POST /api/employees/ accepts negative monthly_salary', async ({ request }) => {
    const res = await request.post(`${API_URL}/employees/`, {
      data: {
        first_name: 'Bug',
        last_name: 'Thirteen',
        email: `bug013.${Date.now()}@example.com`,
        position: 'Tester',
        department: 'QA',
        employment_type: 'regular',
        monthly_salary: '-100',
        date_hired: '2024-01-01',
      },
    })
    // BUG CONFIRMED: 201 returned for negative salary — should be 400 Bad Request
    expect(res.status()).toBe(201)
    const body = await res.json()
    expect(body.monthly_salary).toBe('-100.00')
    console.log('[BUG-013] POST /api/employees/ accepted monthly_salary="-100" → 201 Created')
  })

  /**
   * [BUG-014] Employee records can be modified without any authentication
   *
   * EXPECTED: PUT /api/employees/{id}/ should require authentication and return
   *           401 Unauthorized or 403 Forbidden without valid credentials.
   * ACTUAL:   The endpoint accepts and processes the PUT request with no auth
   *           header, returning 200 OK — any caller can modify employee data.
   * BUG CONFIRMED when status is 200 with no Authorization header sent.
   */
  test('[BUG-014] PUT /api/employees/{id}/ succeeds without authentication', async ({ request }) => {
    const listRes = await request.get(`${API_URL}/employees/`)
    const employees = await listRes.json()
    const emp = employees[0]

    // No Authorization header — bare PUT request
    const res = await request.put(`${API_URL}/employees/${emp.id}/`, {
      data: { first_name: emp.first_name }, // same value — just verify auth check
    })
    // BUG CONFIRMED: 200 OK without any authentication — should be 401/403
    expect(res.status()).toBe(200)
    console.log(`[BUG-014] PUT /api/employees/${emp.id}/ returned ${res.status()} with no auth — unauthenticated modification allowed`)
  })

  /**
   * [BUG-015] No server-side validation — API accepts data that the UI would block
   *
   * EXPECTED: API should validate all fields server-side (special chars, negative
   *           salary, future date_hired) and return 400 for any invalid input.
   * ACTUAL:   All invalid values are accepted and saved — server-side validation
   *           is absent, so direct API calls bypass all frontend restrictions.
   * BUG CONFIRMED when status is 201 with special characters and negative salary.
   */
  test('[BUG-015] API saves invalid data that the frontend would normally block', async ({ request }) => {
    const res = await request.post(`${API_URL}/employees/`, {
      data: {
        first_name: '@',
        last_name: '@',
        email: `bug015.${Date.now()}@example.com`,
        position: '@',
        department: '@',
        employment_type: 'regular',
        monthly_salary: '-100',
        date_hired: '2099-01-01', // future date
      },
    })
    // BUG CONFIRMED: special chars, negative salary, future date_hired all accepted
    expect(res.status()).toBe(201)
    const body = await res.json()
    console.log(`[BUG-015] API accepted first_name="${body.first_name}", monthly_salary="${body.monthly_salary}", date_hired="${body.date_hired}" — no server-side validation`)
  })

  /**
   * [BUG-016] DELETE /api/employees/{id}/ soft-deletes instead of permanently removing
   *
   * EXPECTED: DELETE should permanently remove the record and return 204 No Content.
   *           Subsequent GET on the same ID should return 404.
   * ACTUAL:   The endpoint only sets is_active=false (soft delete) — the record
   *           remains in the database and is still retrievable via GET by ID.
   * BUG CONFIRMED when GET after DELETE returns 200 with is_active=false.
   */
  test('[BUG-016] DELETE /api/employees/{id}/ soft-deletes only — record still retrievable', async ({ request }) => {
    // Create a throwaway employee
    const createRes = await request.post(`${API_URL}/employees/`, {
      data: {
        first_name: 'Delete',
        last_name: 'Me',
        email: `delete.me.${Date.now()}@example.com`,
        position: 'Temp',
        department: 'Test',
        employment_type: 'regular',
        monthly_salary: '30000.00',
        date_hired: '2024-01-01',
      },
    })
    expect(createRes.status()).toBe(201)
    const { id } = await createRes.json()

    // DELETE the employee
    const delRes = await request.delete(`${API_URL}/employees/${id}/`)
    expect(delRes.status()).toBe(204)

    // BUG CONFIRMED: record still accessible after DELETE — is_active set to false only
    // EXPECTED: GET should return 404 (permanent deletion)
    // ACTUAL:   GET returns 200 with is_active=false (soft delete)
    const getRes = await request.get(`${API_URL}/employees/${id}/`, { failOnStatusCode: false })
    expect(getRes.status()).toBe(200) // should be 404 after permanent delete
    const body = await getRes.json()
    expect(body.is_active).toBe(false) // confirms soft delete behavior
    console.log(`[BUG-016] DELETE /api/employees/${id}/ → is_active=${body.is_active}, record still accessible via GET (soft delete confirmed)`)
  })

  /**
   * [BUG-017] POST /api/calculate-payroll/ accepts negative override_salary
   *
   * EXPECTED: API should reject negative override_salary and return 400 Bad Request.
   * ACTUAL:   API accepts -10000 and returns 200/201 with basic_salary="-10000.00"
   *           and net_pay="-10000.00".
   * BUG CONFIRMED when status is 200 or 201 for a negative override_salary.
   */
  test('[BUG-017] POST /api/calculate-payroll/ accepts negative override_salary', async ({ request }) => {
    const listRes = await request.get(`${API_URL}/employees/`)
    const employees = await listRes.json()
    const employeeId = employees[0].id

    const res = await request.post(`${API_URL}/calculate-payroll/`, {
      data: {
        employee_id: employeeId,
        period_month: 1,
        period_year: 2025,
        override_salary: '-10000',
      },
      failOnStatusCode: false,
    })
    // BUG CONFIRMED: 200/201 for negative salary — should be 400 Bad Request
    expect([200, 201]).toContain(res.status())
    const body = await res.json()
    console.log(`[BUG-017] override_salary="-10000" accepted → status ${res.status()}, net_pay=${body.net_pay}`)
  })

  /**
   * [BUG-018] POST /api/calculate-payroll/ accepts future period_year
   *
   * EXPECTED: API should reject period_year values in the future and return 400.
   * ACTUAL:   API accepts period_year=2099 (within serializer's max_value=2100)
   *           and returns 201 Created, saving a record for a non-existent period.
   * BUG CONFIRMED when status is 200 or 201 for period_year=2099.
   */
  test('[BUG-018] POST /api/calculate-payroll/ accepts future period_year', async ({ request }) => {
    const listRes = await request.get(`${API_URL}/employees/`)
    const employees = await listRes.json()
    const employeeId = employees[0].id

    const res = await request.post(`${API_URL}/calculate-payroll/`, {
      data: {
        employee_id: employeeId,
        period_month: 12,
        period_year: 2099,
      },
      failOnStatusCode: false,
    })
    // BUG CONFIRMED: 200/201 for future year — should be 400 Bad Request
    expect([200, 201]).toContain(res.status())
    const body = await res.json()
    console.log(`[BUG-018] period_year=2099 accepted → status ${res.status()}, net_pay=${body.net_pay}`)
  })

  /**
   * [BUG-019] POST /api/calculate-payroll/ accepts period before employee hire date
   *
   * EXPECTED: API should validate the period against the employee's hire date
   *           and return 400 Bad Request when period precedes hire date.
   * ACTUAL:   API accepts the request and returns 201 Created, saving a payroll
   *           record for a period that predates when the employee was hired.
   * BUG CONFIRMED when status is 200 or 201 for a pre-hire period.
   */
  test('[BUG-019] POST /api/calculate-payroll/ accepts period before employee hire date', async ({ request }) => {
    const listRes = await request.get(`${API_URL}/employees/`)
    const employees = await listRes.json()
    const employee = employees[0]
    const hireDate = new Date(employee.date_hired)
    const preHireYear = Math.max(hireDate.getFullYear() - 1, 2000) // clamp to serializer min
    const preHireMonth = hireDate.getMonth() + 1 // same month, one year before

    const res = await request.post(`${API_URL}/calculate-payroll/`, {
      data: {
        employee_id: employee.id,
        period_month: preHireMonth,
        period_year: preHireYear,
      },
      failOnStatusCode: false,
    })
    // BUG CONFIRMED: 200/201 for period before hire date — should be 400
    expect([200, 201]).toContain(res.status())
    console.log(`[BUG-019] Period ${preHireMonth}/${preHireYear} (before hire date ${employee.date_hired}) accepted → status ${res.status()}`)
  })

  /**
   * [BUG-020] POST /api/calculate-payroll/ returns 200 instead of 404 for non-existent employee
   *
   * EXPECTED: API should return 404 Not Found when employee_id does not exist.
   * ACTUAL:   API returns 200 OK with a JSON error body — the error message is
   *           correct but the HTTP status code is wrong (200 vs 404).
   * BUG CONFIRMED when status is 200 and body contains an "error" key.
   */
  test('[BUG-020] POST /api/calculate-payroll/ returns 200 (not 404) for non-existent employee', async ({ request }) => {
    const res = await request.post(`${API_URL}/calculate-payroll/`, {
      data: {
        employee_id: 99999,
        period_month: 3,
        period_year: 2026,
      },
      failOnStatusCode: false,
    })
    // BUG CONFIRMED: 200 returned with error body — should be 404 Not Found
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('error')
    console.log(`[BUG-020] employee_id=99999 → status ${res.status()}, body: ${JSON.stringify(body)}`)
  })

  /**
   * [BUG-021] POST /api/calculate-payroll/ accepts unrealistically large override_salary
   *
   * EXPECTED: API should enforce a maximum salary cap and return 400 Bad Request
   *           for values like ₱999,999,999.
   * ACTUAL:   API accepts the value and returns 200/201. The stored net_pay may
   *           show integer overflow (stored as a large negative number).
   * BUG CONFIRMED when status is 200 or 201 for override_salary=999999999.
   */
  test('[BUG-021] POST /api/calculate-payroll/ accepts unrealistically large override_salary', async ({ request }) => {
    const listRes = await request.get(`${API_URL}/employees/`)
    const employees = await listRes.json()
    const employeeId = employees[0].id

    const res = await request.post(`${API_URL}/calculate-payroll/`, {
      data: {
        employee_id: employeeId,
        period_month: 3,
        period_year: 2026,
        override_salary: '999999999.00',
      },
      failOnStatusCode: false,
    })
    // BUG CONFIRMED: 200/201 for ₱999,999,999 salary — should be 400
    expect([200, 201]).toContain(res.status())
    const body = await res.json()
    console.log(`[BUG-021] override_salary="999999999.00" accepted → status ${res.status()}, net_pay=${body.net_pay}`)
  })

  /**
   * [BUG-022] DELETE /api/payroll-history/{id}/ returns 200 instead of 204 and
   *           does not delete the record
   *
   * EXPECTED: DELETE should permanently remove the record and return 204 No Content.
   * ACTUAL:   Bug report states the endpoint returns 200 OK and behaves like GET,
   *           returning the record contents without performing deletion.
   * NOTE:     Backend code shows 204 — this test documents the actual vs reported behavior.
   * BUG CONFIRMED when status ≠ 204 OR record still accessible after DELETE.
   */
  test('[BUG-022] DELETE /api/payroll-history/{id}/ — verify response status and deletion', async ({ request }) => {
    // Create a fresh payroll record to delete (avoids disrupting seeded data)
    const empRes = await request.get(`${API_URL}/employees/`)
    const employees = await empRes.json()
    const employeeId = employees[0].id

    const calcRes = await request.post(`${API_URL}/calculate-payroll/`, {
      data: {
        employee_id: employeeId,
        period_month: 6,
        period_year: 2024,
      },
      failOnStatusCode: false,
    })
    expect([200, 201]).toContain(calcRes.status())
    const record = await calcRes.json()
    const recordId = record.id

    // DELETE the record
    const delRes = await request.delete(`${API_URL}/payroll-history/${recordId}/`, {
      failOnStatusCode: false,
    })
    console.log(`[BUG-022] DELETE /api/payroll-history/${recordId}/ → status ${delRes.status()} (expected 204, bug reported 200)`)

    // Verify correct status (204 = fixed; 200 = bug confirmed)
    expect(delRes.status()).toBe(204)

    // If deletion worked, the record should now be gone
    const getRes = await request.get(`${API_URL}/payroll-history/${recordId}/`, {
      failOnStatusCode: false,
    })
    expect(getRes.status()).toBe(404)
    console.log(`[BUG-022] GET after DELETE → status ${getRes.status()} (404 = correctly deleted, 200 = bug confirmed)`)
  })
})
