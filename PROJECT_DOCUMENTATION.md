# Brokerage & Trip Ledger — End-to-End Project Documentation
### Brokerage Ledger • Enterprise Freight & Fleet Management

---

## 1. Executive Summary & Enterprise Context

The **Brokerage & Trip Ledger** is an enterprise-grade fleet logistics and freight accounting web application developed strictly for **`E:\TR\P1\`**. Developed by **Shravan Kumar** for **Transport Brokerage Ledger Pvt Ltd**, it connects directly with the 27-column master workbook **`BROKER DETAILS ADVANCE BALC DETAILS.xlsx`** (Sheet: `final`), providing:

- **SR_T Identical Authentication**: Full-screen login portal with 1-click user switcher (`ADMIN` vs `RUDRA`), password validation with visibility toggle, session persistence, and full-screen personalized welcome splash screen.
- **Enterprise Footer on All Pages**: Pinned footer across the login screen, executive dashboard, trip edit cards, and 1:1 Excel spreadsheet view:
  `Brokerage Ledger • Enterprise Freight & Fleet Management`
  `© 2026 Transport Brokerage Ledger Pvt Ltd • Developed by Shravan Kumar • All Rights Reserved`
- **Slide-in Navigation Drawer**: Collapsible menu with User profile card, clean single-line navigation links (`Dashboard`, `Trip Operations`, `Spreadsheet View`, `Sync Cloud Database`, `Export Excel (.xlsx)`, `Settings & API`), live status indicator (`Online • 19 Verified Trips`), and prominent red Logout button.
- **Authoritative Google Apps Script Backend (`backend/Code.gs`)**: Full Google Apps Script engine providing concurrency locks (`LockService`), dynamic calculations, Google Drive timestamped backups (`Brokerage_Backups`), and versioned JSON REST API endpoints.
- **Dynamic Mathematical Calculation Engine**: Automatically calculates intermediate balances (`BALC`, Column W) and final balances (`FINAL BALC`, Column Y) based on ToPay conditions (`F/TO-PAY`, `A/TO-PAY`, Standard).
- **Executive Operational Alerts Panel**: Scans for shipments pending Proof of Delivery (`POD RECD`) dates, displaying 10 pending alerts in a multi-column responsive grid with zero overlapping.
- **Full Viewport Responsive Layout (Zero Dead Bottom Space)**: Full height (`100vh`/`100dvh`) flex layout that eliminates empty white bottom space and auto-adapts across laptops, tablets, and phones.
- **1:1 Live Excel Replica with Zoom Controls & Genuine `.xlsx` Export**: Complete 27-column spreadsheet view (Columns A to AA) with Excel Zoom controls (`80% Fit`, `90%`, `100%`, `115%`), sticky header, and accounting totals row pinned at the bottom.

---

## 2. System Architecture & Directory Structure

```
E:\TR\P1\
│
├── index.html                   # Master HTML, full-page auth portal, drawer & viewports
├── README.md                    # Project overview, formulas, credentials & setup guide
├── PROJECT_DOCUMENTATION.md     # In-depth architectural & column mapping guide
├── ARCHITECTURE.md              # Technical specification & system design
├── Excel-Formula-Project-Details.md # Formula analysis & workbook audit
├── BROKER DETAILS ADVANCE BALC DETAILS.xlsx # Master 27-column binary workbook
│
├── backend\
│   └── Code.gs                  # Authoritative Google Apps Script cloud database engine
│
├── css\
│   └── styles.css               # Full-viewport layout, auth screen, grid & cards
│
├── js\
│   ├── api.js                   # Cloud synchronization service & offline store fallback
│   ├── auth.js                  # RBAC authentication, user switcher, splash & session
│   ├── data.js                  # Data persistence manager & pre-seeded verified records
│   ├── calculations.js          # Dynamic formula engine (BALC, FINAL BALC, Topay)
│   ├── dashboard.js             # KPI totals, operational alerts & monthly analytics
│   ├── table.js                 # 1:1 Excel grid, cards renderer, zoom & ExcelJS export
│   └── app.js                   # Navigation orchestrator, drawer controller & filters
│
└── libs\
    ├── exceljs.min.js           # ExcelJS spreadsheet engine
    ├── FileSaver.min.js         # Client-side file saving
    └── xlsx.full.min.js         # SheetJS engine
```

---

## 3. Authentication & RBAC Security Model (Identical to SR_T)

### 1. Full-Screen Authentication Portal
When a user visits the application without an active session or clicks **`🚪 Logout`**, the system presents the full-page authentication portal:

* **Header:**
  * Title: `🚛 Shinex Transport & Brokerage Ledger`
  * Subtitle: `Fleet Logistics & Financial Accounts Management`
  * Action: `Sign in with your secure account`
* **User Selector (`user-switch-group`):**
  * `👑 ADMIN` (Administrator)
  * `👤 RUDRA` (User / Fleet Employee)
* **Password Field:**
  * Auto-focused with dynamic placeholder (`Enter password for Admin` / `Enter password for Rudra`).
  * Password visibility toggle button (`👁️` / `🙈`).
* **Submit Action:**
  * Full-width `🚀 Secure Login` button.
* **Credit Subtext:**
  * `Developed by Shravan Kumar • Enterprise Freight & Fleet Management • 2026`
* **Portal Footer Bar:**
  * `Brokerage Ledger • Enterprise Freight & Fleet Management`
  * `© 2026 Transport Brokerage Ledger Pvt Ltd • Developed by Shravan Kumar • All Rights Reserved`

### 2. Pre-Configured Credentials

| User Account | Role | Strict Authorized Password | Permissions |
|:---:|:---:|:---|:---|
| **ADMIN** | `Admin` | `Shravan@2505` | **Full Administrative Access:**<br>• Create shipments<br>• Edit all 27 columns<br>• Enter & update POD dates<br>• **Delete shipments (`🗑️`)**<br>• Restore original data<br>• Export formatted Excel `.xlsx` |
| **RUDRA** | `Employee` | `RudraSarika@2505` | **Fleet Operations Access:**<br>• Create shipments<br>• Edit shipment information<br>• Enter & update POD dates<br>• **Delete is Restricted (`🔒 Admin Delete`)**<br>• Export formatted Excel `.xlsx` |

---

## 4. Authoritative Google Apps Script Backend (`backend/Code.gs`)

The cloud backend is implemented in `E:\TR\P1\backend\Code.gs`:

### Handlers & API Operations:
- `doGet(e)`:
  - `action=getAll`: Extracts all trips, validates numbers, computes summaries, returns JSON/JSONP.
  - `action=getVersion`: Returns current database revision tag for cache invalidation.
- `doPost(e)`:
  - Uses `LockService.getScriptLock()` with a 15-second timeout to prevent concurrent write collisions.
  - `action=saveTrip`: Validates and saves a trip row (insert if new, overwrite row if existing).
  - `action=deleteTrip`: Deletes row `r` (Admin only).
  - `action=backupDatabase`: Creates a timestamped Google Drive copy in `Brokerage_Backups`.
  - `action=restoreDatabase`: Re-seeds the sheet with the authoritative 19 verified records.

---

## 5. Spreadsheet Data Dictionary & Column Mapping (A to AA)

Every column in the application maps directly to `BROKER DETAILS ADVANCE BALC DETAILS.xlsx`:

| Col | Excel Header | Data Type | Description |
|:---:|:---|:---:|:---|
| **A** | `SL NO` | Number | Serial sequence number (starts at `1`, auto-incrementing) |
| **B** | `TRSP NAME` | Text | Transporter / fleet vendor name (e.g. `ANTP SAINATH`, `SARITHA TRSP`) |
| **C** | `DATE` | Date (`DD-MM-YYYY`) | Shipment booking / dispatch date |
| **D** | `LR NO` | Text | Lorry Receipt number (e.g. `207`, `191/192`) |
| **E** | `TRUCK NO` | Text | Vehicle registration plate (e.g. `AP39UD3564`, `TG15T6666`) |
| **F** | `FROM` | Text | Dispatch origin city (e.g. `MEDCHAL`, `LUCKNOW`, `RAIPUR`) |
| **G** | `TO` | Text | Destination city (e.g. `MEDCHAL`, `COOCHBEHAR`, `PURNIA`) |
| **H** | `ACCOUNT NO` | Text | Bank account number of transporter/driver |
| **I** | `IFSC CODE` | Text | Bank branch IFSC code |
| **J** | `PAYMENT MADE` | Text | Beneficiary bank / payment gateway (e.g. `SBI BANK`, `ICICI BANK`) |
| **K** | `FRIGHT` | Currency (₹) | Agreed gross freight charge |
| **L** | `DATE` | Date (`DD-MM-YYYY`) | First advance payment date |
| **M** | `Topay` | Text | ToPay classification flag: `F/TO-PAY`, `A/TO-PAY`, or Blank |
| **N** | `T/M` | Number (₹) | Transporter commission / loading fee deduction |
| **O** | `ADVANCE` | Currency (₹) | Advance 1 amount |
| **P** | `DATE 2` | Date (`DD-MM-YYYY`) | Advance 2 payment date |
| **Q** | `ADVANCE2` | Currency (₹) | Advance 2 amount |
| **R** | `DATE3` | Date (`DD-MM-YYYY`) | Advance 3 payment date |
| **S** | `ADVANCE3` | Currency (₹) | Advance 3 amount |
| **T** | `Topay(COD)` | Currency (₹) | Cash-on-Delivery amount collected from consignee |
| **U** | `P/M` | Number (₹) | Point Mamul / unloading labor deduction 1 |
| **V** | `DATE` | Date (`DD-MM-YYYY`) | Intermediate settlement date |
| **W** | `BALC` | Currency (₹) | **Computed intermediate balance:** `=IF(LEFT(M,1)="F",0,IF(LEFT(M,1)="A",K-N-O-T,K-(O+Q+S+U+T)))` |
| **X** | `P/M` | Number (₹) | Secondary point Mamul deduction 2 |
| **Y** | `FINAL BALC` | Currency (₹) | **Computed net final balance payable:** `=W-X` |
| **Z** | `POD RECD` | Date / Text | Proof of Delivery receipt date. If empty, triggers Missing POD alert |
| **AA**| `NOTE` | Text | Operational annotations (e.g. `41BAGS WET CONDITION`) |

---

## 6. Financial Verification & Audit Totals

Tested and verified against the master workbook:

* **Active Trips:** `19`
* **Gross Agreed Freight:** `₹25,69,250`
* **Advances Paid (O+Q+S):** `₹11,90,184`
* **Net Final Balance (Y):** `₹11,66,700`
* **Pending POD Deliveries:** `10`
* **Received POD Deliveries:** `9`
