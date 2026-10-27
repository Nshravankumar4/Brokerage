# SR Brokerage Ledger -- Comprehensive End-to-End System Architecture & Technical Specification

> **System Title:** SR Brokerage Ledger -- Enterprise Fleet Logistics & Financial Accounts Management  
> **Author & Developer:** Shravan Kumar  
> **Organization:** Transport Brokerage Ledger Pvt Ltd  
> **Current Application Version:** Upgrade 1.2 (Active Production Build)  
> **UI Requirement:** Excel-style interactive worksheet within the existing `index.html`  
> **Reference Workbooks:**  
>   * `E:\TR\New\Final Sheet Broker.xlsx` (Authoritative 3-Sheet Physical Split, Created 26-Oct-2026)  
>   * `E:\TR\P1\Final Sheet Broker.xlsx`  
>   * `E:\TR\P1\BROKER DETAILS ADVANCE BALC DETAILS.xlsx`  
> **Cloud Backend:** Google Apps Script Web App Deployment Version 1 (26 Oct 2026, 22:23)  
> **Deployment ID:** `AKfycbzq4WlQ5UXTk2QcIyiMMPtZcLWroAObqVryd2U0CGeS0I-JRoqQiwi0JmVcUNjPiJLU`  
> **Live API URL:** `https://script.google.com/macros/s/AKfycbzq4WlQ5UXTk2QcIyiMMPtZcLWroAObqVryd2U0CGeS0I-JRoqQiwi0JmVcUNjPiJLU/exec`  
> **Target Spreadsheet ID:** `1wCu03TqXMhokFYarECDBCFDd_dMWx5LpLtiZL2iryiU`  

**Primary Requirement:** Maintain one existing web application, one existing main HTML page (`index.html`), the existing Google Apps Script backend (`backend/Code.gs`), and three independent payment-status views. Do not create a separate frontend application or merge the three statuses.

---

## 1. System Architecture and High-Level Design

SR Brokerage Ledger is a transport brokerage and financial accounting application that provides an Excel-style interface for managing shipment records, advances, freight, COD, pending amounts, POD status, and settlement information.

The frontend communicates with the existing Google Apps Script backend, which manages records in the existing Google Spreadsheet.

### 1.1 Architecture Diagram

```
+--------------------------------------------------------------+
|                 SR BROKERAGE LEDGER                          |
|                 Existing index.html                          |
|                                                              |
|  Excel-style toolbar                                         |
|  Search | Add Trip | Edit | Delete | Refresh | Export XLSX   |
|                                                              |
|  Worksheet Tabs:                                             |
|  A/TO-PAY | F/TO-PAY | TOBILLED                              |
|                                                              |
|  Interactive Spreadsheet Grid                                |
|  Sticky Headers | Row Numbers | Cell Selection | Scrolling   |
+-----------------------------+--------------------------------+
                              |
                              v
+--------------------------------------------------------------+
|                    EXISTING JAVASCRIPT                       |
|                                                              |
|  js/auth.js                                                  |
|  Authentication and session handling                         |
|                                                              |
|  js/table.js                                                 |
|  Excel-style grid, tab switching, search, filtering          |
|                                                              |
|  js/calculations.js                                          |
|  Status-specific accounting calculations                     |
|                                                              |
|  js/data.js                                                  |
|  Existing state, cache, and synchronization logic            |
|                                                              |
|  js/api.js                                                   |
|  API communication and deployment configuration              |
+-----------------------------+--------------------------------+
                              |
                              v
+--------------------------------------------------------------+
|              GOOGLE APPS SCRIPT BACKEND                      |
|              Existing Code.gs (Version 2)                    |
|                                                              |
|  Authentication and validation                               |
|  CRUD operations                                             |
|  Status routing                                              |
|  Duplicate detection                                         |
|  Safe status changes                                         |
|  Spreadsheet locking and error handling                      |
+-----------------------------+--------------------------------+
                              |
              +---------------+---------------+
              |               |               |
              v               v               v
         TOBILLED         A-TO-PAY         F-TO-PAY
         Worksheet        Worksheet        Worksheet
              |               |               |
              +---------------+---------------+
                              |
                              v
                Existing historical data and
                authorized migration procedures
```

The existing `final` worksheet is safely preserved during migration until records are confirmed in the destination worksheets.

---

## 2. Excel-Style UI -- Mandatory Requirement

### 2.1 Single-Page Architecture
The complete user interface remains inside the existing `index.html`.
- Single-page application without separate HTML documents.
- Direct Excel spreadsheet appearance loaded by default upon login.
- Reuses existing JavaScript modules (`js/auth.js`, `js/table.js`, `js/calculations.js`, `js/data.js`, `js/api.js`) and CSS (`css/styles.css`).
- Preserves full authentication, API integration, and mathematical integrity.
- Employs the existing `backend/Code.gs` without backend duplication.

### 2.2 Excel-Style Toolbar
A compact, highly functional spreadsheet toolbar is positioned above the grid:
- **Application Title:** SR Brokerage Ledger -- Enterprise Fleet Logistics & Financial Accounts Management.
- **Global Search:** Immediate filtering across LR NO, Truck NO, Transporter Name, and Route.
- **Month Selector & Date Range Pickers:** Fast chronological filtering.
- **Add Trip Button:** Opens the modal with dynamic status modes and auto-calculations.
- **Refresh Data Button:** Triggers real-time sync with Google Sheets.
- **Download Excel (.xlsx):** Downloads an authentic multi-sheet Excel file.
- **Zoom Controls:** 80% Fit, 90%, 100%, and 115% scaling for any screen size.

### 2.3 Three Independent Worksheet Tabs
The user interface exposes strictly the three authoritative payment-status tabs:
1. `TOBILLED` (Default active sheet)
2. `A/TO-PAY`
3. `F/TO-PAY`

Each tab displays strictly the records belonging to that physical worksheet.

The physical Google Sheets worksheet names are:
| Application Status | Physical Worksheet Name |
|:---|:---|
| `TOBILLED` | `TOBILLED` |
| `A/TO-PAY` | `A-TO-PAY` |
| `F/TO-PAY` | `F-TO-PAY` |

Google Sheets disallows forward slash (`/`) in sheet names; hyphens (`-`) are cleanly mapped in the backend while slashes are preserved in the UI display.

### 2.4 Spreadsheet Grid
The interactive HTML table features:
- Excel column headers with letters (A through AB).
- Dedicated row numbers starting at 1.
- Sticky column headers and sticky row numbers during vertical and horizontal scrolling.
- Compact row heights (32px) and authentic cell borders.
- Row hover effects and selected-row highlighting.
- Clean right-alignment for amounts, center-alignment for dates and status, left-alignment for names and routes.
- Standard Indian Rupee (INR) formatting: `Rs. XX,XXX`.
- Fully responsive scrolling on desktop, laptop, tablet, and mobile.

### 2.5 Editing Behavior
- Selecting an edit button opens the shipment modal pre-populated with existing values.
- Switching payment modes recalculates dependent fields without wiping entered amounts (Freight, T/M).
- Strict duplicate LR NO checking across all three destination worksheets.
- Confirmation on deletion with administrative privilege checks.

---

## 3. Authoritative Workbook and Schema Rules

The reference workbook `E:\TR\New\Final Sheet Broker.xlsx` provides the authoritative physical worksheet layouts.

### 3.1 Canonical 28-Field Record Model
The canonical application data model consists of 28 fields (A through AB):

| Col | Field Header | Data Type | Notes |
|:---:|:---|:---|:---|
| **A** | `SL NO` | Number | Sequential serial number |
| **B** | `TRSP NAME` | Text | Transporter agency name |
| **C** | `DATE` | Date | Shipment dispatch date |
| **D** | `LR NO` | Text | Unique Lorry Receipt Number |
| **E** | `TRUCK NO` | Text | Vehicle registration number |
| **F** | `FROM` | Text | Loading origin |
| **G** | `TO` | Text | Unloading destination |
| **H** | `ACCOUNT NO` | Text | Transporter bank account number |
| **I** | `IFSC CODE` | Text | Bank IFSC code |
| **J** | `PAYMENT MADE` | Text | Payment institution (e.g. SBI) |
| **K** | `FRIGHT` | Currency | Gross freight value |
| **L** | `DATE` | Date | Advance 1 date |
| **M** | `ToPayStatus` | Text | `TOBILLED`, `A/TO-PAY`, or `F/TO-PAY` |
| **N** | `T/M` | Currency | Tapal / Mamul deduction |
| **O** | `ADVANCE` | Currency | Advance payment 1 |
| **P** | `DATE 2` | Date | Advance 2 date |
| **Q** | `ADVANCE2` | Currency | Advance payment 2 |
| **R** | `DATE3` | Date | Advance 3 date |
| **S** | `ADVANCE3` | Currency | Advance payment 3 |
| **T** | `POD RECD Date` | Date | Proof of Delivery date |
| **U** | `Cash on Delivery (COD) :A/Topay&Ftopay` | Currency | Destination collection amount |
| **V** | `Pending Amount: Tobilled` | Currency | Initial pending balance |
| **W** | `Extra Amount` | Currency | Halting / extra charges |
| **X** | `PM/PA Date` | Date | Payment Mamul date |
| **Y** | `P/M` | Currency | Payment Mamul deduction |
| **Z** | `Pending Amount` | Currency | Final net balance |
| **AA** | `POD Amount Status` | Text | `DONE` or `PENDING` |
| **AB** | `REMARKS / NOTE` | Text | Trip notes & delivery annotations |

---

## 4. Status-Specific Worksheet Requirements

### 4.1 TOBILLED (29 Columns in Reference / 27 Columns Displayed)
- **Applicable Fields:** Freight (K), T/M (N), Advance 1 (O), Date 1 (L), Advance 2 (Q), Date 2 (P), Advance 3 (S), Date 3 (R), POD Date (T), Extra Amount (W), PM Date (X), P/M (Y), Pending Amount (Z), POD Status (AA).
- **Non-Applicable Field:** COD (Col U) is not used and is hidden.
- **Formulas:**
  $$\text{Initial Pending (V)} = K - N - O - Q - S$$
  $$\text{Final Net Pending (Z)} = V + W - Y$$
  $$\text{POD Status (AA)} = \text{IF}(Z = 0 \text{ AND } T \neq \text{""}, \text{"DONE"}, \text{"PENDING"})$$

### 4.2 F/TO-PAY (27 Columns)
- **Applicable Fields:** Freight (K), T/M (N), POD Date (T), COD (U), POD Status (AA).
- **Non-Applicable Fields:** Advances 1-3, Extra Amount, PM Date, P/M are blocked; Pending ToBilled (Col V) is hidden.
- **Formulas:**
  $$\text{COD (U)} = K \quad (\text{Full Freight})$$
  $$\text{Pending Balance (Z)} = 0 \quad (\text{Nil})$$
  $$\text{POD Status (AA)} = \text{IF}(T \neq \text{""}, \text{"DONE"}, \text{"PENDING"})$$

### 4.3 A/TO-PAY (27 Columns)
- **Applicable Fields:** Freight (K), T/M (N), Advance 1 (O), Date 1 (L), POD Date (T), COD (U), POD Status (AA).
- **Non-Applicable Fields:** Advances 2-3, Extra Amount, PM Date, P/M are blocked; Pending ToBilled (Col V) is hidden.
- **Formulas:**
  $$\text{COD (U)} = \max(0, K - N - O)$$
  $$\text{Pending Balance (Z)} = 0 \quad (\text{Nil after COD collection})$$
  $$\text{POD Status (AA)} = \text{IF}(T \neq \text{""}, \text{"DONE"}, \text{"PENDING"})$$

---

## 5. Mathematical Calculation Engine (`js/calculations.js`)

1. **Safe Input Sanitization:**
   - Empty, blank, null, or `'NA'` strings safely evaluate to 0 without `NaN`.
   - Exact numeric inputs and legitimate 0 values are preserved.
2. **Mode-Switching Stability:**
   - Switching between payment modes recalculates dependent balances without erasing user-entered values in the form.
3. **Idempotence:**
   - Multiple recalculations produce strictly identical results.
4. **Automated POD Settlement:**
   - When a valid POD Received Date is entered, `POD Amount Status` automatically marks `DONE`.

---

## 6. Google Apps Script Backend (`backend/Code.gs`)

1. **Worksheet Routing:**
   - `TOBILLED` shipments route to physical sheet `TOBILLED`.
   - `A/TO-PAY` shipments route to physical sheet `A-TO-PAY`.
   - `F/TO-PAY` shipments route to physical sheet `F-TO-PAY`.
2. **Concurrency Protection:**
   - `LockService.getScriptLock()` prevents race conditions during concurrent edits.
3. **Global Duplicate LR NO Enforcement:**
   - LR numbers are checked across all three destination sheets.
   - When editing, the current record's row is safely excluded from duplicate rejection.
4. **Historical Migration & Sheet Cleanup:**
   - `migrateHistoricalFinalRecords(ss)` safely copies records from legacy `final` to `TOBILLED`, `A-TO-PAY`, and `F-TO-PAY`.
   - Deletes empty `Sheet1` and archives/deletes `final` once records are safely housed.
5. **Custom Google Sheets Menu:**
   - `Transport Brokerage Ledger` menu allows manual migration, cleanup, and styling inside Google Sheets.

---

## 7. Data Synchronization and API Configuration (`js/api.js`)

- **Active Web App URL:**  
  `https://script.google.com/macros/s/AKfycbxLW4Vi4HTRDR_gz-LbDE5gj5XNLyKQU9YjsZYrMgCJOM6ncZ_lV8yCgDpxEDSQZKm8/exec`
- **Active Deployment ID:**  
  `AKfycbxLW4Vi4HTRDR_gz-LbDE5gj5XNLyKQU9YjsZYrMgCJOM6ncZ_lV8yCgDpxEDSQZKm8` (Version 2)
- **Auto-Migration Array:**  
  Automatically migrates legacy deployment endpoints (Versions 1-7) to Version 8.
- **Failover Handling:**  
  Returns clear, user-friendly error notifications if cloud sync fails, preserving local edits without loss.

---

## 8. Excel Export and Spreadsheet Operations

- Genuine multi-sheet `.xlsx` file generated via `ExcelJS` and `FileSaver.js`.
- Exports sheets: `TOBILLED`, `A_TOPAY`, `F_TOPAY`, and `Master Ledger`.
- Applies authentic styling: bold dark-blue headers (`#1e3a8a`), white text, bordered data cells, and accounting currency formatting.

---

## 9. Encoding and Character Rendering

- 100% pure 7-bit ASCII representation across all project files (`index.html`, `js/table.js`, `backend/Code.gs`, `Project Architectures.md`).
- Zero non-ASCII bytes and zero mojibake.
- Symbols and icons use standard HTML numeric character entities (e.g. `&#128196;`, `&#8377;`).

---

## 10. Responsive Layout

- **Desktop (1024px+):** Full viewport spreadsheet view with sticky headers, sticky row numbers, and horizontal scroll.
- **Mobile (<768px):** Touch-accessible inputs (44px min-height), horizontally scrollable grid, and compact modal dialogs.

---

## 11. Security and Data Integrity

- SHA-256 password hashing for Admin and Rudra roles.
- Role-based access control (RBAC): Delete operations restricted to Admin.
- Strict input validation before backend submission.
- Zero data loss on payment status transitions.

---

## 12. Verification and Regression Tests

The complete automated test suite validates all 134 assertions across 6 verification scripts:

1. `verify_enhancements.ps1` -- **37 / 37 PASS** (28-column master schema, headers, modal inputs, RBAC, calculations)
2. `verify_calculations.ps1` -- **20 / 20 PASS** (Full accounting rules, COD settlement, extra amount, POD settlement, idempotence)
3. `verify_mode_blocking.ps1` -- **27 / 27 PASS** (Mode-specific input blocking, zeroing on save, physical worksheet tabs)
4. `verify_backend_and_schema.ps1` -- **16 / 16 PASS** (Workbook XML verification, 28-column dimensions, formulas, Apps Script locking)
5. `verify_pr2_worksheets.ps1` -- **17 / 17 PASS** (Physical sheet routing, Version 1 endpoint, inter-sheet moves, POD DONE status)
6. `verify_section_clear_and_backspace.ps1` -- **17 / 17 PASS** (Section clear buttons, backspace protection, status isolation, UI polish)

**Total: 134 / 134 Tests Passing (100% Green).**

---

## 13. Implementation Constraints & Compliance

- Single main page: `index.html`.
- Single Google Apps Script backend: `backend/Code.gs`.
- Exactly three payment-status tabs: `TOBILLED`, `A/TO-PAY`, `F/TO-PAY` (plus `ALL` filter view).
- Zero non-ASCII bytes in `Project Architectures.md` and codebase.
- Reference directory `E:\TR\SR_T` remained strictly untouched.
- Clean inline error handling (no intrusive system alert popups).

---

## 14. Section Clear, Input Isolation & UI Refinements

- **Section-Level Clear Controllers:**
  - `TableModule.clearSection('shipment')`: Clears date, transporter, LR NO, truck number, and locations while strictly preserving sequential `SL NO`.
  - `TableModule.clearSection('payment')`: Resets freight, T/M, advances 1-3, COD, extra amount, and payment mamul to blank, resetting COD auto-calculate mode.
  - `TableModule.clearSection('bank')`: Clears account number, IFSC, payment mode, POD date, and remarks, reverting POD status to `PENDING`.
- **Backspace & Focus Safety:**
  - Removed full-field auto-selection on focus to enable natural cursor placement.
  - `liveCalcModal()` checks `document.activeElement !== codInput` and user-edit flags, completely eliminating input reversion or overwriting when typing or deleting digits.
- **Inter-Mode Isolation:**
  - `cleanIncompatibleFields(status)` zeroes and wipes fields non-applicable to the destination mode when switching between `TOBILLED`, `A/TO-PAY`, and `F/TO-PAY`.
- **POD Status Automation:**
  - Entering a POD date automatically sets `m_podAmountStatus` to `DONE`. Clearing the date resets it to `PENDING`.
- **UI Uniformity & Button Standardization:**
  - Standardized `.btn-sm` (28-30px), `.excel-grid .btn-sm` (22px compact action buttons), and modal `.form-control` (38px height).
  - All table cells uniformly use 8.5pt font size and matching line height.

---

## 15. Final Acceptance Checklist

- [x] Application opens directly into Excel-style spreadsheet interface (`viewExcel`).
- [x] Three independent payment-status tabs: `TOBILLED`, `A/TO-PAY`, `F/TO-PAY` plus `ALL` filter tab.
- [x] Section clear buttons on Shipment Information, Payment Details, and Bank Details.
- [x] Backspace and input deletion work naturally with zero forced overwrites.
- [x] Mode switching clears incompatible amounts and prevents cross-status value leakage.
- [x] Working toolbar with Search, Add Trip, Refresh, Zoom, and XLSX Download.
- [x] Interactive spreadsheet grid with sticky headers, row numbers, and borders.
- [x] Backend routes to physical worksheets `TOBILLED`, `A-TO-PAY`, and `F-TO-PAY`.
- [x] Active Deployment: Version 1 (`AKfycbzq4WlQ5UXTk2QcIyiMMPtZcLWroAObqVryd2U0CGeS0I-JRoqQiwi0JmVcUNjPiJLU`).
- [x] Active Sheet ID: `1wCu03TqXMhokFYarECDBCFDd_dMWx5LpLtiZL2iryiU`.
- [x] All 134 automated unit and integration tests passing.
- [x] Pure 7-bit ASCII representation throughout (0 non-ASCII bytes).
