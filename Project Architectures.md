# SR Brokerage Ledger — Project Architectures & Technical Specification

> **Enterprise Fleet Logistics & Financial Accounts Management System**  
> **Author & Developer:** Shravan Kumar  
> **Organization:** Transport Brokerage Ledger Pvt Ltd  
> **Current Version:** Upgrade 1.2 (Active Production Build)  
> **Master Schema:** 28 Columns (A through AB)  
> **Authoritative Master Workbook:** `BROKER DETAILS ADVANCE BALC DETAILS.xlsx` / `Final Sheet Broker.xlsx`

---

## 1. System Architecture & High-Level Design

The **SR Brokerage Ledger** is a dual-tier freight logistics and transport accounting management application designed for zero-latency local operations combined with enterprise-grade Google Sheets cloud synchronization.

```
+-----------------------------------------------------------------------------------+
|                              SR BROKERAGE LEDGER UI                               |
|   (index.html - 100% Pure 7-bit ASCII with HTML Character Entities, Zero Mojibake)|
+------------------------------------+----------------------------------------------+
                                     |
              +----------------------+----------------------+
              |                                             |
              v                                             v
     [js/auth.js]                                 [js/table.js]
  - SHA-256 Credentials                        - 28-Column Master Ledger
  - Admin / Rudra RBAC                         - 3-Sheet Tab Navigation
  - Inactivity Lock                            - Amount Persistence on Mode Toggle
              |                                - Dynamic Column Hiding
              |                                             |
              +----------------------+----------------------+
                                     |
                                     v
                           [js/calculations.js]
              - Verified Mathematical Engine
              - Status-Specific Rules (F/TO-PAY, A/TO-PAY, TOBILLED)
              - POD Settlement Automation (Col AA = DONE)
                                     |
                                     v
                              [js/data.js]
              - In-Memory Tri-Store
              - LocalStorage Fallback & BroadcastChannel Cross-Tab Sync
                                     |
                                     v
                               [js/api.js]
              - REST & JSONP Live Cloud Sync
              - Version 6 Google Apps Script Deployment
                                     |
                                     v
+-----------------------------------------------------------------------------------+
|                   GOOGLE APPS SCRIPT CLOUD BACKEND (backend/Code.gs)              |
|                     Concurrency Guarded with LockService.getScriptLock()           |
+------------------------------------+----------------------------------------------+
                                     |
              +----------------------+----------------------+
              |                      |                      |
              v                      v                      v
        [ TOBILLED ]            [ A-TO-PAY ]           [ F-TO-PAY ]
    Physical Worksheet 1    Physical Worksheet 2   Physical Worksheet 3
      (Col U COD Hidden)     (Col V Pend Hidden)    (Col V Pend Hidden)
              ^                      ^                      ^
              |                      |                      |
              +----------------------+----------------------+
                                     |
                   [ migrateHistoricalFinalRecords() ]
              - Global Deduplication across All 3 Worksheets
              - Idempotent Migration from Historical 'final' Sheet
              - Automatic Deletion of Blank Default 'Sheet1'
```

---

## 2. Authoritative 28-Column Master Schema (A to AB)

Every worksheet (`TOBILLED`, `A-TO-PAY`, `F-TO-PAY`, and master `final`) strictly implements the identical 28-column accounting structure:

| Col | Header Name | Type | Formula / Business Rule | Applicable Worksheets |
|:---:|:---|:---:|:---|:---:|
| **A** | `SL NO` | Number | Auto-incrementing sequential shipment ID | All |
| **B** | `TRSP NAME` | Text | Transporter / Fleet Agency Name | All |
| **C** | `DATE` | Date | Shipment Booking Date (`dd-mm-yyyy`) | All |
| **D** | `LR NO` | Text | Lorry Receipt Number (**Strictly Unique**) | All |
| **E** | `TRUCK NO` | Text | Vehicle Registration / HSRP Plate | All |
| **F** | `FROM` | Text | Origin Dispatch Station | All |
| **G** | `TO` | Text | Destination Unloading Station | All |
| **H** | `ACCOUNT NO` | Text | Transporter Bank Account Number | All |
| **I** | `IFSC CODE` | Text | Bank Branch IFSC Code | All |
| **J** | `PAYMENT MADE` | Text | Settlement Bank / Payment Mode | All |
| **K** | `FRIGHT` | Currency | Agreed Gross Freight Value | All |
| **L** | `DATE` | Date | Advance 1 Payment Date | TOBILLED, A-TO-PAY |
| **M** | `ToPayStatus` | Enum | Exactly `TOBILLED`, `A/TO-PAY`, or `F/TO-PAY` | All |
| **N** | `T/M` | Currency | Tapal / Mamul Brokerage Deduction | TOBILLED, A-TO-PAY, F-TO-PAY |
| **O** | `ADVANCE` | Currency | Advance Payment 1 | TOBILLED, A-TO-PAY |
| **P** | `DATE 2` | Date | Advance 2 Payment Date | TOBILLED |
| **Q** | `ADVANCE2` | Currency | Advance Payment 2 | TOBILLED |
| **R** | `DATE3` | Date | Advance 3 Payment Date | TOBILLED |
| **S** | `ADVANCE3` | Currency | Advance Payment 3 | TOBILLED |
| **T** | `POD RECD Date` | Date | Proof of Delivery Acknowledgement Date | All |
| **U** | `Cash on Delivery (COD) :A/Topay&Ftopay` | Currency | `=K - N - O - Q - S` (Adv To-Pay) or `=K` (Full To-Pay). Set to `'if Tobilled NA'` in TOBILLED. | A-TO-PAY, F-TO-PAY *(Hidden on TOBILLED)* |
| **V** | `Pending Amount: Tobilled` | Currency | `=K - N - O - Q - S`. Set to `'if A/Topay&Ftopay Na'` in A/F-ToPay. | TOBILLED *(Hidden on A-TO-PAY & F-TO-PAY)* |
| **W** | `Extra Amount` | Currency | Halting Charges, Detention, Extra Hamali | TOBILLED |
| **X** | `PM/PA Date` | Date | Balance Payment / Settlement Date | All |
| **Y** | `P/M` | Currency | Payment Mamul / Final Settlement Mamul | TOBILLED |
| **Z** | `Pending Amount` | Currency | Final Net Outstanding Balance payable to Transporter | All |
| **AA** | `POD Amount Status` | Enum | `'DONE'` (Green Badge) when settled/POD entered; otherwise `0` / `'PENDING'` | All |
| **AB** | `REMARKS / NOTE` | Text | Operational Notes, Unloading Instructions | All |

---

## 3. Mathematical Formula Engine & Calculation Rules

The system implements 3 distinct business statuses. Calculations are executed in `js/calculations.js` and replicated in `backend/Code.gs`:

### Mode 1: Full To-Pay (`F/TO-PAY`)
* **Core Business Meaning:** Unloading party pays full agreed freight directly to the truck upon delivery.
* **COD (Col U):** Equal to gross Freight (`Col K`). If custom COD entered, preserves user override.
* **Advances (Col O, Q, S):** Blocked / 0.
* **Pending ToBilled (Col V):** Non-applicable (`'if A/Topay&Ftopay Na'`).
* **Final Net Balance (Col Z):** `₹0` (Nil balance payable by broker).

### Mode 2: Advance To-Pay (`A/TO-PAY`)
* **Core Business Meaning:** Broker pays loading advance (Advance 1) less T/M mamul; destination party pays remaining balance upon unloading via Cash on Delivery (COD).
* **COD (Col U):** `= K - N - (O + Q + S) = Freight - TM - TotalAdvances`.
* **Pending ToBilled (Col V):** Non-applicable (`'if A/Topay&Ftopay Na'`).
* **Final Net Balance (Col Z):** `= Freight - TM - Adv1 - COD = ₹0` (Destination party settles balance).
* **Note:** If party does not pay COD at unloading, amount is transferred to transport ledger.

### Mode 3: Bill To Party (`TOBILLED`)
* **Core Business Meaning:** Freight is paid by broker to transporter in stages (loading advance, transit advances, and balance upon physical POD delivery).
* **COD (Col U):** Non-applicable (`'if Tobilled NA'`).
* **Pending ToBilled (Col V):** `= K - N - (O + Q + S) = Freight - TM - TotalAdvances`.
* **Final Net Balance (Col Z):** `= Pending ToBilled + Extra Amount - P/M = (V + W) - Y`.

### Column AA Automation (POD Settlement Status)
* When **POD Date** (Col T) or **Payment Date** (Col X) is entered:
  * Status automatically evaluates to `'DONE'`.
  * Displayed with a green `✅ DONE` badge in Spreadsheet View.
* When POD date is blank:
  * Status evaluates to `0` / `'PENDING'`, displayed with an amber `⏳ PENDING` badge and surfaced in the Missing POD Alert banner.

---

## 4. Physical Three-Worksheet Cloud Routing

### Worksheet Routing Architecture
Google Sheets disallows forward slash `/` in worksheet names. The system maps statuses to physical worksheets:

```javascript
var PHYSICAL_SHEET_CANDIDATES = {
  'TOBILLED': ['TOBILLED'],
  'A/TO-PAY': ['A-TO-PAY', 'A/TO-PAY'],
  'F/TO-PAY': ['F-TO-PAY', 'F/TO-PAY']
};
```

* `TOBILLED` shipments $\rightarrow$ saved to physical tab **`TOBILLED`**.
* `A/TO-PAY` shipments $\rightarrow$ saved to physical tab **`A-TO-PAY`**.
* `F/TO-PAY` shipments $\rightarrow$ saved to physical tab **`F-TO-PAY`**.
* `final` is preserved as a historical master backup; the live application queries **strictly the three physical sheets**.

### Column Display Optimization per Sheet
To eliminate visual clutter while preserving formula integrity:
* On **`TOBILLED`**: Column U (21, COD) is hidden.
* On **`A-TO-PAY`**: Column V (22, Pending ToBilled) is hidden.
* On **`F-TO-PAY`**: Column V (22, Pending ToBilled) is hidden.
* When switching configuration, `ensureHeaders()` calls `sheet.showColumns(1, 28)` first to unhide all columns before applying status-specific hiding.

### Atomic Status-Change Movement
When an existing trip's status is updated (e.g. from `TOBILLED` to `A/TO-PAY`):
1. The new row is written to target worksheet (`A-TO-PAY`).
2. The transaction flushes and verifies the written record by matching LR Number.
3. Only after verification succeeds, the row is deleted from the source worksheet (`TOBILLED`).
4. `LockService.getScriptLock()` prevents race conditions during status transfer.

### Global Deduplication Migration
The migration function `initializeAndMigrateAllWorksheets()`:
1. Scans all 3 destination worksheets first, building an in-memory index of existing LR numbers.
2. Reads each historical row from `final`.
3. If an LR already exists in the target sheet, checks for conflicting financial data and reconciles.
4. If an LR exists in the wrong sheet, moves the record to the correct sheet.
5. If new, appends to the target sheet.
6. Automatically removes blank default `Sheet1` created by Google Sheets.

---

## 5. User Interface & Amount Persistence

### Field Blocking Without Data Destruction
* Switching between `TOBILLED`, `A/TO-PAY`, and `F/TO-PAY` in the shipment modal updates visibility and disables non-applicable inputs (`input.disabled = true; input.classList.add('field-blocked');`).
* **Entered numbers are NOT cleared or overwritten.** If a user inputs Freight = ₹90,000, T/M = ₹200, Advance = ₹49,800 under `TOBILLED` and toggles to `A/TO-PAY`, all entered values remain stored in state.

### Leading Zero Normalization
* Modal numeric inputs use `handleNumberInput(el)` which strips unwanted leading zeros automatically (e.g. typing `0120` instantly becomes `120`).

### Clean Worksheet Navigation
* The spreadsheet view features clean tab navigation without redundant numbering:
  * `📑 Master Ledger (All)`
  * `📄 TOBILLED`
  * `💳 A/TO-PAY`
  * `🚚 F/TO-PAY`
* Clear Filters button (`AppModule.clearAllFilters()`) instantly restores default view.

---

## 6. Encoding & Cross-Platform Integrity

### 100% Pure 7-Bit ASCII Architecture
To permanently eliminate mojibake (`≡fÜć`, `ΓÇó`, `??`):
* **`index.html`**: Contains zero multi-byte characters; all emojis and currency symbols are encoded as standard HTML numeric entities (`&#128667;`, `&#128081;`, `&#128100;`, `&#128273;`, `&#8377;`).
* **`css/styles.css`**: Begins with `@charset "UTF-8";` and contains pure ASCII characters.
* **`js/*.js`**: All strings use JavaScript Unicode escape sequences (`\u20B9` for ₹, `\u2705` for ✅, `\u23F3` for ⏳, `\uD83D\uDE9B` for 🚛).
* **`backend/Code.gs`**: Formatted with pure ASCII characters.

---

## 7. Automated Test Suite & Verification Matrix

The codebase is validated by 5 automated PowerShell test suites comprising **117 comprehensive assertions**:

| Test Suite | File | Assertions | Focus Areas | Result |
|:---|:---|:---:|:---|:---:|
| **Comprehensive Audit** | `verify_enhancements.ps1` | **37** | 28-column schema, formulas, modal inputs, branding, SHA-256 security | **PASS** |
| **Accounting Rules** | `verify_calculations.ps1` | **20** | Section 20 test cases, COD settlement, NA advance parsing, duplicate LR | **PASS** |
| **Mode Blocking & UI** | `verify_mode_blocking.ps1` | **27** | Mode blocking, amount persistence, HSRP plate, mobile touch targets | **PASS** |
| **Backend & Schema** | `verify_backend_and_schema.ps1` | **16** | LockService, admin auth, cross-sheet duplicate checks, 28-col rowData | **PASS** |
| **Physical Worksheets** | `verify_pr2_worksheets.ps1` | **17** | 3-worksheet routing, safe migration, inter-sheet movement, Version 6 API | **PASS** |
| **TOTAL** | — | **117** | **End-to-End System Integrity** | **100% PASS** |

---

## 8. Live API Configuration

* **Active Google Apps Script Web App Endpoint:**  
  `https://script.google.com/macros/s/AKfycbxHwxcs9iEPhSqRbNmtiGpEAxKdGL7A50Bg_hn3DHQuQMu-dPhaLcxc1GXeKX8nrVmuIQ/exec`
* **Active Deployment ID:**  
  `AKfycbxHwxcs9iEPhSqRbNmtiGpEAxKdGL7A50Bg_hn3DHQuQMu-dPhaLcxc1GXeKX8nrVmuIQ`
* **Target Google Spreadsheet ID:**  
  `1pp9s62Oi41XW6N3cz_qxPTaG1JCjqK4iUqxxcIc3ZPA`
* **Default Database Version:** `vcurrent-workbook-v1`
