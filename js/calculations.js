/**
 * calculations.js - Dynamic Mathematical Formula Engine & Aggregates
 * SR Brokerage Ledger • Transport Brokerage Ledger Pvt Ltd
 * Executes the exact Excel logic based on ToPayStatus (Column M)
 * Supported statuses: A/TO-PAY, F/TO-PAY, TOBILLED
 */

const CalculationEngine = {
  /**
   * Recalculates BALC (W) and FINAL BALC (Y) dynamically based on ToPayStatus (M)
   * Formula 1 (Column W): =IF(LEFT(UPPER(TRIM(M2)),1)="F", 0, IF(LEFT(UPPER(TRIM(M2)),1)="A", K2-N2-O2-T2, K2-(O2+Q2+S2+U2+T2)))
   * Formula 2 (Column Y): =W2-X2
   * Options:
   *   1. A/TO-PAY -> Freight − TM − Adv1 − COD
   *   2. F/TO-PAY -> Balance = 0 (Destination party pays full freight)
   *   3. TOBILLED -> Freight − (Advances + PM + COD)
   */
  calculate(trip) {
    const fright = Number(trip.fright) || 0;
    const tm = Number(trip.tm) || 0;
    const adv1 = Number(trip.advance1) || 0;
    const adv2 = Number(trip.advance2) || 0;
    const adv3 = Number(trip.advance3) || 0;
    const cod = Number(trip.cod) || 0;
    const pm = Number(trip.pm) || 0;
    const pmFinal = Number(trip.pmFinal) || 0;
    const topay = String(trip.topay || '').trim().toUpperCase();

    let balc = 0;
    let ruleText = '';

    // Condition 1: F/TO-PAY (Starts with 'F')
    if (topay.startsWith('F') || topay === 'FULL' || topay === 'FULL TO-BILLED' || topay === 'FULL TO-PAY') {
      balc = 0;
      ruleText = 'F/TO-PAY: Balance = 0 (Destination party pays in full)';
    }
    // Condition 2: A/TO-PAY (Starts with 'A')
    else if (topay.startsWith('A') || topay === 'ADV' || topay === 'ADV TO-BILLED' || topay === 'ADV TO-PAY') {
      balc = fright - tm - adv1 - cod;
      ruleText = 'A/TO-PAY: Freight − TM − Adv1 − COD';
    }
    // Condition 3: TOBILLED (Starts with 'T' or standard default)
    else {
      balc = fright - (adv1 + adv2 + adv3 + pm + cod);
      ruleText = 'TOBILLED: Freight − (Advances + PM + COD)';
    }

    if (isNaN(balc)) balc = 0;

    // Final Balance: BALC - Secondary PM (Column Y = W - X)
    let finalBalc = balc - pmFinal;
    if (isNaN(finalBalc)) finalBalc = 0;

    const totalAdvances = adv1 + adv2 + adv3;
    const totalMamul = tm + pm + pmFinal;

    // Check if POD date is missing
    const rawPod = String(trip.pod || '').trim();
    const isPodMissing = (!rawPod || rawPod.toLowerCase().includes('if date') || rawPod.toLowerCase().includes('empty'));

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
      pm,
      pmFinal,
      totalMamul,
      balc,
      finalBalc,
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
