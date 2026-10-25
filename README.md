# 🚛 SR Brokerage Ledger
### Fleet Logistics & Financial Accounts Management

A production-grade, high-performance enterprise web application designed for freight brokerage accounts, broker advances reconciliation, multi-point delivery tracking, Proof of Delivery (POD) monitoring, and genuine multi-sheet Excel reporting. Developed by **Shravan Kumar** for **Transport Brokerage Ledger Pvt Ltd**.

* **Mandatory Project Scope:** `E:\TR\P1\` (All development, UI, and backend code resides strictly in `P1`)
* **Reference System (Read-Only):** `E:\TR\SR_T`
* **Authoritative Workbook:** `Final Sheet Broker.xlsx` (Sheet: `final`, 28 Columns A to AB)
* **Pre-Modification Backup:** `E:\TR\P1\backups\Final_Sheet_Broker_backup.xlsx`
* **Authoritative Cloud Backend:** `E:\TR\P1\backend\Code.gs` (Google Apps Script Web App)

---

## 📑 1. Master 28-Column Architecture (Columns A through AB)

The application and workbook maintain a strict 28-column schema:

| Col | Field Heading | Formula / Source | Role |
| :---: | :--- | :--- | :--- |
| **A** | `SL NO` | Sequential ID | Serial Number |
| **B** | `TRSP NAME` | Input | Transporter / Vendor Name |
| **C** | `DATE` | Input | Booking / Trip Dispatch Date |
| **D** | `LR NO` | Input | **Strictly Unique** Lorry Receipt Number |
| **E** | `TRUCK NO` | Input | Vehicle Registration Plate |
| **F** | `FROM` | Input | Origin Loading Point (Default: `MEDCHAL`) |
| **G** | `TO` | Input | Destination Unloading Point |
| **H** | `ACCOUNT NO` | Input | Transporter Bank Account Number |
| **I** | `IFSC CODE` | Input | Bank Branch IFSC Code |
| **J** | `PAYMENT MADE` | Input | Bank / Channel (e.g. `SBI BANK`) |
| **K** | `FRIGHT` | Input | Gross Freight Amount Agreed (₹) |
| **L** | `DATE` | Input | Advance 1 Date |
| **M** | `ToPayStatus` | Dropdown | Status: `A/TO-PAY`, `F/TO-PAY`, `TOBILLED` |
| **N** | `T/M` | Input | Tapal Mamul / Commission deduction (₹) |
| **O** | `ADVANCE` | Input | Advance 1 paid at loading (₹) |
| **P** | `DATE 2` | Input | Advance 2 Date |
| **Q** | `ADVANCE2` | Input | En-route Advance 2 (₹) |
| **R** | `DATE3` | Input | Advance 3 Date |
| **S** | `ADVANCE3` | Input | En-route Advance 3 (₹) |
| **T** | `POD RECD Date` | Input | Physical POD Confirmation Date |
| **U** | `Cash on Delivery (COD) :A/Topay&Ftopay` | **Calculated** | Balance collected at destination unloading (₹) |
| **V** | `Pending Amount: Tobilled` | **Calculated** | $\text{Col K} - \text{Col N} - (\text{Col O} + \text{Col Q} + \text{Col S})$ |
| **W** | `Extra Amount` | Input | Halting Charges / Extra Hamali (₹) |
| **X** | `PM/PA Date` | Input | Payment Mamul Settlement Date |
| **Y** | `P/M` | Input | Payment Mamul deduction on settlement (₹) |
| **Z** | `Pending Amount` | **Calculated** | Final net outstanding balance payable (₹) |
| **AA**| `POD Amount Status` | **Calculated** | Settlement status index (= 0 upon settlement) |
| **AB**| `REMARKS / NOTE` | Input | Operational remarks, halting notes, transfers |

---

## 🧮 2. Authoritative Accounting Rules

The accounting engine in [`js/calculations.js`](file:///e:/TR/P1/js/calculations.js) implements the three transport statuses:

### 1. `TOBILLED` (Broker Pays Transporter Upon Delivery)
- **Pending ToBilled (Col V)**:
  $$\text{Col V} = \text{Freight} - \text{T/M} - (\text{Advance 1} + \text{Advance 2} + \text{Advance 3})$$
- **Final Pending Amount (Col Z)**:
  $$\text{Col Z} = \text{Col V} + \text{Extra Amount (Halting)} - \text{Payment Mamul (P/M)}$$
- **COD (Col U)**: Nonapplicable (₹0 / hidden).

### 2. `A/TO-PAY` (Advance Paid at Origin, Balance Collected as COD)
- **COD @ Unloading (Col U)**:
  $$\text{Col U} = \text{Freight} - \text{T/M} - \text{Advance 1}$$
- **Final Pending Amount (Col Z)**: ₹0 (when COD is collected at destination).
  *If destination party does not pay, unpaid amount is recorded as transferred to transport account.*

### 3. `F/TO-PAY` (Full Freight Payable as COD at Unloading)
- **COD @ Unloading (Col U)**: $\text{Freight}$ (Full Freight Amount).
- **Final Pending Amount (Col Z)**: ₹0 (fully settled via destination collection).

---

## 🚀 3. Key Enhancements & Features

1. **Dynamic Add/Edit Form**: Mode selector pills (`📋 TOBILLED`, `💳 A/TO-PAY`, `🚚 F/TO-PAY`) show only the inputs relevant to the chosen mode.
2. **3-Sheet Spreadsheet View**: The web UI spreadsheet includes tabs for `Master Ledger (All)`, `Sheet 1: TOBILLED`, `Sheet 2: A/TO-PAY`, and `Sheet 3: F/TO-PAY`, dynamically recalculating column sums.
3. **Genuine Multi-Worksheet Excel Export**: Exports `.xlsx` with all 4 formatted sheets using ExcelJS.
4. **Strict Duplicate LR Protection**: Prevents duplicate shipment entries across the entire database.
5. **Clean UTF-8 Typography**: 100% resolution of text encoding corruption and mojibake.

---

## 🧪 4. Automated Verification Test Suites

Two dedicated test suites verify the complete system:

```powershell
# 1. Structural, architectural, backend, and security suite (37 tests)
powershell -ExecutionPolicy Bypass -File "verify_enhancements.ps1"

# 2. Section 20 authoritative mathematical accounting suite (20 tests)
powershell -ExecutionPolicy Bypass -File "verify_calculations.ps1"
```

All 57 automated assertions execute with **100% pass rate** (0 failures).

---

## 📚 5. Documentation Directory (`docs/`)

- [`docs/PROJECT_STRUCTURE.md`](file:///e:/TR/P1/docs/PROJECT_STRUCTURE.md): Architecture overview and component map.
- [`docs/CALCULATION_RULES.md`](file:///e:/TR/P1/docs/CALCULATION_RULES.md): Complete mathematical formulas & handwritten note reconciliation.
- [`docs/BUG_AUDIT.md`](file:///e:/TR/P1/docs/BUG_AUDIT.md): Diagnostic bug register with root causes and fixes.
- [`docs/TEST_REPORT.md`](file:///e:/TR/P1/docs/TEST_REPORT.md): Full test report across calculation scenarios and 8 screen viewports.
- [`docs/DEPLOYMENT.md`](file:///e:/TR/P1/docs/DEPLOYMENT.md): Setup, default passwords, Google Apps Script deployment, and rollback guide.

---

## 👤 Branding & Copyright
- **Application:** SR Brokerage Ledger • Enterprise Freight & Fleet Management
- **Developer:** Shravan Kumar
- **Copyright:** © 2026 Transport Brokerage Ledger Pvt Ltd • All Rights Reserved
