# SR Brokerage Ledger — Verification & Test Report

**Transport Brokerage Ledger Pvt Ltd**  
Author: **Shravan Kumar**  
Test Execution Date: **25-10-2026**

---

## 1. Test Execution Summary

| Test Suite | File / Target | Total Tests | Passed | Failed | Status |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Architectural & Schema Suite** | `verify_enhancements.ps1` | 37 | 37 | 0 | **100% PASS** |
| **Section 20 Accounting Suite** | `verify_calculations.ps1` | 20 | 20 | 0 | **100% PASS** |
| **Responsive Viewport Audit** | CSS Layout & Breakpoints | 8 viewports | 8 | 0 | **VERIFIED** |
| **Total Test Assertions** | **Complete System** | **65** | **65** | **0** | **ALL PASSED** |

---

## 2. Section 20 Automated Accounting Test Results

| Case | Test Description | Inputs | Expected Output | Actual Output | Result |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **1** | Full settlement | F/TO-PAY, Freight ₹90,000, COD ₹90,000 | COD = ₹90,000; Bal = ₹0 | COD = ₹90,000; Bal = ₹0 | **PASS** |
| **2** | A/TO-PAY | Freight ₹80,000, Adv ₹40,000 | Balance @ unloading = ₹40,000 | COD = ₹40,000 | **PASS** |
| **3** | A/TO-PAY sample | Freight ₹90,000, TM ₹200, Adv ₹49,800 | Basic balance = ₹40,000 | COD = ₹40,000 | **PASS** |
| **4** | A/TO-PAY sample COD | Previous + COD ₹40,000 | Pending = ₹0 | Final Bal = ₹0 | **PASS** |
| **5** | F/TO-PAY | Freight ₹42,000, COD ₹42,000 | Outstanding = ₹0 | COD = ₹42,000; Bal = ₹0 | **PASS** |
| **6** | TOBILLED initial | Freight ₹60,000, TM ₹300, Adv ₹49,700 | Initial pending = ₹10,000 | Col V = ₹10,000 | **PASS** |
| **7** | TOBILLED extra | Initial pending ₹10,000 + Extra ₹5,000 | Pending before PM = ₹15,000 | Total = ₹15,000 | **PASS** |
| **8** | TOBILLED payment | Pending ₹15,000, PM ₹300 | Final pending = ₹14,700 | Col Z = ₹14,700 | **PASS** |
| **9** | No Extra Amount | Initial pending ₹10,000, PM ₹200 | Final pending = ₹9,800 | Col Z = ₹9,800 | **PASS** |
| **10**| Blank advances | Valid freight ₹50,000, Advances blank | Safe calculation, Pending = ₹50,000 | Col V = ₹50,000 | **PASS** |
| **11**| NA advances | Valid freight ₹50,000, Advances "NA" | Safe calculation, Pending = ₹50,000 | Col V = ₹50,000 | **PASS** |
| **12**| TOBILLED COD | Status TOBILLED | COD nonapplicable / ₹0 | COD = ₹0 | **PASS** |
| **13**| A/TO-PAY pending | Status A/TO-PAY | TOBILLED pending nonapplicable / ₹0 | Col V = ₹0 | **PASS** |
| **14**| Edit advance | Change advance from ₹40,000 to ₹50,000 | COD updates from ₹40,000 to ₹30,000 | COD = ₹30,000 | **PASS** |
| **15**| Edit payment | Change PM from ₹200 to ₹300 | Payment counted once (₹9,800 → ₹9,700) | Col Z = ₹9,700 | **PASS** |
| **16**| Reopen record | Load saved record multiple times | No repeated deductions | Balances identical | **PASS** |
| **17**| Recalculate | 5 consecutive recalculations | Strictly idempotent output (₹9,800) | Idempotent output | **PASS** |
| **18**| Duplicate submit | Duplicate LR NO detection | Rejects matching existing LR number | Detection active | **PASS** |
| **19**| Delete | Delete single trip record | Other records preserved, totals refresh | Preserved & refreshed | **PASS** |
| **20**| Export | Multi-worksheet Excel export | Creates TOBILLED, A_TOPAY, F_TOPAY, Master | 4 worksheets populated | **PASS** |

---

## 3. Responsive UI Viewport Verification

The application was tested across all required desktop and mobile viewports:

| Viewport Category | Width | Visual Layout & Alignment | Overflow Status | Functional Usability |
| :--- | :---: | :--- | :--- | :--- |
| **Desktop Ultra-Wide** | `1920px` | 4 KPI cards, full 28-col grid, sticky actions | Zero page overflow | Complete CRUD & Export |
| **Desktop Standard** | `1440px` | Linear vertical hierarchy, 1:1 aligned navbar | Zero page overflow | Complete CRUD & Export |
| **Desktop Compact** | `1280px` | Clean navigation bar, no element wrapping | Zero page overflow | Complete CRUD & Export |
| **Mobile Large** | `430px` | Single-column form grid, stacked buttons | Horizontal scroll on table | Fully scrollable & touch-safe |
| **Mobile Standard** | `390px` | Mode pills flex-wrapped, legible inputs | Horizontal scroll on table | Fully touch-safe |
| **Mobile Medium** | `375px` | Modal fills screen with smooth scroll | Horizontal scroll on table | Complete Add/Edit flow |
| **Mobile Compact** | `360px` | Compact stat badges, responsive search bar | Horizontal scroll on table | Complete Add/Edit flow |
| **Mobile Minimum** | `320px` | Zero clipping, labels wrap cleanly | Horizontal scroll on table | Complete Add/Edit flow |

---

## 4. Verification Evidence

- Command `powershell -ExecutionPolicy Bypass -File "verify_enhancements.ps1"`:
  ```
  Passed: 37
  Failed: 0
  Total:  37
  ```
- Command `powershell -ExecutionPolicy Bypass -File "verify_calculations.ps1"`:
  ```
  Passed: 20
  Failed: 0
  Total:  20
  ```
- Encoding inspection across `index.html`, `js/table.js`, `css/styles.css`, and `backend/Code.gs`:
  ```
  Total U+FFFD lines: 0
  Total '??' lines: 0
  Encoding: UTF-8 without BOM
  ```
