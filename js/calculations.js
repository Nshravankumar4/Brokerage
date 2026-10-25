/**
 * calculations.js - Dynamic Mathematical Formula Engine & Aggregates
 * SR Brokerage Ledger • Transport Brokerage Ledger Pvt Ltd
 * Authoritative Workbook: BROKER DETAILS ADVANCE BALC DETAILS.xlsx
 * Master 28-Column Formula Architecture (Columns A through AB)
 * 
 * Formula Rules Grounded in Master Excel:
 *   1. Column U (COD: A/Topay & F/Topay): =K - N - O - Q - S (Freight − TM − Advances)
 *   2. Column V (Pending Amount: Tobilled): =K - N - O - Q - S (Freight − TM − Advances)
 *   3. Column W (Extra Amount): Halting / Extra Hamali addition
 *   4. Column Y (P/M): Payment Mamul deduction
 *   5. Column Z (Pending Amount / Final Net Balance):
 *        - TOBILLED: =V + W - Y  [(Freight − TM − Advances) + Extra Amount − P/M]
 *        - A/TO-PAY: =K - N - O - U = 0 (Destination party pays COD)
 *        - F/TO-PAY: =0 (Destination party pays full freight via COD)
 *   6. Column AA (POD Amount Status): =IF(M="TOBILLED", V + W - Y - Z, 0)
 */

const CalculationEngine = {
  calculate(trip) {
    const fright = Number(trip.fright) || 0;
    const tm = Number(trip.tm) || 0;
    const adv1 = Number(trip.advance1) || 0;
    const adv2 = Number(trip.advance2) || 0;
    const adv3 = Number(trip.advance3) || 0;
    const totalAdvances = adv1 + adv2 + adv3;
    const extraAmount = Number(trip.extraAmount) || 0;
    const pm = (trip.pm !== undefined && trip.pm !== null && trip.pm !== '') ? Number(trip.pm) : (Number(trip.pmFinal) || 0);
    const topay = String(trip.topay || '').trim().toUpperCase();

    let cod = 0;
    let pendingTobilled = 0;
    let balc = 0;
    let finalBalc = 0;
    let podAmountStatus = 0;
    let ruleText = '';

    // Condition 1: F/TO-PAY (Full ToPay)
    if (topay.startsWith('F') || topay === 'FULL' || topay === 'FULL TO-BILLED' || topay === 'FULL TO-PAY') {
      // Master Formula: U = K - N - O - Q - S = Freight
      cod = (trip.cod !== undefined && trip.cod !== null && trip.cod !== '' && Number(trip.cod) > 0)
        ? Number(trip.cod)
        : Math.max(0, fright - tm - totalAdvances);
      pendingTobilled = 0;
      balc = 0;
      finalBalc = 0;
      podAmountStatus = 0;
      ruleText = 'F/TO-PAY: COD = Full Freight (Col U); Pending Amount = 0';
    }
    // Condition 2: A/TO-PAY (Advance ToPay)
    else if (topay.startsWith('A') || topay === 'ADV' || topay === 'ADV TO-BILLED' || topay === 'ADV TO-PAY') {
      // Master Formula: U = K - N - O - Q - S (Consignee pays balance as COD)
      const autoCod = Math.max(0, fright - tm - totalAdvances);
      cod = (trip.cod !== undefined && trip.cod !== null && trip.cod !== '' && Number(trip.cod) > 0)
        ? Number(trip.cod)
        : autoCod;
      pendingTobilled = 0;
      // Formula Z: K - N - O - U (Evaluates to 0 when COD collected)
      finalBalc = Math.max(0, fright - tm - adv1 - cod);
      balc = finalBalc;
      podAmountStatus = 0;
      ruleText = 'A/TO-PAY: COD = Freight − TM − Adv (Col U); Pending Amount = 0';
    }
    // Condition 3: TOBILLED (To-Billed Master Formula)
    else {
      cod = 0;
      // Master Formula V: K - N - O - Q - S (Freight − TM − Advances)
      pendingTobilled = fright - tm - totalAdvances;
      balc = pendingTobilled;
      // Master Formula Z: V + W - Y (Pending Tobilled + Extra Amount − PM)
      finalBalc = pendingTobilled + extraAmount - pm;
      // Master Formula AA: V + W - Y - Z = 0 (when settled)
      podAmountStatus = pendingTobilled + extraAmount - pm - finalBalc;
      ruleText = 'TOBILLED: Pending = (Freight − TM − Advances) + Extra − PM';
    }

    if (isNaN(balc)) balc = 0;
    if (isNaN(finalBalc)) finalBalc = 0;

    const totalMamul = tm + pm;

    // Check if POD date is missing
    const rawPod = String(trip.pod || '').trim();
    const isPodMissing = (!rawPod || rawPod.toLowerCase().includes('pending') || rawPod.toLowerCase().includes('if date') || rawPod.toLowerCase().includes('empty'));

    // Extract trip month label (e.g., '08-2026' -> 'Aug 2026')
    const monthKey = this.extractMonthKey(trip.date);

    return {
      fright,
      tm,
      adv1,
      adv2,
      adv3,
      totalAdvances,
      cod,
      pendingTobilled,
      extraAmount,
      pm,
      totalMamul,
      balc,
      finalBalc,
      podAmountStatus,
      ruleText,
      isPodMissing,
      monthKey
    };
  },

  extractMonthKey(dateStr) {
    if (!dateStr) return 'Unknown';
    // Accepts DD-MM-YYYY or YYYY-MM-DD
    const parts = String(dateStr).split(/[-/]/);
    if (parts.length >= 3) {
      let mm = parts[1];
      let yyyy = parts[2];
      if (parts[0].length === 4) { // YYYY-MM-DD
        yyyy = parts[0];
        mm = parts[1];
      }
      const monthNames = {
        '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
        '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug',
        '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec'
      };
      const mName = monthNames[mm.padStart(2, '0')] || mm;
      return `${mName} ${yyyy}`;
    }
    return 'Other';
  },

  formatCurrency(num, showSymbol = true) {
    const val = Number(num) || 0;
    const formatted = val.toLocaleString('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0
    });
    return showSymbol ? '₹' + formatted : formatted;
  }
};
