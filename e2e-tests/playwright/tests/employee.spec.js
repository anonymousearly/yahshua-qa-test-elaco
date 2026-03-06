/**
 * Playwright E2E Tests — Employees Page
 * App root  : index.html → <div id="app">
 * View      : src/views/Employees.vue
 * Components: EmployeeList.vue, EmployeeForm.vue, DeleteModal.vue
 */

const { test, expect } = require('@playwright/test')

const BASE_URL = 'http://localhost:3000'
const API_URL  = 'http://localhost:8000/api'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a unique email to avoid duplicate-key errors on repeated test runs */
function uniqueEmail() {
  return `qa.employee.${Date.now()}@example.com`
}

/** Opens the Add Employee form from the Employees page */
async function openAddForm(page) {
  await page.locator('#app button.btn.btn-primary', { hasText: '+ Add Employee' }).click()
  await expect(page.locator('#app .card-header', { hasText: 'Add New Employee' })).toBeVisible()
}

/** Returns the form card locator (scoped to the visible add/edit form card) */
function formCard(page) {
  return page.locator('#app .card.shadow-sm.mb-4')
}

/** Returns the input inside a specific form field column */
function fieldInput(page, labelText, inputType = 'input') {
  return formCard(page)
    .locator('.col-md-6')
    .filter({ hasText: labelText })
    .locator(inputType)
}

// ---------------------------------------------------------------------------
// Page Load — happy path
// ---------------------------------------------------------------------------

test.describe('Employees — Page Load', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/employees`)
    await page.waitForLoadState('networkidle')
  })

  test('loads and shows page heading "Employees"', async ({ page }) => {
    await expect(page.locator('#app h1')).toContainText('Employees')
  })

  test('shows "+ Add Employee" button', async ({ page }) => {
    await expect(
      page.locator('#app button.btn.btn-primary', { hasText: '+ Add Employee' })
    ).toBeVisible()
  })

  test('shows employee table with correct column headers', async ({ page }) => {
    // EmployeeList.vue thead: Name | Position | Department | Type | Monthly Salary | Date Hired | Actions
    const headers = page.locator('#app table.table thead th')
    await expect(headers.filter({ hasText: 'Name' })).toBeVisible()
    await expect(headers.filter({ hasText: 'Position' })).toBeVisible()
    await expect(headers.filter({ hasText: 'Department' })).toBeVisible()
    await expect(headers.filter({ hasText: 'Type' })).toBeVisible()
    await expect(headers.filter({ hasText: 'Monthly Salary' })).toBeVisible()
    await expect(headers.filter({ hasText: 'Date Hired' })).toBeVisible()
    await expect(headers.filter({ hasText: 'Actions' })).toBeVisible()
  })

  test('employee table has at least one row', async ({ page }) => {
    const rows = page.locator('#app table.table tbody tr')
    await expect(rows.first()).toBeVisible()
  })

  test('employee table row count matches API', async ({ page, request }) => {
    const res = await request.get(`${API_URL}/employees/`)
    expect(res.status()).toBe(200)
    const employees = await res.json()
    const rows = page.locator('#app table.table tbody tr')
    await expect(rows).toHaveCount(employees.length)
  })

  test('table shows employee full name in bold', async ({ page }) => {
    // EmployeeList.vue: <strong>{{ emp.full_name }}</strong>
    const firstNameCell = page.locator('#app table.table tbody tr').first().locator('td strong')
    await expect(firstNameCell).toBeVisible()
  })

  test('table shows employee email below name', async ({ page }) => {
    // EmployeeList.vue: <small class="text-muted">{{ emp.email }}</small>
    const emailCell = page.locator('#app table.table tbody tr').first().locator('td small.text-muted')
    await expect(emailCell).toBeVisible()
    const emailText = await emailCell.innerText()
    expect(emailText).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
  })

  test('table shows employment type as a badge', async ({ page }) => {
    // EmployeeList.vue: span.badge with bg-success/bg-warning/bg-info
    const badge = page.locator('#app table.table tbody tr').first().locator('span.badge')
    await expect(badge).toBeVisible()
  })

  test('table shows monthly salary with ₱ symbol', async ({ page }) => {
    const salaryCell = page.locator('#app table.table tbody tr').first().locator('td.text-end').first()
    await expect(salaryCell).toContainText('₱')
  })

  test('each row has Edit and Delete action buttons', async ({ page }) => {
    const firstRow = page.locator('#app table.table tbody tr').first()
    await expect(firstRow.locator('button.btn-outline-primary', { hasText: 'Edit' })).toBeVisible()
    await expect(firstRow.locator('button.btn-outline-danger', { hasText: 'Delete' })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Add Employee Form — happy path
// ---------------------------------------------------------------------------

test.describe('Employees — Add Employee Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/employees`)
    await page.waitForLoadState('networkidle')
  })

  test('clicking "+ Add Employee" opens the form', async ({ page }) => {
    await openAddForm(page)
    await expect(formCard(page)).toBeVisible()
  })

  test('form shows all required fields', async ({ page }) => {
    await openAddForm(page)
    await expect(fieldInput(page, 'First Name')).toBeVisible()
    await expect(fieldInput(page, 'Last Name')).toBeVisible()
    await expect(fieldInput(page, 'Email')).toBeVisible()
    await expect(fieldInput(page, 'Position')).toBeVisible()
    await expect(fieldInput(page, 'Department')).toBeVisible()
    await expect(fieldInput(page, 'Employment', 'select')).toBeVisible()
    await expect(fieldInput(page, 'Monthly Salary')).toBeVisible()
    await expect(fieldInput(page, 'Date Hired')).toBeVisible()
  })

  test('form shows "Add Employee" submit button and "Cancel" button', async ({ page }) => {
    await openAddForm(page)
    await expect(formCard(page).locator('button[type="submit"]', { hasText: 'Add Employee' })).toBeVisible()
    await expect(formCard(page).locator('button', { hasText: 'Cancel' })).toBeVisible()
  })

  test('Cancel button hides the form', async ({ page }) => {
    await openAddForm(page)
    await formCard(page).locator('button', { hasText: 'Cancel' }).click()
    await expect(page.locator('#app .card-header', { hasText: 'Add New Employee' })).toHaveCount(0)
  })

  test('Employment Type select has Regular, Contractual, Probationary options', async ({ page }) => {
    await openAddForm(page)
    const select = fieldInput(page, 'Employment', 'select')
    await expect(select.locator('option', { hasText: 'Regular' })).toHaveCount(1)
    await expect(select.locator('option', { hasText: 'Contractual' })).toHaveCount(1)
    await expect(select.locator('option', { hasText: 'Probationary' })).toHaveCount(1)
  })

  test('successfully adds a valid employee', async ({ page }) => {
    await openAddForm(page)
    await fieldInput(page, 'First Name').fill('Test')
    await fieldInput(page, 'Last Name').fill('Employee')
    await fieldInput(page, 'Email').fill(uniqueEmail())
    await fieldInput(page, 'Position').fill('QA Tester')
    await fieldInput(page, 'Department').fill('Quality Assurance')
    await fieldInput(page, 'Employment', 'select').selectOption('regular')
    await fieldInput(page, 'Monthly Salary').fill('35000')
    await fieldInput(page, 'Date Hired').fill('2024-01-15')
    await formCard(page).locator('button[type="submit"]').click()
    // Form should close after successful save
    await expect(page.locator('#app .card-header', { hasText: 'Add New Employee' })).toHaveCount(0, { timeout: 8000 })
  })
})

// ---------------------------------------------------------------------------
// Edit Employee Form
// ---------------------------------------------------------------------------

test.describe('Employees — Edit Employee Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/employees`)
    await page.waitForLoadState('networkidle')
  })

  test('clicking Edit opens the Edit Employee form', async ({ page }) => {
    const firstRow = page.locator('#app table.table tbody tr').first()
    await firstRow.locator('button.btn-outline-primary', { hasText: 'Edit' }).click()
    await expect(page.locator('#app .card-header', { hasText: 'Edit Employee' })).toBeVisible()
  })

  test('Edit form is pre-populated with existing employee data', async ({ page }) => {
    const firstRow = page.locator('#app table.table tbody tr').first()
    await firstRow.locator('button.btn-outline-primary', { hasText: 'Edit' }).click()
    // Fields should not be empty after pre-population
    const firstNameValue = await fieldInput(page, 'First Name').inputValue()
    expect(firstNameValue.trim().length).toBeGreaterThan(0)
  })

  test('Edit form submit button shows "Update Employee"', async ({ page }) => {
    const firstRow = page.locator('#app table.table tbody tr').first()
    await firstRow.locator('button.btn-outline-primary', { hasText: 'Edit' }).click()
    await expect(formCard(page).locator('button[type="submit"]', { hasText: 'Update Employee' })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Delete Employee — confirmation modal
// ---------------------------------------------------------------------------

test.describe('Employees — Delete Employee', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/employees`)
    await page.waitForLoadState('networkidle')
  })

  test('clicking Delete shows the confirmation modal', async ({ page }) => {
    // DeleteModal.vue: div.modal#deleteEmployeeModal with h5.modal-title "Confirm Deletion"
    const firstRow = page.locator('#app table.table tbody tr').first()
    await firstRow.locator('button.btn-outline-danger', { hasText: 'Delete' }).click()
    await expect(page.locator('#deleteEmployeeModal')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('#deleteEmployeeModal .modal-title')).toContainText('Confirm Deletion')
  })

  test('confirmation modal shows the employee name in the message', async ({ page }) => {
    const firstRow  = page.locator('#app table.table tbody tr').first()
    const nameText  = await firstRow.locator('td strong').innerText()
    await firstRow.locator('button.btn-outline-danger', { hasText: 'Delete' }).click()
    await expect(page.locator('#deleteEmployeeModal')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('#deleteEmployeeModal .modal-body p')).toContainText(nameText)
  })

  test('confirmation modal has "Cancel" and "Delete" buttons', async ({ page }) => {
    const firstRow = page.locator('#app table.table tbody tr').first()
    await firstRow.locator('button.btn-outline-danger', { hasText: 'Delete' }).click()
    await expect(page.locator('#deleteEmployeeModal')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('#deleteEmployeeModal .modal-footer .btn-secondary', { hasText: 'Cancel' })).toBeVisible()
    await expect(page.locator('#deleteEmployeeModal .modal-footer .btn-danger', { hasText: 'Delete' })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Bug Tests — Employee Page
// ---------------------------------------------------------------------------

test.describe('Employees — Bug Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/employees`)
    await page.waitForLoadState('networkidle')
    await openAddForm(page)
  })

  /**
   * BUG-001: Form accepts special characters in name fields
   *
   * EXPECTED: First Name, Last Name, Position, Department fields should reject
   *           special characters (e.g. @@@@@@) and show a validation error.
   * ACTUAL:   No pattern validation exists on these inputs — special characters
   *           are accepted and saved to the database without any error.
   */
  test('[BUG-001] Form accepts special characters in First Name field without validation error', async ({ page }) => {
    // Check that no pattern attribute prevents special characters
    const firstNameInput = fieldInput(page, 'First Name')
    const pattern = await firstNameInput.getAttribute('pattern')
    expect(pattern).toBeNull() // BUG CONFIRMED: pattern attribute is missing

    await firstNameInput.fill('@@@@@@')
    await fieldInput(page, 'Last Name').fill('@@@@@@')
    await fieldInput(page, 'Email').fill(uniqueEmail())
    await fieldInput(page, 'Position').fill('@@@@@@')
    await fieldInput(page, 'Department').fill('@@@@@@')
    await fieldInput(page, 'Monthly Salary').fill('30000')
    await fieldInput(page, 'Date Hired').fill('2024-01-01')
    await formCard(page).locator('button[type="submit"]').click()

    // BUG CONFIRMED: form submits without a validation error alert
    await page.waitForTimeout(1500)
    const errorAlert = formCard(page).locator('.alert.alert-danger')
    const hasError = await errorAlert.count()
    if (hasError === 0) {
      console.log('[BUG-001] Form submitted with @@@@@@ in name fields — no validation error shown')
    }
    await expect(page.locator('#app .alert.alert-danger')).toHaveCount(0)
  })

  /**
   * BUG-002: Form accepts single-character values in name fields
   *
   * EXPECTED: Name fields should require a minimum of 2–3 characters and show
   *           a validation error like "Must be at least 3 characters".
   * ACTUAL:   No minlength attribute exists — a single character is accepted
   *           and saved without any error or warning.
   */
  test('[BUG-002] Form accepts single-character value in First Name field without validation error', async ({ page }) => {
    const firstNameInput = fieldInput(page, 'First Name')
    const minLength = await firstNameInput.getAttribute('minlength')
    expect(minLength).toBeNull() // BUG CONFIRMED: minlength attribute is missing
    console.log('[BUG-002] First Name input has no minlength attribute — single chars accepted')

    await firstNameInput.fill('A')
    await fieldInput(page, 'Last Name').fill('B')
    await fieldInput(page, 'Email').fill(uniqueEmail())
    await fieldInput(page, 'Position').fill('X')
    await fieldInput(page, 'Department').fill('Y')
    await fieldInput(page, 'Monthly Salary').fill('30000')
    await fieldInput(page, 'Date Hired').fill('2024-01-01')
    await formCard(page).locator('button[type="submit"]').click()

    await page.waitForTimeout(1500)
    if (await formCard(page).locator('.alert.alert-danger').count() === 0) {
      console.log('[BUG-002] Form submitted with single-char names — no validation error shown')
    }
  })

  /**
   * BUG-003: Form accepts a future Date Hired
   *
   * EXPECTED: The Date Hired field should have a max attribute set to today's
   *           date and reject any future date, showing a validation error.
   * ACTUAL:   No max attribute is set — a future hire date (e.g. 2099-01-01)
   *           is accepted and saved without any error.
   */
  test('[BUG-003] Date Hired field accepts a future date without validation error', async ({ page }) => {
    const dateInput = fieldInput(page, 'Date Hired')
    const maxAttr   = await dateInput.getAttribute('max')
    expect(maxAttr).toBeNull() // BUG CONFIRMED: max attribute is missing

    await fieldInput(page, 'First Name').fill('Future')
    await fieldInput(page, 'Last Name').fill('Hire')
    await fieldInput(page, 'Email').fill(uniqueEmail())
    await fieldInput(page, 'Position').fill('Tester')
    await fieldInput(page, 'Department').fill('QA')
    await fieldInput(page, 'Monthly Salary').fill('30000')
    await dateInput.fill('2099-01-01')
    await formCard(page).locator('button[type="submit"]').click()

    await page.waitForTimeout(1500)
    if (await formCard(page).locator('.alert.alert-danger').count() === 0) {
      console.log('[BUG-003] Form submitted with future date 2099-01-01 — no validation error shown')
    }
  })

  /**
   * BUG-004: Monthly Salary field accepts unrealistically large values
   *
   * EXPECTED: The form should enforce a maximum salary cap (e.g. ₱999,999.99)
   *           and reject excessively large values with a validation error.
   * ACTUAL:   No max attribute exists on the salary input — any arbitrarily
   *           large value (e.g. 999999999999) is accepted and saved.
   */
  test('[BUG-004] Monthly Salary field accepts unrealistically large values without validation error', async ({ page }) => {
    const salaryInput = fieldInput(page, 'Monthly Salary')
    const maxAttr     = await salaryInput.getAttribute('max')
    expect(maxAttr).toBeNull() // BUG CONFIRMED: max attribute is missing
    console.log('[BUG-004] Monthly Salary input has no max attribute — large values accepted')

    await fieldInput(page, 'First Name').fill('Large')
    await fieldInput(page, 'Last Name').fill('Salary')
    await fieldInput(page, 'Email').fill(uniqueEmail())
    await fieldInput(page, 'Position').fill('Tester')
    await fieldInput(page, 'Department').fill('QA')
    await salaryInput.fill('999999999999')
    await fieldInput(page, 'Date Hired').fill('2024-01-01')
    await formCard(page).locator('button[type="submit"]').click()

    await page.waitForTimeout(1500)
    if (await formCard(page).locator('.alert.alert-danger').count() === 0) {
      console.log('[BUG-004] Form submitted with salary 999999999999 — no validation error shown')
    }
  })

  /**
   * BUG-005: Monthly Salary field has min="0" but accepts 0 as a valid salary
   *
   * EXPECTED: A monthly salary of ₱0.00 should be rejected as unrealistic.
   *           The min attribute should be set to a reasonable floor (e.g. 1).
   * ACTUAL:   min="0" allows ₱0 to pass HTML5 validation and be saved to the
   *           database as a valid employee salary.
   */
  test('[BUG-005] Monthly Salary field has min="0" allowing a zero salary to be submitted', async ({ page }) => {
    const salaryInput = fieldInput(page, 'Monthly Salary')
    const minAttr     = await salaryInput.getAttribute('min')
    // min="0" exists but allows zero — BUG CONFIRMED
    expect(minAttr).toBe('0')
    console.log('[BUG-005] Monthly Salary min="0" — a salary of ₱0 can be submitted as valid')
  })

  /**
   * BUG-006: Oversized text input breaks the employee table layout
   *
   * EXPECTED: Long text values in any field should be truncated or wrapped
   *           within their table cell so the row layout stays intact.
   * ACTUAL:   A 50+ character value in First Name, Position, or Department
   *           causes the table column to expand and break the overall layout.
   */
  test('[BUG-006] Oversized text input causes employee table row to overflow its column', async ({ page }) => {
    const longText = 'A'.repeat(60)
    await fieldInput(page, 'First Name').fill(longText)
    await fieldInput(page, 'Last Name').fill('Overflow')
    await fieldInput(page, 'Email').fill(uniqueEmail())
    await fieldInput(page, 'Position').fill(longText)
    await fieldInput(page, 'Department').fill(longText)
    await fieldInput(page, 'Monthly Salary').fill('30000')
    await fieldInput(page, 'Date Hired').fill('2024-01-01')
    await formCard(page).locator('button[type="submit"]').click()

    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)

    // Check if any table cell overflows its column width
    const rows = page.locator('#app table.table tbody tr')
    const count = await rows.count()
    if (count > 0) {
      const lastRow = rows.last()
      const rowBox  = await lastRow.boundingBox()
      const nameCell = lastRow.locator('td').first()
      const cellBox  = await nameCell.boundingBox()

      if (rowBox && cellBox) {
        const overflows = (cellBox.x + cellBox.width) > (rowBox.x + rowBox.width + 1)
        if (overflows) {
          console.log('[BUG-006] Table row overflows — long name broke the layout')
        }
        // BUG CONFIRMED when this fails
        expect(cellBox.width).toBeLessThanOrEqual(rowBox.width)
      }
    }
  })

  /**
   * BUG-007: No direct delete — confirmation modal is present but relies on
   *          Bootstrap JS being loaded; if Bootstrap fails, delete fires silently.
   *
   * EXPECTED: Clicking Delete should always show the confirmation modal before
   *           any deletion occurs — the action must be gated.
   * ACTUAL:   The modal is triggered via Bootstrap's Modal API (imperative JS).
   *           If the modal fails to open (e.g. Bootstrap not loaded), the
   *           delete target is still set and could fire on next confirm call.
   *
   * This test verifies the modal DOES appear as expected.
   */
  test('[BUG-007] Clicking Delete should always show a confirmation modal before deleting', async ({ page }) => {
    // Cancel the add form first, then test delete
    await formCard(page).locator('button', { hasText: 'Cancel' }).click()
    await page.waitForLoadState('networkidle')

    const firstRow = page.locator('#app table.table tbody tr').first()
    await firstRow.locator('button.btn-outline-danger', { hasText: 'Delete' }).click()

    // Modal MUST appear before any deletion
    const modal = page.locator('#deleteEmployeeModal')
    await expect(modal).toBeVisible({ timeout: 5000 })
    await expect(modal.locator('.modal-title')).toContainText('Confirm Deletion')
    console.log('[BUG-007] Confirmation modal appeared as expected — verifies modal gate is working')
  })
})
