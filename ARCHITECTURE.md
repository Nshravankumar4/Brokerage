# Transport Brokerage Ledger — Master Technical Architecture & Specification
### Transport Brokerage Ledger Pvt Ltd • Enterprise Freight & Fleet Management System

**System Brand:** `Transport Brokerage Ledger`  
**Parent Entity:** `Transport Brokerage Ledger Pvt Ltd`  
**Local Codebase:** `E:\TR\P1\` (All development, UI, and backend code resides strictly in `P1`)  
**Reference System (Read-Only):** `E:\TR\SR_T` (`https://github.com/Nshravankumar4/SR_T`)  
**Authoritative Workbook Source:** `BROKER DETAILS ADVANCE BALC DETAILS.xlsx` (Worksheet: `final`)  
**Authoritative Cloud Endpoint:** `https://script.google.com/macros/s/AKfycbxhwvJi8UDsJd2yFo9oprDAQGS8M9L6UfcM5M9Tmn98UPZFP8ijYdS9ZIYAl4hiyKbopA/exec`  
**Specification Version:** 7.0 (Production Layout, Date Pickers, Full-Width POD Alerts & Exact Workbook Reconciled)

---

## 1. Application Branding & Footer Standard

### 1.1 Application Heading & Subtitle
- **Header Title:** `Transport Brokerage Ledger`
- **Header Subtitle:** `Fleet Logistics & Financial Accounts Management`
- **Menu Button:** A functional `☰ Menu` button is positioned immediately before the application title in the header navbar, opening a left slide-in drawer.

### 1.2 Mandatory Footer Branding
Applied consistently across all screens: the Login Portal (`#authWrapper`), Executive Dashboard, Trip Edit, Spreadsheet View, and Settings:
```html
<footer class="app-footer">
  <span><strong>Brokerage Ledger • Enterprise Freight &amp; Fleet Management</strong></span>
  <span>© 2026 Transport Brokerage Ledger Pvt Ltd • Developed by <strong>Shravan Kumar</strong> • All Rights Reserved</span>
</footer>
```

---

## 2. Left-Side Navigation & Settings Drawer

A slide-in drawer following the established `SR_T` navigation pattern opens when clicking `☰ Menu`:

### 2.1 Drawer Header & User Profile
- Brand Title: `Transport Brokerage Ledger`
- Subtitle: `Fleet Logistics & Financial Accounts Management`
- User Profile Card: User avatar, authenticated username (`Shravan (Admin)` / `Rudra (Employee)`), and role badge (`ADMIN` / `USER`).

### 2.2 Navigation Menu Items (Strict Clean Order)
1. `📊 Dashboard` — Executive KPIs, full-width POD alerts, and monthly breakdown.
2. `✏️ Trip Edit / Trip Management` — Interactive cards view for rapid dispatch updates.
3. `📑 View Excel Type` — 1:1 replica of the 27-column spreadsheet (A to AA) with Excel Zoom controls (`80% Fit`, `90%`, `100%`, `115%`).
4. `📥 Export Excel (.xlsx)` — Generates genuine `.xlsx` with preserved headers and cell fills.
5. `⚙️ Settings & API` — Opens system diagnostics, maintenance actions, cloud API configuration, and password change.

### 2.3 System Status & Drawer Footer
- **Live Status:** `Online • 19 Verified Trips` with `🔄 Sync` button.
- **Logout / Switch User:** Clears session and returns to the full-screen authentication portal.
- **Maintenance Actions:** Maintenance tools (Reset all filters, Restore original data, Password change, Cloud API URL) are housed cleanly in the Settings modal (`⚙️ Settings & API`).

---

## 3. Strict Linear Dashboard Hierarchy

The executive dashboard is organized in three vertical sections:

```
┌────────────────────────────────────────────────────────────────────────┐
│ TOP: 4 PRIMARY KPI METRIC CARDS (Responsive Grid)                      │
│ [ Total Shipments: 19 ]   [ Total Freight: ₹25,69,250 ]                │
│ [ Advances Paid: ₹11,90,184 ]   [ Final Outstanding: ₹11,66,700 ]       │
├────────────────────────────────────────────────────────────────────────┤
│ MIDDLE: ⚠️ POD STATUS & MISSING ALERTS (100% FULL WIDTH)               │
│ - Actual Dynamic Counter: 10 Pending                                   │
│ - Responsive Multi-Column Grid of Missing POD Shipment Cards           │
│ - Overlapping Completely Eliminated with min-width: 0 and text-overflow│
│ - Quick Action: "Enter POD →" (Opens trip directly in modal)          │
│ - Filter Button: "🔍 Filter Only Missing POD Trips"                   │
├────────────────────────────────────────────────────────────────────────┤
│ BOTTOM: 📅 MONTHLY FINANCIAL BREAKDOWN (100% FULL WIDTH)               │
│ - Aug 2026: 1 Trip  | Freight: ₹65,000   | Adv: ₹65,000   | Balc: ₹0   │
│ - Sep 2026: 7 Trips | Freight: ₹9,38,000 | Adv: ₹4,55,050 | Balc: ₹4.4L│
│ - Oct 2026: 11 Trips| Freight: ₹15.66L   | Adv: ₹6,70,134 | Balc: ₹7.2L│
│ - Clickable Month Cards with 1-Click Filter Action                     │
└────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Top — Four KPI Metric Cards
1. **Total Shipments:** `19` (🚛) • `Active fleet trip records`
2. **Total Freight:** `₹25,69,250` (💵) • `Gross freight agreed (Col K)`
3. **Advances Paid:** `₹11,90,184` (💳) • `Total advances (Adv 1+2+3)`
4. **Final Outstanding Balance:** `₹11,66,700` (⚖️) • `Net balance payable (Col Y)`

### 3.2 Middle — Full-Width POD Status & Missing Alerts Panel
Spans 100% of the dashboard width. The pending count is calculated dynamically from real trip records (10 pending out of 19 trips in the master workbook). Overlapping has been completely eliminated using `min-width: 0`, `overflow: hidden`, `text-overflow: ellipsis`, and `flex: 1 1 0` across all text elements.

### 3.3 Bottom — Monthly Financial Breakdown
Spans 100% of the dashboard width. Shows dynamic cards for August 2026, September 2026, and October 2026 with gross freight, advances paid, net balance, and interactive filter triggers.

---

## 4. Strict Role-Based Authentication & Cryptographic Security

### 4.1 Authorized Credentials
No test or default passwords (`123`, `admin`, etc.) are permitted. Only these exact credentials grant access:

| Account | Role | Strict Authorized Password | SHA-256 Cryptographic Hash |
|:---:|:---:|:---:|:---|
| **ADMIN** | `admin` | `Shravan@2505` | `ded12726612993e58a7f6f1b0428300adcf13f6cabb7515436c5888b3de21c0b` |
| **RUDRA** | `employee` | `RudraSarika@2505` | `0a623bcaece42a5740cdfb0b78849ec8717d811c8c2583697ab884513f4d9e3f` |

- Reject blank passwords, incorrect passwords, and unknown usernames.
- Zero credential leakage in error messages (`Invalid credentials for ${selectedType}. Access denied.`).
- Full-screen personalized welcome splash screen on successful login.

---

## 5. Native Date Pickers & Timezone-Safe Conversion

All date entry and editing operations use native browser date inputs:
`<input type="date">`

### Mapped Date Fields

| Workbook Column | Field Description | HTML Input ID |
|:---:|:---|:---|
| **C** | Trip Date | `m_date` |
| **L** | Advance 1 Date | `m_date1` |
| **P** | Advance 2 Date | `m_date2` |
| **R** | Advance 3 Date | `m_date3` |
| **V** | Settlement / Payment Date | `m_payDate` |
| **Z** | POD Received Date | `m_pod` |
| **Toolbar** | Date Range Filter (From / To) | `filterDateFrom` / `filterDateTo` |

---

## 6. Authoritative Column Mapping (A to AA — 27 Columns)

| Column | Header | Data Type | Notes |
|:---:|:---|:---|:---|
| **A** | `SL NO` | Number | Sequential starting at 1 |
| **B** | `TRSP NAME` | String | Transporter / Fleet owner |
| **C** | `DATE` | Date (`DD-MM-YYYY`) | Dispatch date |
| **D** | `LR NO` | String | Lorry receipt reference |
| **E** | `TRUCK NO` | String | Vehicle registration |
| **F** | `FROM` | String | Loading station (e.g. Medchal) |
| **G** | `TO` | String | Unloading destination |
| **H** | `ACCOUNT NO` | String | Bank account number |
| **I** | `IFSC CODE` | String | Bank IFSC identifier |
| **J** | `PAYMENT MADE` | String | Bank name / payment mode |
| **K** | `FRIGHT` | Currency | Agreed freight amount |
| **L** | `DATE` | Date (`DD-MM-YYYY`) | Advance 1 payment date |
| **M** | `Topay` | String | `F/TO-PAY`, `A/TO-PAY`, or Blank (Green header) |
| **N** | `T/M` | Currency | Transit Mamul deduction |
| **O** | `ADVANCE` | Currency | Advance 1 amount (Purple header) |
| **P** | `DATE 2` | Date (`DD-MM-YYYY`) | Advance 2 payment date |
| **Q** | `ADVANCE2` | Currency | Advance 2 amount |
| **R** | `DATE3` | Date (`DD-MM-YYYY`) | Advance 3 payment date |
| **S** | `ADVANCE3` | Currency | Advance 3 amount |
| **T** | `Topay(COD)` | Currency | Cash on Delivery / Consignee collection |
| **U** | `P/M` | Currency | Point Mamul deduction |
| **V** | `DATE` | Date (`DD-MM-YYYY`) | Balance settlement date |
| **W** | `BALC` | Currency | Intermediate balance (Yellow header) |
| **X** | `P/M` | Currency | Secondary Point Mamul deduction |
| **Y** | `FINAL BALC` | Currency | Final outstanding balance (Red header) |
| **Z** | `POD RECD` | Date / Status | Proof of Delivery receipt date |
| **AA** | `NOTE` | String | Operational remarks |

---

## 7. Verified Financial Calculation Engine

Formulas extracted from `BROKER DETAILS ADVANCE BALC DETAILS.xlsx` worksheet `final`:

### 7.1 Intermediate Balance (`BALC` — Column W)
```excel
=IF(LEFT(UPPER(TRIM(M2)),1)="F", 0, IF(LEFT(UPPER(TRIM(M2)),1)="A", K2-N2-O2-T2, K2-(O2+Q2+S2+U2+T2)))
```
1. **Full ToPay (`F/TO-PAY`)**: Returns `0`. Consignee pays full freight at destination; no broker balance payable at dispatch.
2. **Advance ToPay (`A/TO-PAY`)**: Freight ($K$) $-$ Transit Mamul ($N$) $-$ Advance 1 ($O$) $-$ COD ($T$). Evaluates to `₹0` for trips 18 & 19 where COD equals the net balance.
3. **Standard Freight**: Freight ($K$) $-$ (Advances $O+Q+S$ + Mamul $U$ + COD $T$).

### 7.2 Final Balance (`FINAL BALC` — Column Y)
```excel
=W2 - X2
```
Intermediate balance ($W$) minus secondary Point Mamul ($X$).

### 7.3 Master Workbook Totals Verification (19 Trips)
- **Total Freight:** `₹25,69,250`
- **Total Advance 1:** `₹11,68,950`
- **Total Advance 2:** `₹20,567`
- **Total Advance 3:** `₹667`
- **Total Advances (1+2+3):** `₹11,90,184`
- **Total COD:** `₹1,68,000`
- **Total Transit Mamul (T/M):** `₹2,100`
- **Total Point Mamul (P/M):** `₹1,866`
- **Net Final Balance:** `₹11,66,700`
- **Total Records:** `19` | **Pending POD:** `10` | **Received POD:** `9`

---

## 8. Viewport Layout & Zero-Whitespace CSS

```css
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #0f172a;
}

.app-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: #f8fafc;
}

.app-navbar, .dashboard-toolbar, .app-footer {
  flex: 0 0 auto;
}

.app-main-content {
  display: flex;
  flex-direction: column;
  flex: 1 1 0;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  background: #f8fafc;
}

.view-container.active {
  display: flex;
  flex-direction: column;
  flex: 1 1 0;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}

.dashboard-wrapper,
.trip-edit-scroll,
.excel-table-scroll {
  flex: 1 1 0;
  min-height: 0;
  min-width: 0;
  overflow-y: auto;
  background: #f8fafc;
}
```

This flexbox structure guarantees that the content area fills the entire height between navbar/toolbar and footer, preventing vertical dead space on all laptop, desktop, and mobile screen sizes.

---

## 9. Genuine Excel Export Engine

The export engine utilizes `libs/exceljs.min.js` and `libs/FileSaver.min.js`:
- Exports all 27 columns (A to AA).
- Preserves exact header fill colors (Navy, Green Topay `#16A34A`, Purple Advance `#7E22CE`, Yellow Balc `#CA8A04`, Red Final Balc `#B91C1C`).
- Pinned bottom `SUM TOTALS:` row in `#FEF08A` with double-line borders.
- Formats dates as valid Excel dates and monetary amounts with currency formatting (`#,##0`).
- Generates a standalone, binary `.xlsx` workbook: `Transport_Brokerage_Ledger_{TIMESTAMP}.xlsx`.
