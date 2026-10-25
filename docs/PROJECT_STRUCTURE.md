# SR Brokerage Ledger — Project Structure & Architecture

**Transport Brokerage Ledger Pvt Ltd**  
Developed by **Shravan Kumar**  
Active Repository: `E:\TR\P1`  
Reference Repository (Read-Only): `E:\TR\SR_T`

---

## 1. Directory Overview

```
E:\TR\P1\
│
├── index.html                   # Single-Page Application (SPA) entrypoint & modal layouts
├── verify_enhancements.ps1      # 37-test automated verification suite
├── verify_calculations.ps1      # 20-test Section 20 mathematical accounting test suite
├── Final Sheet Broker.xlsx      # Master 28-column authoritative Excel workbook
│
├── backups/
│   └── Final_Sheet_Broker_backup.xlsx  # Verified pre-modification master backup
│
├── css/
│   └── styles.css               # Complete responsive theme, 3-sheet tab bar, modal mode pills
│
├── js/
│   ├── api.js                   # Google Apps Script Web App REST client & 2-way sync
│   ├── app.js                   # Application controller, filters, real-time BroadcastChannel
│   ├── auth.js                  # Cryptographically grounded SHA-256 RBAC (Admin & Rudra)
│   ├── calculations.js          # Authoritative mathematical formula engine (Columns A-AB)
│   ├── dashboard.js             # Executive dashboard KPIs, missing POD alerts, monthly charts
│   ├── data.js                  # Pre-seeded trips, localStorage persistence, unique LR engine
│   └── table.js                 # 28-column spreadsheet view, modal controller, ExcelJS export
│
├── backend/
│   └── Code.gs                  # Google Apps Script endpoint handling 28-column sync
│
├── libs/
│   ├── exceljs.min.js           # Client-side multi-sheet Excel (.xlsx) generator
│   ├── FileSaver.min.js         # Browser file download helper
│   └── xlsx.full.min.js         # Spreadsheet parsing utility
│
└── docs/
    ├── PROJECT_STRUCTURE.md     # Architectural map and file responsibilities (this document)
    ├── CALCULATION_RULES.md     # Authoritative financial equations & reconciliation
    ├── BUG_AUDIT.md             # Full bug register, root causes, and verified fixes
    ├── TEST_REPORT.md           # Automated and manual verification test report
    └── DEPLOYMENT.md            # Setup, deployment, cloud synchronization & rollback guide
```

---

## 2. Component Architecture & Data Flow

```
+--------------------------------------------------------------------------+
|                            USER INTERFACE                                |
|  - Top Navigation Bar (Dashboard, Trip Operations, Spreadsheet View)     |
|  - Shared Filter Toolbar (Search, Month, Date Range, Status Chips)       |
|  - Add/Edit Trip Modal with Dynamic ToPayStatus Mode Selector            |
|  - 3-Sheet Tab Bar (Master Ledger, TOBILLED, A/TO-PAY, F/TO-PAY)         |
+--------------------------------------------------------------------------+
                                    │
                                    ▼
+--------------------------------------------------------------------------+
|                        APPLICATION CONTROLLER (app.js)                   |
|  - Coordinates active view, active filters, search queries               |
|  - BroadcastChannel multi-tab synchronizer                               |
+--------------------------------------------------------------------------+
                                    │
                  ┌─────────────────┴─────────────────┐
                  ▼                                   ▼
+-----------------------------------+ +------------------------------------+
|   CALCULATION ENGINE (calc.js)   | |      DATA MANAGER (data.js)        |
| - Pure mathematical formulas      | | - LocalStorage persistence         |
| - 28-Column mapping (A to AB)     | | - Unique LR validation             |
| - Idempotent, zero-side-effect    | | - Auto-sync broadcasting           |
+-----------------------------------+ +------------------------------------+
                  │                                   │
                  └─────────────────┬─────────────────┘
                                    ▼
+--------------------------------------------------------------------------+
|                        TABLE MODULE (table.js)                           |
|  - Renders 1:1 Spreadsheet View (28 Columns with sticky headers & sums)  |
|  - Controls Dynamic Field Visibility based on ToPayStatus                |
|  - Exports Multi-Worksheet genuine Excel workbook (.xlsx via ExcelJS)    |
+--------------------------------------------------------------------------+
                                    │
                                    ▼ (Optional live sync)
+--------------------------------------------------------------------------+
|                     GOOGLE APPS SCRIPT (backend/Code.gs)                 |
|  - Headless API endpoint deployed on Google Drive                        |
|  - Reads/Writes 28-column rows into live Google Sheet                    |
+--------------------------------------------------------------------------+
```

---

## 3. Detailed File Responsibilities

### `index.html`
- **Zero dead-space viewport** with full-width responsive CSS.
- **Top Bar**: Menu Drawer button, Brand Title, View Tabs (Dashboard, Trip Operations, Spreadsheet View), Cloud Sync Pill, User Badge, Logout.
- **Modals**:
  - Add/Edit Trip Modal with 3 payment mode buttons (`#pill_tobilled`, `#pill_atopay`, `#pill_ftopay`), Quick Autofill lookup bar, dynamic field wrappers (`#field_*`), and live calculation summary.
  - Settings Modal with live backend endpoint configuration and password management.
- **Spreadsheet View (`#viewExcel`)**: 3-sheet tab navigation bar (`#sheetTab_all`, `#sheetTab_tobilled`, `#sheetTab_atopay`, `#sheetTab_ftopay`) and 28-column grid (`#excelTableBody`).

### `js/calculations.js`
- Authoritative formula engine evaluating all 28 columns (A through AB).
- Strictly implements:
  - `F/TO-PAY`: Full Freight collected via COD at unloading, pending amount = 0.
  - `A/TO-PAY`: Balance collected via COD at unloading ($COD = Freight - TM - Adv1$), pending amount = 0.
  - `TOBILLED`: Initial pending $= Freight - TM - Advances$; Final pending $= Initial Pending + Extra Amount - PM$.
- Standalone, idempotent, and produces identical results on repeat calls.

### `js/table.js`
- **Spreadsheet View**: Filters table rows dynamically by selected sheet tab and recalculates bottom sum totals.
- **Form Dynamic Visibility**: `selectToPayStatus(status)` and `updateFormFieldsVisibility(status)` show only applicable inputs for the chosen mode.
- **ExcelJS Export**: Asynchronously builds a 4-sheet workbook (`TOBILLED`, `A_TOPAY`, `F_TOPAY`, `Master Ledger`) with rich formatting, column widths, number formats, and totals rows.

### `backend/Code.gs`
- Google Apps Script web application serving `doGet` and `doPost`.
- Maintains 28 authoritative column headers matching master workbook.
- Enforces strict unique LR verification to reject duplicate shipments.

