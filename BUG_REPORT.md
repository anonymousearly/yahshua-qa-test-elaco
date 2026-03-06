**Title:** BUG-001 - Dashboard - UI Consistency: Average Monthly Salary Card has Alignment Mismatch compared to other Analytics Card
**Severity:** 4 - Low

**Steps to Reproduce:**
1. Navigate to the Dashboard page
2. Find the Analytics section containing the four summary cards.
3. Compare the Average Monthly Salary card (4th position) with the other three cards (Active Employees, Payroll Records, Departments).

**Expected Result:** The Average Monthly Salary card should have the same centered text alignment and text sizes from the other analytics cards.
**Actual Result:** The Average Monthly Salary card is inconsistent, the number is too big and the text isn't aligned like the other analytics cards.

**Evidence:**
  ![[BUG-001.png]]

---

**Title:** BUG-002 - Employees - Text Fields Allow Special Characters as Valid Input
**Severity:** 1 - Critical

**Steps to Reproduce:**
1. Navigate to the Employees page
2. Click "Add New Employee" to open the form
3. Enter special characters (e.g. `@@@@@@`) into the First Name, Last Name, Position, and Department fields
4. Enter an invalid email format (e.g. `#@gmail.com`) in the Email field
5. Click "Add Employee" to submit the form

**Expected Result:** The form should detect invalid characters in name and text fields, block the submission, and display an appropriate validation error message.
**Actual Result:** The form successfully submits and saves the entry with `@@@@@@@@` across all text fields and `#@gmail.com` as the email. No error, highlight, or warning is triggered.

Evidence:
  ![[BUG-002 ADDING DATA.png]] ![[BUG-002 RESULT.png]]
  
---

**Title:** BUG-003 - Employee - Text Fields Accepts Excessively Long Inputs which results breaking the Employee Table UI
**Severity:** 2 - High

**Steps to Reproduce:**
1. Navigate to the Employees page
2. Click "Add New Employee" to open the form
3. Input a text of at least 50 characters in any text field (e.g. First Name, Position, or Department)
4. Click "Add Employee" to submit.
5. Observe the Employee List table after the record is saved.

**Expected Result:** Long text values should be truncated or wrapped cleanly within their respective table columns, preserving the overall table structure and readability.
**Actual Result:** Despite an apparent 100-character limit, the saved long-text entry still causes the table columns to misalign and the UI layout to break.

Evidence:
  ![[BUG-003.png]]

---
**Title:** BUG-004 - Dashboard - Excessively Long Text Input from Employee Records Breaks the Dashboard UI
**Severity:** 2 - High

**Steps to Reproduce:**
1. Navigate to the Employees page
2. Click "Add New Employee" to open the form
3. Input a text of atleast 50 characters in any text field (e.g. First Name, Position, or Department)
4. Click "Add Employee" to submit
5. Navigate back to the Dashboard page
6. Observe the "Recent Payroll Records" panel

**Expected Result:** The Employee names displayed in the Recent Payroll Records table should be truncated or wrapped cleanly within their row, mainting the table structure and keeping the payroll amount value visible and properly aligned.
**Actual Result:** The excessively long name overflows its container, pushing the payroll amount to the far right and outside the normal layout boundary. This cause breaking the row alignment and making the panel difficult to read.

Evidence:
  ![[BUG-004.png]]

---

**Title:** BUG-005 - Employee - Name and Text Fields Accept Single Characters and Special Characters as Valid Input
**Severity:** 2 - High

**Steps to Reproduce:**
1. Navigate to the Employees page
2. Click "Add New Employee" to open the form
3. Enter a single character (e.g. `1`, `#`, or `a`) in the First Name, Last Name, Position, and Department fields
4. Click "Add Employee" to submit

**Expected Result:** The form should require a minimum of 3 or more characters on all name and text fields, displaying an inline error or validation such as "Must be at least 3 characters" to prevent invalid entries from being saved.
**Actual Result:** A single characters and special characters is accepted as valid input and the record is saved successfully with no error or warning shown.

Evidence:
  ![[BUG-005.png]]

---
  
**Title:** BUG-006 - Employee - Monthly Salary Field Accepts Unrealistically Large Values
**Severity:** 2 - High

**Steps to Reproduce:**
1. Navigate to the Employees page
2. Click "Add New Employee" to open the form
3. Enter an unrealistically large value (e.g. `99,999,999.00` or `999,999,999,999.99`) in the Monthly Salary (₱) field
4. Click "Add Employee" to submit the form
5. Observe the saved record in the Employee list

**Expected Result:** The system should enforce a realistic maximum salary cap and reject any value exceeding it, displaying a validation error such as "Please enter a valid salary amount".
**Actual Result:** The form accepts and saves unrealistically large salary values without any validation error or warning, resulting in multiple employee records showing salaries of ₱99,999,999.00 and ₱999,999,999,999.99 in the Employee list.

Evidence:
  ![[BUG-006 UNREALISTIC SALARY.png]]

---

**Title:** BUG-007 - Calculator - System Allows Payroll Calculation Before Employee's Hire Date
**Severity:** 2 - High

**Steps to Reproduce:**
1. Navigate to the Employees page and note the Date Hired of an employee (e.g. an employee with Date Hired `2025-12-06`)
2. Navigate to the Calculator page
3. Select the same employee from the Employee dropdown
4. Set the Month to a month before the employee's hire date (e.g. November 2025)
5. Click the "Calculate Payroll"

**Expected Result:** The system should validate the selected payroll period against the employee's Date Hired and block the request calculation, displaying an error like "Cannot calculate payroll for a period before the employee's hire date".
**Actual Result:** The system does not validate the payroll period against the hire date and successfully generates a Payroll Result for November 2025, even though the employee was not yet hired until December 6, 2025.

Evidence:
  ![[BUG-007 ACTUAL DATE HIRED.png]]![[BUG-007.png]]

---

**Title:** BUG-008 - Calculator - Entering "0" amount in Override Salary Does Not Override the Employee's Recorded Salary
**Severity:** 3 - Medium
**Steps to Reproduce:**

1. Navigate to the Calculator page
2. Select an employee from the dropdown
3. Set the Month and Year (e.g. March 2026)
4. Enter `0` in the Override Salary (₱) field
5. Click "Calculate Payroll"

**Expected Result:** Entering `0` amount in the Override Salary field should either be treated as an empty/blank input and fall back to the employee's recorded monthly salary, or the system should display a validation error such as "Override Salary must be greater than 0".
**Actual Result:** The system does not treat `0` as blank and does not throw a validation error and proceeds to calculate using the employee's recorded salary of ₱613.00 instead. This leaves the user with no feedback on why `0` value was not applied and became ₱613.00.

Evidence:
  ![[BUG-008.png]]

---

**Title:** BUG-009 - Calculator - Override Salary Accepts Single-digit Low Values Resulting in Negative Net Pay
**Severity:** 2 - High

**Steps to Reproduce:**
1. Navigate to the Calculator page
2. Select an employee from the dropdown (e.g. "Odio placeat sequi delectus quod poss...")
3. Set the Month and Year (e.g. March 2026)
4. Type `1` or lower than `385` in the Override Salary (₱) field
5. Click "Calculate Payroll"

**Expected Result:** The system should validate that the Override Salary is sufficient to cover mandatory government deductions (SSS, PhilHealth, Pag-IBIG) and reject any amount that would result in a negative Net Pay, displaying a warning such as "Salary is too low to cover required government deductions".
**Actual Result:** The system accepts ₱1.00 or lower than ₱385.00 as a valid override salary and completes the calculation, producing a Net Pay of ₱-384.02 — a logically impossible result in any real payroll scenario where an employee's take-home pay cannot be a negative value.

Evidence:
  ![[BUG-009.png]]

  
---

**Title:** BUG-010 - Calculator - Override Salary Field Accepts Negative Values Resulting in Negative Basic Salary and Net Pay

**Severity:** 1 - Critical

**Steps to Reproduce:**
1. Navigate to the Calculator page
2. Select an employee from the dropdown
3. Set the Month and Year
4. Enter a negative value (e.g. `-10000`) in the Override Salary (₱) field
5. Click "Calculate Payroll"

**Expected Result:** The system should reject negative values and show a validation error such as "Salary must be a positive number".
**Actual Result:** Screenshot showing Override Salary field with `-10000` entered, Payroll Result displaying Basic Salary of ₱-10,000.00 and Net Pay of ₱-10,000.00.

Evidence:
  ![[BUG-010.png]]

---

**Title:** BUG-011 - Calculator - Year Dropdown Allows Future Years for Payroll Calculation
**Severity:** 2 - High

**Steps to Reproduce:**
1. Go to the Calculator page
2. Select any employee from the dropdown
3. Set the Year dropdown to a future year (e.g. `2029`)
4. Set any Month (e.g. December)
5. Click "Calculate Payroll"

**Expected Result:** The system should restrict the Year dropdown to the current year and past years only, blocking any future year selection.
**Actual Result:** The system accepts December 2029 as a valid payroll period and successfully generates a payroll result, allowing payroll records to be created for years that have not yet occurred.

Evidence:
  ![[BUG-011.png]]

---

**Title:** BUG-012 - Calculator - Pag-IBIG ₱200 Monthly Cap Not Applied When Salary Exceeds ₱5,000
**Severity:** 2 - High

**Steps to Reproduce:**
1. Go to the Calculator page
2. Select any employee
3. Enter amount `5001` in the Override Salary field
4. Click "Calculate Payroll"
5. Observe the Pag-IBIG Employee and Employer contribution values

**Expected Result:** Pag-IBIG Employee contribution should be ₱200.00 as the ₱200/month cap must be applied when salary exceeds ₱5,000 per the Philippine Payroll Rules reference.
**Actual Result:** Pag-IBIG Employee contribution displays ₱100.02 — the system calculates 2% of ₱5,001 without applying the ₱200 cap, indicating the salary threshold condition `salary > ₱5,000` is not being evaluated correctly.

Evidence:
  ![[BUG-012.png]]
  
---

**Title:** BUG-013 - API - Employee Endpoint Accepts Negative Monthly Salary Without Validation
**Severity:** 1 - Critical

**Steps to Reproduce:**
1. Open Postman or any API client
2. Send a `POST` request to `POST /api/employees/`
3. Set the request body with a negative `monthly_salary` value (e.g. `-100`):
```json
{
  "monthly_salary": "-100"
}
```
4. Observe the API response and status code

**Expected Result:** The API should reject negative salary values and return a `400 Bad Request` response with a validation error such as:
```json
{
  "monthly_salary": ["Salary must be a positive number"]
}
```
**Actual Result:** The API accepts `-100` as a valid monthly salary and returns a `201 Created` response, successfully saving the employee record with `"monthly_salary": "-100.00"` — bypassing the validation that exists on the frontend UI.

Evidence:
  ![[BUG-013 1.png]]
  
   `POST /api/employees/` request with `"monthly_salary": "-100"` in the request body, and the response returning `201 Created` with the record saved containing `"monthly_salary": "-100.00"`.

  
---
**Title:** BUG-014 - API - Employee Records Can Be Modified Without Authentication or Authorization
**Severity:** 1 - Critical

**Steps to Reproduce:**

1. Open Postman or any API client
2. Send a `PUT` request to `PUT /api/employees/{id}/` with any modified data
3. Observe the API response and status code

**Expected Result:** The API should require authentication and verify that the requester has admin-level authorization before allowing any modifications to employee records, returning `401 Unauthorized` or `403 Forbidden` if credentials are missing or insufficient.
**Actual Result:** The API accepts and processes the `PUT` request without any authentication, successfully updating the employee record and returning `200 OK` — any user with API access can freely modify any employee's data including sensitive fields like `monthly_salary` and `is_active`.

Evidence:
  ![[BUG-014 - can set is_active.png]]

---
**Title:** BUG-015 - API - No Server-Side Validation Allows Invalid Data to Be Saved by Bypassing the Frontend UI
**Severity:** 1 - Critical

**Steps to Reproduce:**

1. Open Postman or any API client
2. Send a `POST` request to `POST /api/employees/`
3. Include any data that the frontend UI would normally block, such as:
   - Negative salary (e.g. `"monthly_salary": "-100"`)
   - Special characters in name fields (e.g. `"first_name": "@@@@@@"`)
   - Single character values (e.g. `"first_name": "a"`)
   - Invalid email format (e.g. `"email": "#@gmail.com"`)
   - Future date hired (e.g. `"date_hired": "2099-01-01"`)
4. Observe the API response and status code

**Expected Result:** API should validate all incoming data server-side and return `400 Bad Request` for any invalid input, regardless of the request source.
**Actual Result:** API returns `201 Created` and saves invalid data (e.g. `"monthly_salary": "-100.00"`) that the frontend would normally block — server-side validation is absent, allowing direct API calls to bypass all frontend restrictions and insert corrupt data into the database.

Evidence:
  ![[BUG-015.png]]

---

**Title:** BUG-016 - API - DELETE Employee Soft Deletes Record Instead of Permanently Removing It
**Severity:** 2 - High

**Steps to Reproduce:**
1. Open Postman or any API client
2. Note an existing employee's `id` and `is_active` status
3. Send a `DELETE` request to `DELETE /api/employees/{id}/`
4. Send a `GET` request to `GET /api/employees/{id}/` to verify deletion
5. Observe the response

**Expected Result:** `DELETE /api/employees/{id}/` should permanently remove the employee record from the database and return `204 No Content` with an empty response body.
**Actual Result:** The endpoint does not permanently delete the record — instead it only sets `"is_active": false` (soft delete), the record still exists in the database and remains retrievable via `GET /api/employees/{id}/`, returning `200 OK` with the employee data intact.

Evidence:

BEFORE -> DELETE REQUEST -> AFTER
  ![[BUG-016 BEFORE THE DELETE FUNCTION.png]]
  ![[BUG-016 - DELETE FUNCTION IN EMPLOYEE PROOF 1.png]]
  ![[BUG-016 - AFTER THE DELETE REQUEST.png]]

---

**Title:** BUG-017 - API - POST /api/calculate-payroll/ Accepts Negative Override Salary and Returns 200 OK Instead of 400 Bad Request
**Severity:** 1 - Critical

**Steps to Reproduce:**
1. Send a `POST` request to `POST /api/calculate-payroll/`
2. Include a negative `override_salary` value:
```json
{
  "employee_id": 13,
  "period_month": 12,
  "period_year": 2029,
  "override_salary": "-1000000000.99"
}
```
3. Observe the response


**Expected Result:** API should reject negative salary values and return `400 Bad Request`.
**Actual Result:** API returns `200 OK` and saves the record with `"basic_salary": "-1000000000.99"` and `"net_pay": "-1000000000.99"` with all deductions at `0.00`.

Evidence:
  ![[BUG-017.png]]

---

**Title:** BUG-018 - API - POST /api/calculate-payroll/ Accepts Future period_year and Returns 201 Created
**Severity:** 2 - High

**Steps to Reproduce:**
1. Send a `POST` request to `POST /api/calculate-payroll/`
2. Set `period_year` to a future year:
```json
{
  "employee_id": 13,
  "period_month": 12,
  "period_year": 2099
}
```
3. Observe the response

**Expected Result:** API should reject future period dates and return `400 Bad Request` with an error such as "Payroll cannot be calculated for a future period".
**Actual Result:** API accepts the future date and returns `201 Created`, successfully saving a payroll record for `period_year: 2099` with `"net_pay": "-9999999999.00"`.

Evidence:
  ![[BUG-018.png]]

  
---

**Title:** BUG-019 - API - POST /api/calculate-payroll/ Accepts period_year Before Employee Hire Date and Returns 201 Created
**Severity:** 2 - High

**Steps to Reproduce:**
1. Send a `POST` request to `POST /api/calculate-payroll/`
2. Set `period_year` to a year before the employee's hire date:
```json
{
  "employee_id": 13,
  "period_month": 12,
  "period_year": 2000
}
```
3. Observe the response

**Expected Result:** API should validate the payroll period against the employee's hire date and return `400 Bad Request` with an error message.
**Actual Result:** API accepts the request and returns `201 Created`, successfully saving a payroll record for `period_year: 2000` — a year that predates the employee's hire date — with `"net_pay": "-9999999999.00"`.

Evidence:
  ![[BUG-019.png]]

---

**Title:** BUG-020 - API - POST /api/calculate-payroll/ Returns 200 OK Instead of 404 Not Found for Non-Existent Employee ID
**Severity:** 3 - Medium

**Steps to Reproduce:**
1. Send a `POST` request to `POST /api/calculate-payroll/`
2. Use a non-existent `employee_id`:
```json
{
  "employee_id": 9999,
  "period_month": 3,
  "period_year": 2026
}
```
3. Observe the response status code and body

**Expected Result:** API should return `404 Not Found` when the specified `employee_id` does not exist in the system.
**Actual Result:** API correctly returns an error message "Employee with id=9999 does not exist." but uses the wrong HTTP status code `200 OK` instead of `404 Not Found`.

Evidence:
  ![[BUG-020.png]]

---

**Title:** BUG-021 - API - POST /api/calculate-payroll/ Accepts Unrealistically Large basic_salary and Returns 200 OK
**Severity:** 2 - High

**Steps to Reproduce:**
1. Send a `POST` request to `POST /api/calculate-payroll/`
2. Include an unrealistically large `basic_salary`:
```json
{
  "employee_id": 13,
  "period_month": 3,
  "period_year": 2026,
  "basic_salary": "999999999.00"
}
```
3. Observe the response

**Expected Result:** API should enforce a maximum salary limit and return `400 Bad Request` for unrealistically large values.
**Actual Result:** API returns `200 OK` and saves the record with `"basic_salary": "-9999999999.00"` — the submitted large value is stored as a negative number, indicating a possible integer overflow on the server side.

Evidence:
  ![[BUG-021.png]]

---

**Title:** BUG-022 - API - DELETE /api/payroll-history/{id}/ Returns 200 OK Instead of 204 No Content and Does Not Delete the Record
**Severity:** 2 - High

**Steps to Reproduce:**
1. Open Postman or any API client
2. Send a `DELETE` request to `DELETE /api/payroll-history/{id}/` with a valid record ID
3. Observe the response status code and body
4. Send a `GET` request to `GET /api/payroll-history/{id}/` to verify if the record still exists

**Expected Result:** `DELETE /api/payroll-history/{id}/` should permanently remove the payroll record and return `204 No Content` with an empty response body.
**Actual Result:** API returns `200 OK` and retrieves the record data instead of deleting it — the `DELETE` method is behaving like a `GET` request, returning the record contents without performing any deletion.
Evidence:
  ![[BUG-022.png]]