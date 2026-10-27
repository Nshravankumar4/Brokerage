# SR Brokerage Ledger -- Comprehensive End-to-End System Architecture & Technical Specification

> **System Title:** SR Brokerage Ledger -- Enterprise Fleet Logistics & Financial Accounts Management  
> **Author & Developer:** Shravan Kumar  
> **Organization:** Transport Brokerage Ledger Pvt Ltd  
> **Current Application Version:** Upgrade 1.2 source with security hardening changes not yet deployed
> **UI Requirement:** Excel-style interactive worksheet within the existing `index.html`  
> **Reference Workbooks:**  
>   * `E:\TR\New\Final Sheet Broker.xlsx` (Authoritative 3-Sheet Physical Split, Created 26-Oct-2026)  
>   * `E:\TR\P1\Final Sheet Broker.xlsx`  
>   * `E:\TR\P1\BROKER DETAILS ADVANCE BALC DETAILS.xlsx`  
> **Cloud Backend:** Google Apps Script Web App; deployment and spreadsheet configuration require administrator review  

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

The existing `final` worksheet is retained as a recovery source. The reviewed migration is repeatable, assigns stable IDs, rejects ambiguous duplicates, and never deletes the source worksheet.

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
   - When editing, the current shipment ID is excluded from duplicate rejection.
4. **Historical Migration & Sheet Cleanup:**
   - The reviewed migration copies records from legacy `final` to the corresponding physical worksheet and uses shipment IDs for safe reruns.
   - It fails on ambiguous IDs/LR numbers and preserves `final`; it does not automatically delete or clean up any worksheet.
5. **Custom Google Sheets Menu:**
   - `Transport Brokerage Ledger` menu allows a confirmed migration, ID backfill, cleanup, and styling inside Google Sheets.
6. **Authentication:**
   - `doGet()` rejects requests; the API accepts authenticated POST actions only.
   - Credentials are salted and hashed in Apps Script Script Properties; sessions are server-issued, role-checked, and expire after one hour.
   - Configure both account passwords and the `SPREADSHEET_ID` Script Property before deployment. No fallback admin token is supported.
   - Restoring a database and production seeding are disabled.

---

## 7. Data Synchronization and API Configuration (js/api.js)

- The frontend communicates with the configured Apps Script deployment using authenticated POST requests.
- The client cannot choose a spreadsheet. Set `SPREADSHEET_ID` in Apps Script Script Properties; the server-side property is authoritative.
- Deployment changes are not automatic: configure credentials and the spreadsheet property, review the target spreadsheet, then deploy and verify the backend separately.
- Cloud saves and deletes require server confirmation. Offline writes are rejected rather than reported as successful.
- The local shipment list is a cache, not an authoritative offline ledger. Valid empty cloud responses clear stale cache data.

---

## 8. Excel Export and Spreadsheet Operations

- Genuine multi-sheet `.xlsx` file generated via `ExcelJS` and `FileSaver.js`.
- Exports sheets: `TOBILLED`, `A_TOPAY`, `F_TOPAY`, and `Master Ledger`.
- Applies authentic styling: bold dark-blue headers (`#1e3a8a`), white text, bordered data cells, and accounting currency formatting.
- Export is blocked unless the latest cloud data is verified; CSV text cells are escaped against spreadsheet formula injection.

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

- Server-side salted PBKDF2-HMAC-SHA256 password hashes (100,000 iterations) are held in Apps Script Script Properties.
- Server-issued session tokens expire after one hour; administrative authorization is derived from the server session, never a caller-supplied role.
- Delete and backup operations are admin-only. Client-side settings cannot redirect requests to an arbitrary spreadsheet or API.
- Shipment IDs provide stable edit/delete identity; status transitions verify the destination before removing the source.
- The ID migration must be reviewed and run manually before legacy rows can be edited or deleted.
- Financial calculation rules in `js/calculations.js` were not changed.

---

## 12. Verification and Regression Tests

All six PowerShell verification scripts currently pass 144 assertions. They are primarily source/workbook assertions, not deployed Apps Script integration tests; passing them does not verify a live deployment or spreadsheet migration.

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

## 15. Cloud CRUD Consistency, Delete Safety & Branch Audit

- **Authoritative Empty Dataset Handling (`js/api.js`):**
  - `fetchAll()` now accepts a valid cloud response with `trips: []` as authoritative, clearing stale local data rather than falling back to old cached rows.
  - Distinct result types: `source: 'cloud'`, `source: 'offline'`, and `status: 'error'` with clear badge and toast indicators.
- **Delete Confirmation & Rollback Protection (`js/table.js`, `js/data.js`):**
  - Concurrency lock `this._isDeleting` prevents double-submission race conditions.
  - Stable shipment IDs and server-side worksheet/LR checks prevent cross-sheet row collisions.
  - Cloud-first confirmation: only deletes local state upon server-confirmed `{ status: 'success' }`. Retains data and alerts user if deletion is rejected.
- **Transporter Autocomplete Safety (`js/table.js`):**
  - `handleFieldAutofill()` preserves manually entered route locations (`From`, `To`) and truck plate numbers, only auto-filling bank credentials and empty fields.
- **Exit Code Verification:**
  - Corrected `verify_section_clear_and_backspace.ps1`, `verify_backend_and_schema.ps1`, and `verify_mode_blocking.ps1` to strictly return exit code `1` on failure and `0` on pass.
- **Deployment status:**
  - Source changes have not been deployed, and no production spreadsheet migration has been run.

---

## 16. Final Acceptance Checklist

- [x] Application opens directly into Excel-style spreadsheet interface (`viewExcel`).
- [x] Three independent payment-status tabs: `TOBILLED`, `A/TO-PAY`, `F/TO-PAY` plus `ALL` filter tab.
- [x] Section clear buttons on Shipment Information, Payment Details, and Bank Details.
- [x] Backspace and input deletion work naturally with zero forced overwrites.
- [x] Mode switching clears incompatible amounts and prevents cross-status value leakage.
- [x] Authoritative empty dataset handling: empty cloud sheet clears stale local records.
- [x] Delete and CRUD consistency: server confirmation required before local purge, multi-sheet row isolation.
- [x] Transporter autocomplete reuses accounts without overwriting manually entered cities.
- [x] Working toolbar with Search, Add Trip, Refresh, Zoom, and XLSX Download.
- [x] Interactive spreadsheet grid with sticky headers, row numbers, and borders.
- [x] Backend routes to physical worksheets `TOBILLED`, `A-TO-PAY`, and `F-TO-PAY`.
- [ ] Configure credentials and `SPREADSHEET_ID` in Apps Script Script Properties before deployment.
- [ ] Run the reviewed shipment-ID and historical worksheet migrations only after a production backup and owner approval.
- [ ] Verify the deployed backend and spreadsheet using a controlled test account before production use.
- [x] Pure 7-bit ASCII representation throughout (0 non-ASCII bytes).
