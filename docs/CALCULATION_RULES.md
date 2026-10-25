# SR Brokerage Ledger — Authoritative Accounting Calculation Rules

**Transport Brokerage Ledger Pvt Ltd**  
Authoritative Workbook: `Final Sheet Broker.xlsx` (Sheet: `final`, Columns A:AB)  
Developer: **Shravan Kumar**

---

## 1. Allowed Transport Statuses

The ledger enforces **exactly three** valid values for `ToPayStatus` (Column M):

1. **`A/TO-PAY`** (Advance To-Pay / Adv To-Billed)
2. **`F/TO-PAY`** (Full To-Pay / Full To-Billed)
3. **`TOBILLED`** (To-Billed Master Account)

> **Note on "Full To-Pay" in Handwritten Notes**: Full To-Pay is an accounting settlement scenario where the entire freight is collected at destination via COD. It is formally represented in system dropdowns, database schemas, and Google Sheets as **`F/TO-PAY`**. No fourth status is permitted.

---

## 2. Master 28-Column Layout (A to AB)

| Col | Heading | Data Type | Entry Mode | Accounting Role |
| :---: | :--- | :--- | :--- | :--- |
| **A** | `SL NO` | Text / Num | Auto / Read-only | Sequential shipment serial number |
| **B** | `TRSP NAME` | Text | Manual Entry | Fleet Transporter / Vendor name |
| **C** | `DATE` | Date | Manual Entry | Shipment dispatch / trip booking date |
| **D** | `LR NO` | Text | Manual Entry | **Strictly Unique** Lorry Receipt Number |
| **E** | `TRUCK NO` | Text | Manual Entry | Vehicle registration number |
| **F** | `FROM` | Text | Manual Entry | Origin loading location (Default: `MEDCHAL`) |
| **G** | `TO` | Text | Manual Entry | Destination unloading city |
| **H** | `ACCOUNT NO` | Text | Manual Entry | Transporter bank account (stored as text) |
| **I** | `IFSC CODE` | Text | Manual Entry | Bank IFSC code (capitalized) |
| **J** | `PAYMENT MADE` | Text | Manual Entry | Bank / Payment channel (e.g. `SBI BANK`) |
| **K** | `FRIGHT` | Currency | Manual Entry | Gross freight agreed for shipment |
| **L** | `DATE` | Date | Manual Entry | Payment / Advance 1 transaction date |
| **M** | `ToPayStatus` | Dropdown | Form Button / Select | Mode: `A/TO-PAY`, `F/TO-PAY`, `TOBILLED` |
| **N** | `T/M` | Currency | Manual Entry | Tapal Mamul / deduction charges |
| **O** | `ADVANCE` | Currency | Manual Entry | Primary loading advance paid to driver |
| **P** | `DATE 2` | Date | Manual Entry | Advance 2 transaction date |
| **Q** | `ADVANCE2` | Currency | Manual Entry | En-route advance payment 2 |
| **R** | `DATE3` | Date | Manual Entry | Advance 3 transaction date |
| **S** | `ADVANCE3` | Currency | Manual Entry | En-route advance payment 3 |
| **T** | `POD RECD Date` | Date | Manual Entry | Date physical Proof of Delivery received |
| **U** | `Cash on Delivery (COD) :A/Topay&Ftopay` | Currency | **Calculated / Auto** | Balance collected at destination unloading |
| **V** | `Pending Amount: Tobilled` | Currency | **Calculated** | Outstanding freight prior to halts & mamuls |
| **W** | `Extra Amount` | Currency | Manual Entry | Halting charges / Extra Hamali paid |
| **X** | `PM/PA Date` | Date | Manual Entry | Payment Mamul settlement date |
| **Y** | `P/M` | Currency | Manual Entry | Payment Mamul deduction on settlement |
| **Z** | `Pending Amount` | Currency | **Calculated** | Final net outstanding balance payable |
| **AA**| `POD Amount Status` | Numeric | **Calculated** | Settlement status index (= 0 upon settlement) |
| **AB**| `REMARKS / NOTE` | Text | Manual Entry | Operational notes, e.g. "Halted", transfers |

---

## 3. Mathematical Formula Definitions

### Scenario 1: `TOBILLED`
The transporter is paid directly by the broker after delivery and submission of the physical POD.

1. **Initial Pending (Col V)**:
   $$\text{Col V} = K - N - (O + Q + S)$$
   $$\text{Pending: ToBilled} = \text{Freight} - \text{T/M} - \text{Total Advances}$$

2. **Final Pending Balance (Col Z)**:
   $$\text{Col Z} = V + W - Y$$
   $$\text{Final Pending} = \text{Pending: ToBilled} + \text{Extra Amount (Halting)} - \text{Payment Mamul (P/M)}$$

3. **COD (Col U)**:
   $$\text{Col U} = 0 \quad (\text{Not applicable for TOBILLED})$$

#### Reconciliation with Verified Data:
- **Sample Record 1**:
  - Freight ($K$) = ₹60,000
  - T/M ($N$) = ₹300
  - Advance ($O$) = ₹49,700 ($Q=0, S=0$)
  - Initial Pending ($V$) = $60,000 - 300 - 49,700 = \text{₹10,000}$
  - Extra Amount ($W$) = ₹0
  - P/M ($Y$) = ₹200
  - Final Pending ($Z$) = $10,000 + 0 - 200 = \text{₹9,800}$ (Matches Excel & note)
- **Sample Record 2 (Halted Shipment)**:
  - Freight ($K$) = ₹60,000
  - T/M ($N$) = ₹300
  - Advance ($O$) = ₹49,700
  - Initial Pending ($V$) = $60,000 - 300 - 49,700 = \text{₹10,000}$
  - Extra Amount ($W$) = ₹5,000 (*Halting charge*)
  - P/M ($Y$) = ₹300
  - Final Pending ($Z$) = $10,000 + 5,000 - 300 = \text{₹14,700}$ (Matches Excel & note)

---

### Scenario 2: `A/TO-PAY` (Advance To-Pay)
An advance is paid to the truck at loading; the remaining freight is collected from the consignee as COD at destination.

1. **Cash on Delivery (Col U)**:
   $$\text{Col U} = K - N - (O + Q + S)$$
   $$\text{COD} = \text{Freight} - \text{T/M} - \text{Advance 1}$$

2. **Pending Amount (Col Z)**:
   $$\text{Col Z} = K - N - O - U = 0$$
   *When COD is collected at destination, outstanding broker balance is ₹0.*

3. **Pending: ToBilled (Col V)**:
   $$\text{Col V} = 0 \quad (\text{Not applicable for A/TO-PAY})$$

#### Reconciliation with Verified Data:
- **Sample Record 4**:
  - Freight ($K$) = ₹90,000
  - T/M ($N$) = ₹200
  - Advance ($O$) = ₹49,800
  - Auto COD ($U$) = $90,000 - 200 - 49,800 = \text{₹40,000}$
  - Outstanding ($Z$) = $90,000 - 200 - 49,800 - 40,000 = \text{₹0}$
- **Handwritten Note Note**:
  - Freight = ₹80,000
  - Adv = ₹40,000
  - Bal @ unloading point = ₹40,000
  - Note: *"Party Not Paid Trsf to Transport A/c"* — If the destination party fails to pay COD, the remaining balance is transferred to the transport ledger account and recorded in remarks.

---

### Scenario 3: `F/TO-PAY` (Full To-Pay)
No advance is paid at loading. The entire freight is collected as COD from the consignee upon delivery.

1. **Cash on Delivery (Col U)**:
   $$\text{Col U} = K \quad (\text{Full Freight})$$

2. **Pending Amount (Col Z)**:
   $$\text{Col Z} = 0 \quad (\text{Fully settled by COD collection})$$

3. **Pending: ToBilled (Col V)**:
   $$\text{Col V} = 0 \quad (\text{Not applicable for F/TO-PAY})$$

#### Reconciliation with Verified Data:
- **Sample Record 3**:
  - Freight ($K$) = ₹42,000
  - Advances = ₹0, T/M = ₹0
  - COD ($U$) = ₹42,000
  - Outstanding ($Z$) = ₹0
  - Note: *"F/TO-PAY Shipment"*
- **Handwritten Note**:
  - Freight = ₹90,000
  - Unloading COD = ₹90,000
  - Remaining Balance = *Nil* (₹0)

---

## 4. Special Handling: Blanks, NA, and Repeated Deductions

1. **Safe Numeric Conversion**:
   - Blank strings `""`, `null`, `undefined`, and text tokens like `"NA"`, `"na"`, `"N/A"` are converted to `0` for mathematical operations.
   - They never cause `NaN` or `#VALUE!` errors.
2. **Idempotence & No Double Deductions**:
   - `CalculationEngine.calculate(trip)` is a pure, idempotent function.
   - Reopening an existing record, modifying unrelated fields, or clicking save multiple times reads original base values ($K, N, O, W, Y$) and evaluates the equation once. Payments are never subtracted from an already-reduced balance.
3. **Extra Amount Isolation**:
   - Extra Amount ($W$) is an independent operational addition. It is never merged into freight ($K$) or subtracted as an advance.
