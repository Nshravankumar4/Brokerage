# 🚛 SR Brokerage Ledger
### Fleet Logistics & Financial Accounts Management

A production-grade, high-performance enterprise web application designed for freight brokerage accounts, broker advances reconciliation, multi-point delivery tracking, and Proof of Delivery (POD) monitoring. Developed by **Shravan Kumar** for **Transport Brokerage Ledger Pvt Ltd**.

* **Mandatory Project Scope:** `E:\TR\P1\` (All development, UI, and backend code resides strictly in `P1`)
* **Reference System (Read-Only):** `E:\TR\SR_T` (`https://github.com/Nshravankumar4/SR_T`)
* **Authoritative Workbook:** `BROKER DETAILS ADVANCE BALC DETAILS.xlsx` (Sheet: `final`, 27 Columns A to AA)
* **Authoritative Cloud Backend:** `E:\TR\P1\backend\Code.gs` (Google Apps Script with atomic locks and Drive backup)

---

## 🔐 1. Authentication & Security (Identical to SR_T)

The application features an enterprise login screen with quick role switching, password security, and automated session persistence:

```
┌────────────────────────────────────────────────────────┐
│                 🚛 SR Brokerage Ledger                 │
│     Fleet Logistics & Financial Accounts Management    │
│             Sign in with your secure account           │
│                                                        │
│  Select User Account:                                  │
│  ┌───────────────────────┐  ┌───────────────────────┐  │
│  │ 👑 ADMIN              │  │ 👤 RUDRA              │  │
│  │   Administrator       │  │    User / Employee    │  │
│  └───────────────────────┘  └───────────────────────┘  │
│                                                        │
│  🔑 Password: [ •••••••••••• ] [ 👁️ ]                   │
│                                                        │
│  [ 🚀 Secure Login ]                                   │
│                                                        │
│  Developed by Shravan Kumar                            │
│  Enterprise Freight & Fleet Management • 2026          │
└────────────────────────────────────────────────────────┘
```

### Pre-Configured Accounts & Permissions

| Role | User Account | Display Name | Permissions | Security Verification |
|:---:|:---:|:---:|:---|:---|
| 👑 | **ADMIN** | `Shravan (Admin)` | **Full Control:** Add shipments, edit details, update POD, delete records (`🗑️`), restore default data, change passwords, export Excel | SHA-256 Hash Verified (Client & Server RBAC Enforced) |
| 👤 | **RUDRA** | `Rudra (Employee)` | **Fleet Operations:** Add shipments, edit details, update POD. **Delete is restricted (`🔒 Admin Delete`)** | SHA-256 Hash Verified (Client & Server RBAC Enforced) |

### Security Features:
* **Strict Authentication:** Grounded with SHA-256 cryptographic hashing. Zero plain-text credentials stored in source code or runtime files.
* **Instant Login:** Authentication is instantaneous (<40ms) using SHA-256 local verification; cloud syncing executes asynchronously in background without blocking the UI.
* **10-Minute Inactivity Auto-Logout:** Automated idle timer automatically logs out after 10 minutes of user inactivity (`mousemove`, `keydown`, `touchstart`, `scroll`) and prompts to sign in again.

### Mandatory Global Footer Branding Across All Pages
Both the authentication screen and all main views (Dashboard, Trip Edit, View Excel Type) display the clean enterprise footer:
* `SR Brokerage Ledger • Enterprise Freight & Fleet Management`
* `© 2026 Transport Brokerage Ledger Pvt Ltd • Developed by Shravan Kumar • All Rights Reserved`

---

## ☁️ 2. Authoritative Cloud Backend (`backend/Code.gs`)

The cloud backend is implemented in `E:\TR\P1\backend\Code.gs` for Google Sheets deployment:

### Backend Capabilities:
1. **Google Sheets Database (`final` Sheet, Columns A to AA):** 27-column structure mapping 1:1 with `BROKER DETAILS ADVANCE BALC DETAILS.xlsx`.
2. **Multi-Tier Sheet Discovery (Prevents "Spreadsheet not found"):**
   * Accepts explicit `sheetId` parameter from URL (`?sheetId=...`) or POST body.
   * Checks container-bound active spreadsheet (`SpreadsheetApp.getActiveSpreadsheet()`).
   * Checks configured `SPREADSHEET_ID` variable at top of `Code.gs`.
   * Checks saved persistent Script Properties.
   * Auto-discovers existing workbook in Google Drive by filename (`BROKER DETAILS ADVANCE BALC DETAILS` or `Transport Brokerage Ledger`).
   * Auto-creates a new Google Spreadsheet in Drive if none exists so the script never crashes.
3. **Real-Time Version Tracking (`getVersion` / `DATA_VERSION`):** State-machine tracking every mutation for 3.5s background polling without heavy reads.
4. **Concurrency Locking (`LockService.getScriptLock()`):** 15-second atomic lock prevention against race conditions during simultaneous edits.
5. **Automated Dynamic Calculation Engine:** Automatic computation of intermediate balance (`BALC` - Col W) and net balance (`FINAL BALC` - Col Y).
6. **Point-in-Time Automated Backups (`DriveApp`):** Automated creation of timestamped copies in Google Drive folder `Brokerage_Backups`.
5. **Endpoints:**
   * `GET ?action=getAll`: Returns all trips, totals, and pending POD count.
   * `GET ?action=getVersion`: Returns active data revision tag for instant browser sync.
   * `POST {action: 'saveTrip', trip: {...}}`: Atomically inserts or updates a trip row.
   * `POST {action: 'deleteTrip', rowNum: N}`: Deletes trip row (Admin only).
   * `POST {action: 'backupDatabase'}`: Creates Drive backup snapshot.
   * `POST {action: 'restoreDatabase'}`: Resets sheet to the verified current workbook snapshot.

### How to Deploy `backend/Code.gs`:
1. Open your Google Spreadsheet containing the `final` sheet.
2. In the top menu, go to **Extensions > Apps Script**.
3. Clear existing contents and paste the code from `E:\TR\P1\backend\Code.gs`.
4. Click **Deploy > New deployment**.
5. Select type: **Web app**.
   * Description: `Brokerage Ledger v7.0`
   * Execute as: `Me`
   * Who has access: `Anyone`
6. Click **Deploy** and copy the generated Web App URL.
7. Open the application, open the Drawer Menu > **Settings & API**, paste your Web App URL into the **Google Sheets API Sync** input, and click **Save URL**.

---

## 📌 3. Verified Excel Formulas & Financial Reconciliation

Reconciled directly against `BROKER DETAILS ADVANCE BALC DETAILS.xlsx` (Sheet: `final`):

### 1️⃣ Column W (`BALC` — Intermediate Balance)
```excel
=IF(LEFT(UPPER(TRIM(M2)),1)="F", 0, IF(LEFT(UPPER(TRIM(M2)),1)="A", K2-N2-O2-T2, K2-(O2+Q2+S2+U2+T2)))
```
* **Column M Header:** `ToPayStatus` (Strict Dropdown Options: `A/TO-PAY`, `F/TO-PAY`, `TOBILLED`).
* **`F/TO-PAY` (Col M starts with `F`):** Evaluates to `0`. (Consignee pays entire freight at destination).
* **`A/TO-PAY` (Col M starts with `A`):** $\text{Freight (K)} - \text{T/M (N)} - \text{Advance (O)} - \text{To-Billed COD (T)}$.
* **`TOBILLED` (Standard Default):** $\text{Freight (K)} - (\text{Adv1 (O)} + \text{Adv2 (Q)} + \text{Adv3 (S)} + \text{P/M (U)} + \text{To-Billed COD (T)})$.

### 2️⃣ Column Y (`FINAL BALC` — Net Outstanding Balance)
```excel
=W2-X2
```
* Subtracts Col X (`P/M` — Secondary Mamul) from intermediate balance (`Col W`).
* Trips 18 & 19 (where Advance + COD equals Freight) correctly evaluate to ₹0 balance.

### Master Ledger Financial Verification (19 Trips)
* **Total Shipments:** `19`
* **Gross Freight (Col K):** `₹25,69,250`
* **Advances Paid (Col O + Q + S):** `₹11,90,184`
* **Net Final Balance (Col Y):** `₹11,66,700`
* **Proof of Delivery (POD):** `10 Pending` | `9 Received`

---

## 🖥️ 4. Application Architecture & Views

### 1. Slide-In Sidebar / Navigation Drawer
Accessed via the **☰ Menu** button in the header. Sleek navy dark theme matching `SR_T`:
* **Header:** 🚛 SR Brokerage Ledger • Fleet Logistics & Financial Accounts Management
* **User Badge:** Compact avatar, active user name, role badge (`ADMIN` / `EMPLOYEE`).
* **Navigation Links (Single-Line, No Wrapping):**
  * `📊 Dashboard`
  * `✏️ Trip Operations`
  * `📑 Spreadsheet View`
  * `🔄 Sync Cloud Database`
  * `📥 Export Excel (.xlsx)`
  * `⚙️ Settings & API` (Admin Only)
* **Footer:** Live status indicator (`Online • 19 Verified Trips`), sync button (`🔄 Sync`), prominent red logout button (`🚪 Logout / Switch User`), and mandatory enterprise footer:
  `SR Brokerage Ledger • Enterprise Freight & Fleet Management`
  `© 2026 Transport Brokerage Ledger Pvt Ltd • Developed by Shravan Kumar • All Rights Reserved`
* **Zero Scrollbar Guarantee:** Sleek scrollbar-free styling with `scrollbar-width: none` ensures clean presentation across mobile, tablet, and desktop without native scrollbar intrusion.

### 2. Executive Dashboard (Linear Top-to-Bottom Layout)
* **Top (UP):** 4 Primary KPI metric cards across the top (`Total Shipments: 19`, `Total Freight: ₹25,69,250`, `Advances Paid: ₹11,90,184`, `Final Outstanding Balance: ₹11,66,700`).
* **Middle:** Dedicated **⚠️ POD Status & Missing Alerts** panel spanning 100% full width from left to right.
  * Displays 10 pending POD shipments in a multi-column responsive grid.
  * Overlapping bug completely eliminated using strict flex constraints (`min-width: 0`, text truncation, and fixed-shrink action button).
  * Direct **`Enter POD →`** action button opens edit modal with autofocus on the date picker.
* **Bottom (LAST DOWN):** **📅 MONTHLY FINANCIAL BREAKDOWN (CLICK ANY MONTH TO FILTER)** spanning full 100% width.
  * Monthly cards for August, September, October 2026 showing trip counts, freight, advances, and balances.

### 3. Trip Operations View (`✏️ Trip Operations`)
* High-density enterprise dispatch cards.
* Route visualizer: `MEDCHAL ── 🚛 ──> COOCHBEHAR`.
* ToPayStatus badges, financial boxes, and delivery confirmation status.
* Full-height scrolling layout filling 100% of the screen height with zero dead bottom whitespace.
* Single prominent action button: `➕ Add Shipment` with sleek icon accent.

### 4. Spreadsheet View (`📑 Spreadsheet View`)
* 1:1 clean replica of Excel columns A to AA:
  `SL NO`, `TRSP NAME`, `DATE`, `LR NO`, `TRUCK NO`, `FROM`, `TO`, `ACCOUNT NO`, `IFSC CODE`, `PAYMENT MADE`, `FRIGHT`, `DATE`, `ToPayStatus`, `T/M`, `ADVANCE`, `DATE 2`, `ADVANCE2`, `DATE3`, `ADVANCE3`, `To-Billed (COD)`, `P/M`, `DATE`, `BALC`, `P/M`, `FINAL BALC`, `POD RECD`, `NOTE`.
* Pinned header row (`sticky top: 0`).
* Professional accounting totals row pinned at bottom (`sticky bottom: 0`) with single top line and double bottom line (not oversized or bright yellow).
* **Zoom Controls:** `80% Fit`, `90%`, `100%`, `115%` to view all 27 columns comfortably on any laptop or phone screen.
* Sequential SL NO starting at `1` and auto-incrementing.

### 5. Genuine Excel (.xlsx) Export
* Powered by `ExcelJS` and `FileSaver.js`.
* Preserves authentic column header colors (Navy blue `#002060`, Green `#15803d` for ToPayStatus, Purple `#7e22ce` for Advance, Red `#b91c1c` for Final Balance).
* Formats currency amounts as comma-separated Indian numbers (`₹##,##,###`).
* Preserves accounting sum formulas in the exported file.
