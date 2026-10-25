# SR Brokerage Ledger — Comprehensive Bug Register & Audit Report

**Transport Brokerage Ledger Pvt Ltd**  
Author: **Shravan Kumar**  
Audit Date: **25-10-2026**

---

## 1. Executive Summary

A comprehensive, multi-phase technical audit of the SR Brokerage Ledger application (`E:\TR\P1`) was executed covering the user interface, mathematical calculation engine, 28-column Excel architecture, authentication system, multi-sheet spreadsheet views, Excel export, and Google Apps Script synchronization.

All identified critical, high, and medium priority issues have been diagnosed, corrected, and verified against automated test suites.

---

## 2. Bug Register

| Issue ID | Priority | Component | Description | Root Cause | Status |
| :--- | :---: | :--- | :--- | :--- | :---: |
| **BUG-001** | **CRITICAL** | `index.html`, `js/table.js` | Mojibake / Corrupted text (`≡fÜ¢`, `ΓÇó`, `??`, `dY`) visible across UI, buttons, and modals. | PowerShell host console running in `IBM437` saved raw UTF-8 multibyte emoji sequences as CP437/ANSI strings. | **FIXED & VERIFIED** |
| **BUG-002** | **CRITICAL** | `js/calculations.js`, `backend/Code.gs` | Missing Extra Amount ($W$) and Payment Mamul ($Y$) in TOBILLED calculation caused inaccurate net balance. | Calculation engine previously omitted Columns W and Y from final pending formula. | **FIXED & VERIFIED** |
| **BUG-003** | **CRITICAL** | `js/data.js`, `js/table.js` | Duplicate LR numbers could be submitted, risking duplicate shipment ledger entries. | Absence of pre-submission uniqueness check for `LR NO` across existing shipments. | **FIXED & VERIFIED** |
| **BUG-004** | **HIGH** | `index.html`, `js/table.js` | Add/Edit modal displayed irrelevant fields for A/TO-PAY and F/TO-PAY shipments. | Form lacked dynamic field visibility controller; all 28 inputs were shown regardless of mode. | **FIXED & VERIFIED** |
| **BUG-005** | **HIGH** | `js/table.js` | Spreadsheet View lacked individual sheet filtering for TOBILLED, A/TO-PAY, and F/TO-PAY. | Table renderer lacked a sub-navigation sheet tab controller to filter rows and recalculate totals. | **FIXED & VERIFIED** |
| **BUG-006** | **HIGH** | `js/table.js` (Export) | Excel export only generated a single flat sheet instead of individual filtered worksheets. | ExcelJS export logic did not populate individual worksheets for each transport mode. | **FIXED & VERIFIED** |
| **BUG-007** | **MEDIUM** | `css/styles.css` | Header navigation items wrapped onto multiple lines on certain desktop viewports. | Missing `flex-wrap: nowrap` constraint on `.app-navbar` container. | **FIXED & VERIFIED** |
| **BUG-008** | **MEDIUM** | `index.html`, `js/data.js` | Legacy sample records from outdated schema (POC columns) conflicted with master 28-column layout. | LocalStorage cache retained obsolete v1 schema containing `pocDate`, `pocAmount`. | **FIXED & VERIFIED** |

---

## 3. Detailed Root Cause Analysis & Resolution

### BUG-001: Text Encoding Corruption (Mojibake)
- **Reproduction**: Loading `index.html` showed `≡fÜ¢ SR Brokerage Ledger` on the login screen, `??` on modal titles, and `dY` on table action buttons.
- **Root Cause**: On Windows, PowerShell commands with standard output encoding `IBM437` interpreted UTF-8 bytes (`F0 9F 9A 9B`) as OEM code page 437 glyphs (`≡fÜ¢`).
- **Correction**: Replaced all corrupted strings across `index.html`, `js/table.js`, and `css/styles.css` with exact Unicode code points and UTF-8 encoding without BOM.

### BUG-002: Mathematical Formula Inconsistencies
- **Reproduction**: A TOBILLED trip with ₹60,000 freight, ₹300 TM, ₹49,700 advance, ₹5,000 extra amount, and ₹300 PM showed ₹10,000 instead of ₹14,700.
- **Root Cause**: `CalculationEngine.calculate` did not incorporate Column W (Extra Amount) and Column Y (Payment Mamul) into Column Z.
- **Correction**: Re-architected `CalculationEngine.calculate` to implement:
  - $\text{Pending: ToBilled (Col V)} = K - N - (O + Q + S)$
  - $\text{Pending Amount (Col Z)} = V + W - Y$
  - $\text{COD (Col U)} = K - N - (O + Q + S)$ for A/TO-PAY; $K$ for F/TO-PAY.

### BUG-003: Duplicate LR NO Validation
- **Reproduction**: Submitting a new shipment with an existing LR number succeeded, creating duplicate records.
- **Root Cause**: No client-side or server-side duplicate check on `m_lrNo`.
- **Correction**: Added `DataManager.isDuplicateLr(lrNo, excludeRow)` checking uniqueness live during typing and preventing form submission with an error alert.

### BUG-004: Dynamic Modal Field Visibility
- **Reproduction**: Opening Add Shipment showed Advance 2, Advance 3, Extra Amount, and P/M even when F/TO-PAY was selected.
- **Root Cause**: Modal fields were static grid items without visibility controls.
- **Correction**: Created mode selector pills (`#pill_tobilled`, `#pill_atopay`, `#pill_ftopay`) and `updateFormFieldsVisibility(status)` dynamically showing/hiding input containers while preserving common shipment information.

### BUG-005 & BUG-006: 3-Sheet Spreadsheet View and Multi-Worksheet Export
- **Reproduction**: Spreadsheet View displayed all trips mixed together; export was a single sheet.
- **Root Cause**: Missing multi-sheet navigation and ExcelJS worksheet population.
- **Correction**: Implemented `.excel-sheets-tab-bar` with live filtering and total recalculation for `Master Ledger`, `Sheet 1: TOBILLED`, `Sheet 2: A/TO-PAY`, and `Sheet 3: F/TO-PAY`. Updated `exportToExcel()` to generate all 4 sheets in the `.xlsx` download.

