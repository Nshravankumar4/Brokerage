# Excel Formula & Workbook Analysis — SR Brokerage Ledger
### Master Workbook: `BROKER DETAILS ADVANCE BALC DETAILS.xlsx` (Sheet: `final`)

---

## 1. Overview & Business Context

This document details the mathematical logic, column architecture, and conditional formulas in the authoritative workbook:
* **File Name:** `BROKER DETAILS ADVANCE BALC DETAILS.xlsx`
* **Target Sheet:** `final`
* **Enterprise Ecosystem:** Transport Brokerage Ledger Pvt Ltd (Developed by Shravan Kumar)

The workbook tracks 27 columns from **Column A** (`SL NO`) to **Column AA** (`NOTE`), calculating advances, mamul charges, Cash-on-Delivery (COD) collections, and net balances based on the ToPay classification in Column M.

---

## 2. Master Formulas

### Formula 1: Column W (`BALC` — Intermediate Balance)
Paste this formula in cell **`W2`** and drag down through all active rows:

```excel
=IF(LEFT(UPPER(TRIM(M2)),1)="F", 0, IF(LEFT(UPPER(TRIM(M2)),1)="A", K2-N2-O2-T2, K2-(O2+Q2+S2+U2+T2)))
```

#### Meaning & Conditions:
1. **Full ToPay (`F/TO-PAY`):**
   * If Column M starts with `F` (case-insensitive, trimmed), the formula returns `0`.
   * **Accounting Rationale:** The destination party pays 100% of the freight on delivery; no dispatch balance is payable by the broker.
2. **Advance ToPay (`A/TO-PAY`):**
   * If Column M starts with `A`, the formula calculates:
     $$\text{Freight (K)} - \text{Transit Mamul (N)} - \text{Advance 1 (O)} - \text{Topay COD (T)}$$
   * **Accounting Rationale:** Deducts the broker's initial advance and transit mamul, while factoring in the COD collected at destination.
3. **Standard Shipment (Blank / Standard / TO-PAY):**
   * In all other cases, the formula calculates:
     $$\text{Freight (K)} - (\text{Advance 1 (O)} + \text{Advance 2 (Q)} + \text{Advance 3 (S)} + \text{Loading Mamul (U)} + \text{Topay COD (T)})$$
   * **Accounting Rationale:** Deducts all paid advance installments, loading point mamul, and COD deductions from agreed freight.

---

### Formula 2: Column Y (`FINAL BALC` — Net Balance Payable)
Paste this formula in cell **`Y2`** and drag down through all active rows:

```excel
=W2-X2
```

#### Meaning:
* Takes intermediate balance in Column W and subtracts secondary unloading point Mamul deduction in Column X.

---

### Formula 3: Column T (`Topay(COD)`) — Consignee Collection Amount
If automatic COD calculation is required for `A/TO-PAY` shipments:

```excel
=IF(LEFT(UPPER(TRIM(M2)),1)="A", K2-N2-O2-Q2-S2, 0)
```

---

## 3. Case Studies & Verification Against Master Data

### Trip 18 (Row 19):
* **Transporter:** MISHRA PIWARAN | **Date:** 19-10-2026
* **Freight ($K$):** ₹50,000 | **Topay ($M$):** `A/TO-PAY`
* **Transit Mamul ($N$):** ₹200 | **Advance 1 ($O$):** ₹19,800
* **Topay COD ($T$):** ₹30,000
* **Calculation:**
  $$\text{BALC} = 50,000 - 200 - 19,800 - 30,000 = \text{₹}0$$
  *(Consignee settles the remaining ₹30,000 at destination).*

### Trip 19 (Row 20):
* **Transporter:** MISHRA PIWARAN | **Date:** 20-10-2026
* **Freight ($K$):** ₹60,000 | **Topay ($M$):** `A/TO-PAY`
* **Transit Mamul ($N$):** ₹300 | **Advance 1 ($O$):** ₹29,700
* **Topay COD ($T$):** ₹30,000
* **Calculation:**
  $$\text{BALC} = 60,000 - 300 - 29,700 - 30,000 = \text{₹}0$$

---

## 4. Proof of Delivery (`POD RECD` — Column Z)
In the source sheet `final`, unconfirmed delivery dates contain the literal marker:
`if date If Empty Show the RedColor`

There are **exactly 10 trips** with missing delivery dates (Rows 7, 9, 13, 14, 15, 16, 17, 18, 19, 20).
In the web application, only these 10 cells are styled with the targeted red alert badge `⚠️ Missing`, leaving all other rows clean.

---

## 5. Enterprise Footprint & Attribution
* **System Brand:** SR Brokerage Ledger
* **Parent Organization:** Transport Brokerage Ledger Pvt Ltd
* **Lead Architect & Developer:** Shravan Kumar
* **Year:** 2026
