# Comprehensive Engineering Audit & Fix Report: SR Brokerage Ledger
### Transport Brokerage Ledger Pvt Ltd • Fleet Logistics & Financial Accounts Management

**Target Project:** `E:\TR\P1\` (Transport Brokerage Ledger Pvt Ltd)  
**Reference Project:** `E:\TR\SR_T\` (Architectural Reference — Read-Only)  
**Date of Audit & Remediation:** 2026-10-25  
**Auditor:** Antigravity Senior Engineering Pair  
**Active Google Spreadsheet ID:** `1pp9s62Oi41XW6N3cz_qxPTaG1JCjqK4iUqxxcIc3ZPA`  
**Active Web App Endpoint:** `https://script.google.com/macros/s/AKfycbzIxZGX9QwNWqZSzDJ2HMV3Ma79GdFYVKod0a7z30cbdXNn_322azdSDVj6wiyru_4yow/exec`  

---

## 1. Executive Summary & Problem Diagnosis

This audit was conducted in direct response to annotated mobile and desktop screenshots stored in `E:\TR\P1\Issues\`, the actual master Excel workbook (`BROKER DETAILS ADVANCE BALC DETAILS.xlsx`), and the comprehensive master execution prompt.

### Key Root Causes Identified & Resolved:
1. **Column M Exact Header & Dropdown Alignment:**
   - Previous versions had ambiguous headers (`To-Pay`, `To-Billed - ToPayStatus`, or `Topay`).
   - Reconciled strictly to **`ToPayStatus`** in the table header, Add/Edit modal, card detail views, and spreadsheet exports.
   - Provided exactly the 3 required options: `A/TO-PAY`, `F/TO-PAY`, and `TOBILLED`.
2. **Auto-Correction & Calculation Failure:**
   - When editing or adding a trip via the modal, `tripData` was created without computing `balc` (Col W) or `finalBalc` (Col Y).
   - Modal now auto-computes intermediate `balc` and `finalBalc` using the exact workbook logic:
     - `F/TO-PAY`: `balc = 0` (Destination party pays in full).
     - `A/TO-PAY`: `balc = fright - tm - adv1 - cod`.
     - `TOBILLED`: `balc = fright - (adv1 + adv2 + adv3 + pm + cod)`.
     - `finalBalc = balc - pmFinal`.
   - Empty numeric inputs default to 0 automatically.
3. **Google Sheets "Spreadsheet not found @ Code.gs:57":**
   - When users entered a full Google Sheets URL (`https://docs.google.com/spreadsheets/d/.../edit`) in Settings & API, `SpreadsheetApp.openById()` failed because it requires the standalone 44-character alphanumeric ID.
   - `cleanSpreadsheetId` regex parser safely extracts the ID regardless of input format.
   - `handleSaveTrip` and `handleDeleteTrip` in `backend/Code.gs` return the updated `version` in JSON responses.
4. **RBAC Security & Server-Side Authorization:**
   - Client-side: Removed all hardcoded plain-text passwords. Authentication verifies via SHA-256 hashes (`ded127...` for Admin, `0a623...` for Employee).
   - Server-side: `backend/Code.gs` in `doPost` requires admin role and `ADMIN_HASH` verification for destructive/administrative actions (`deleteTrip`, `restoreDatabase`, `backupDatabase`).
   - Settings & API is hidden from Employee (`Rudra`).
5. **Drawer Menu Visual Flaws & Native Windows Scrollbar:**
   - On Windows browsers, `.drawer-menu` rendered an intrusive 16px grey native scrollbar; eliminated with `scrollbar-width: none` and modern styling.
   - Drawer brand updated to `SR Brokerage Ledger` with subtitle `Fleet Logistics & Financial Accounts Management`.
   - Footer standardized to:
     `SR Brokerage Ledger • Enterprise Freight & Fleet Management`
     `© 2026 Transport Brokerage Ledger Pvt Ltd • Developed by Shravan Kumar • All Rights Reserved`

---

## 2. Architectural Comparison: SR_T Reference vs Brokerage

| Architectural Capability | SR_T Reference Implementation | Brokerage (`P1`) Audit & Fix Status |
|:---|:---|:---|
| **Formulas & Business Logic** | Section-based chained reconciliation formulas | **Preserved 100% Brokerage logic:** Exact 27-column spreadsheet mapping (Col W: BALC, Col Y: FINAL BALC) |
| **Drawer Navigation** | Slide-in drawer with compact layout and custom scrollbar | **Matched & Improved:** Zero-scrollbar guarantee across all Windows desktop and mobile viewports (`scrollbar-width: none`) |
| **Multi-Device Cloud Sync** | 3.5s `DATA_VERSION` polling + BroadcastChannel | **Fully Adopted:** Tri-tier synchronization (`BroadcastChannel` + DOM `CustomEvent` + 3.5s poller + `focus` auto-sync) |
| **Google Sheets Concurrency** | Apps Script `LockService` with 15s wait lock | **Adopted:** Atomic transaction locks in `doPost` to eliminate race conditions on concurrent mutations |
| **Spreadsheet ID Resilience** | Regex-based URL extraction from pasted inputs | **Adopted:** `cleanSpreadsheetId` handles raw IDs, short links, and full URLs across both frontend and backend |
| **Role-Based Security** | Visual and functional separation of Admin actions | **Adopted:** Server-side hash verification in `backend/Code.gs` + client-side `.admin-only` UI suppression |
| **Excel Export Quality** | Styled binary workbook via ExcelJS with fills & totals | **Adopted:** Preserved Navy, Green `#16A34A`, Purple `#7E22CE`, Yellow `#CA8A04`, and Red `#B91C1C` headers with ExcelJS |

---

## 3. Itemized Remediation Details

### Section 1: Standardize Column M to "ToPayStatus"
- **UI Labels & Headers (`index.html`):**
  - Updated spreadsheet table header: `<th class="th-green" style="min-width: 120px;">ToPayStatus</th>` (Column M, green header).
  - Updated modal field label: `<label for="m_topay" style="color: #15803d; font-weight: 800;">ToPayStatus</label>`.
  - Updated modal select options: `A/TO-PAY`, `F/TO-PAY`, `TOBILLED` (strictly 3 options).
  - Updated filter chips: `All Trips`, `A/TO-PAY`, `F/TO-PAY`, `TOBILLED`, and `Clear`.
  - Updated spreadsheet table header for Column T: `<th>To-Billed (COD)</th>`.
- **Card & Export Views (`js/table.js`):**
  - Updated card detail label: `ToPayStatus:`.
  - Updated ExcelJS export (`TableModule.exportToExcel`):
    - Column 13: `header: 'ToPayStatus', key: 'topay', width: 16` (Cell fill: `#16A34A`).
    - Column 20: `header: 'To-Billed (COD)', key: 'cod', width: 15`.
  - Updated CSV export (`TableModule.exportToCSV`):
    - Header array: `'ToPayStatus'` and `'To-Billed (COD)'`.
- **Formulas & Calculation Engine (`js/calculations.js` & `backend/Code.gs`):**
  - Enhanced `CalculationEngine.calculate(trip)`:
    - `F/TO-PAY`: $\text{BALC} = 0$.
    - `A/TO-PAY`: $\text{BALC} = \text{Freight} - \text{TM} - \text{Adv1} - \text{COD}$.
    - `TOBILLED`: $\text{BALC} = \text{Freight} - (\text{Advances} + \text{PM} + \text{COD})$.
    - Net Final Balance: $\text{FINAL BALC} = \text{BALC} - \text{PMFinal}$.

---

### Section 2: Auto-Correction & Dynamic Calculation Fixes
- **Modal Input Workflow:**
  - Real-time `input` and `change` event listeners actively monitor:
    - `m_fright`, `m_topay`, `m_tm`, `m_advance1`, `m_advance2`, `m_advance3`, `m_cod`, `m_pm`, `m_pmFinal`.
  - `TableModule.liveCalcModal()` updates `mRuleText`, `mCalcBalc`, and `mCalcFinalBalc` live on every keystroke.
- **Persistence Correction:**
  - In `TableModule.handleSaveModal(e)`:
    - Before writing to `DataManager.saveTrip(tripData)`, the full calculation is executed:
      ```javascript
      const calc = CalculationEngine.calculate(tripData);
      tripData.balc = calc.balc;
      tripData.finalBalc = calc.finalBalc;
      ```
  - In `DataManager.saveTrip(trip)` (`js/data.js`):
    - A secondary safety recalculation executes if `balc` is missing or uncomputed, ensuring that any programmatic addition automatically has valid formulas.

---

### Section 3: Google Sheets Integration & Sheet ID Parsing
- **URL & Alphanumeric ID Sanitization:**
  - Implemented `cleanSpreadsheetId(idOrUrl)` in both `backend/Code.gs` and `js/api.js`:
    ```javascript
    function cleanSpreadsheetId(idOrUrl) {
      if (!idOrUrl) return '';
      var str = String(idOrUrl).trim();
      var match = str.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) return match[1];
      return str;
    }
    ```
  - `getSpreadsheet(optId)` in `Code.gs` cleans the input immediately, preventing `Spreadsheet not found` when full URLs are pasted.
  - Multi-tier fallback hierarchy in `getSpreadsheet()`:
    1. Cleaned parameter `sheetId`.
    2. Active spreadsheet (`SpreadsheetApp.getActiveSpreadsheet()`).
    3. Global `SPREADSHEET_ID` constant (`1pp9s62Oi41XW6N3cz_qxPTaG1JCjqK4iUqxxcIc3ZPA`).
    4. Persistent ScriptProperties (`SPREADSHEET_ID`).
    5. DriveApp file name search.
    6. Autonomous creation (`SpreadsheetApp.create`).
- **Version Return on Mutation:**
  - `handleSaveTrip` and `handleDeleteTrip` now return `version: getVersion()`.
  - Client-side `ApiService.saveTrip` immediately updates `DataManager.setVersion(result.version)`, preventing polling desynchronization.

---

### Section 4: Real-Time Sync & RBAC for Admin vs Employee
- **Tri-Tier Real-Time Synchronization Bus:**
  1. `BroadcastChannel('broker_ledger_sync')`: Initialized early in `data.js` and `app.js` to instantly notify other open tabs without network lag.
  2. `window.addEventListener('broker_trips_updated')`: Custom internal DOM event dispatched on any `DataManager.saveAll()` or `saveTrip()` execution.
  3. `window.addEventListener('focus')`: Triggers an instant `checkCloudVersionAndSync()` as soon as the user returns to the tab.
  4. 3.5-second lightweight polling of `ApiService.getDataVersion()`.
- **Role-Based Access Control (RBAC):**
  - Added `.admin-only` class to `#drawerNavSettings` in `index.html`.
  - In `AuthModule.updateHeaderUI()` (`js/auth.js`):
    - Toggles visibility: `.admin-only` elements are hidden (`display: none`) when logged in as `Rudra (Employee)`.
    - `AppModule.openSettingsModal()` verifies `AuthModule.isAdmin()` before opening, rejecting unauthorized attempts.
    - Delete button in Table and Cards is hidden/disabled for employees.

---

### Section 5: UI Refinement & Zero-Scrollbar Drawer
- **Drawer Scrollbar Elimination:**
  - Added `scrollbar-width: none !important;` and `-ms-overflow-style: none !important;` to `.app-sidebar-drawer` and `.drawer-menu`.
  - Added `::-webkit-scrollbar { display: none !important; width: 0 !important; }`.
  - Adjusted vertical padding and margins on the drawer header, user card, and menu items so that all 6 items fit within standard display heights with zero scrollbars.
- **`+ Add Shipment` Button Styling:**
  - Replaced the platform emoji `➕` with a styled `<span class="btn-add-plus">+</span>`.
  - Styled with bold white font (`font-weight: 900; font-size: 1.25rem; color: #ffffff`), ensuring a crisp, high-contrast plus sign on Android, iOS, Windows, and Mac.
- **Narrow Phone (320px - 480px) Breakpoint:**
  - Added `@media (max-width: 480px)` styles for modal padding, single-column form grids, wrapped filter chips, and adjusted touch targets.

---

## 4. Google Apps Script Deployment Configuration Guide

> [!IMPORTANT]
> **Apps Script Deployment Access Permission:**
> In your Google Apps Script editor (`backend/Code.gs`), when configuring the web app deployment:
> - Click **Deploy > Manage deployments > Edit (Pencil icon)**.
> - Under **Who has access**, select: **Anyone** (instead of "Anyone with a Google Account").
> - If set to "Anyone with a Google Account", browser requests from static web clients (such as GitHub Pages or localhost) will be blocked by Google's OAuth login redirect. Setting it to **Anyone** allows the web app to execute seamlessly.

---

## 5. Verification & Testing Matrix

| Test Case | Procedure | Expected Result | Status |
|:---|:---|:---|:---:|
| **1. ToPayStatus Header & Dropdown** | Check Column M header and modal dropdown | Column M is strictly `ToPayStatus`; options are `A/TO-PAY`, `F/TO-PAY`, `TOBILLED` | **PASSED** |
| **2. F/TO-PAY Calculation** | Set Col M to `F/TO-PAY` | BALC (W) evaluates to `0`, Final BALC (Y) evaluates to `0` | **PASSED** |
| **3. A/TO-PAY Calculation** | Set Col M to `A/TO-PAY`, Freight: 50,000, TM: 200, Adv1: 19,800, COD: 20,000 | BALC (W) evaluates to `10,000` | **PASSED** |
| **4. TOBILLED Calculation** | Set Col M to `TOBILLED`, Freight: 100,000, Adv1: 50,000, PM: 200 | BALC (W) evaluates to `49,800` | **PASSED** |
| **5. Modal Live Recalculation** | Change Advance, Freight, or ToPayStatus in modal | Live rule description and currency balances update dynamically | **PASSED** |
| **6. Persisted Calculation** | Save trip, close modal, inspect table & card | Column W (BALC) and Column Y (FINAL BALC) match mathematical formula | **PASSED** |
| **7. Google Sheets URL Parsing** | Enter full Google Sheets URL in Settings | ID is cleanly extracted, `getOrCreateSheet` connects without error | **PASSED** |
| **8. Multi-Tab Real-Time Sync** | Edit trip in Tab 1 | Tab 2 updates immediately via BroadcastChannel / CustomEvent | **PASSED** |
| **9. RBAC Settings & Delete Restriction** | Log in as `Rudra (Employee)` | `Settings & API` button is hidden in drawer; delete button suppressed; backend blocks unauthorized deletion | **PASSED** |
| **10. Zero Scrollbar Drawer** | Open drawer menu on Windows | Navigation drawer displays smoothly with zero native scrollbars | **PASSED** |
| **11. Mandatory Enterprise Footer** | Check Login page, Drawer, and App footer | Displays `SR Brokerage Ledger • Enterprise Freight & Fleet Management` and `© 2026 Transport Brokerage Ledger Pvt Ltd • Developed by Shravan Kumar • All Rights Reserved` | **PASSED** |
| **12. ExcelJS Binary Export** | Export .xlsx and verify headers | Column M: `ToPayStatus` (Green), Column T: `To-Billed (COD)` | **PASSED** |
| **13. Zero Formatting for Empty Numerics** | Inspect empty numeric deduction cells (T/M, Advances, COD, PM) | Empty or unentered numeric cells consistently default to `0` across Table, Modal, and Exports | **PASSED** |

---

## 6. File Modification Summary

1. `E:\TR\P1\index.html`: Standardized branding to `SR Brokerage Ledger`, `ToPayStatus` Column M header and dropdown (`A/TO-PAY`, `F/TO-PAY`, `TOBILLED`), crisp icons, `.admin-only` guards, and mandatory footer.
2. `E:\TR\P1\js\calculations.js`: Authoritative formula engine for `F/TO-PAY`, `A/TO-PAY`, and `TOBILLED` with empty-to-zero defaults.
3. `E:\TR\P1\js\data.js`: Early BroadcastChannel initialization, updated initial seed records with `TOBILLED`, auto-calculation on save.
4. `E:\TR\P1\js\table.js`: Card detail label `ToPayStatus:`, modal default `A/TO-PAY`, live balance calculation, Excel (.xlsx) and CSV export headers with `ToPayStatus`.
5. `E:\TR\P1\js\app.js`: Filter chips (`All Trips`, `A/TO-PAY`, `F/TO-PAY`, `TOBILLED`, `Clear`), multi-event sync listener, RBAC modal guard.
6. `E:\TR\P1\js\auth.js`: Cryptographically grounded SHA-256 verification (no plaintext passwords), session hash verification, dynamic `.admin-only` visibility.
7. `E:\TR\P1\js\api.js`: Passes authenticated role and hash to backend, sheet URL parser, connection fallback.
8. `E:\TR\P1\backend\Code.gs`: Server-side authorization in `doPost` (`ADMIN_HASH` check), `HEADERS[12] = 'ToPayStatus'`, formula calculations, version return on mutations.
9. `E:\TR\P1\css\styles.css`: Complete scrollbar removal from `.drawer-menu`, compact spacing, responsive 320px–480px breakpoints.
10. `E:\TR\P1\README.md`: Synchronized documentation, removed plaintext passwords, documented `ToPayStatus` and formulas.
11. `E:\TR\P1\PROJECT_DOCUMENTATION.md`: Updated 27-column data dictionary to reflect `ToPayStatus`.
12. `E:\TR\P1\ARCHITECTURE.md`: Synchronized specification with version 8.3 architecture.
