/**
 * dashboard.js - Executive Logistics Dashboard & Operational Alerts System
 * SR Brokerage Ledger \u2022 Transport Brokerage Ledger Pvt Ltd
 * Fleet Logistics & Financial Accounts Management
 * Developed by Shravan Kumar
 * Features:
 *  - 4 Primary KPI Cards across the top (Trips, Freight, Advances, Net Balance)
 *  - 2-Column Desktop Grid:
 *      - Left: Dedicated Operational Alerts Panel (Missing POD & Incomplete records)
 *      - Right: Financial Overview & Dynamic Monthly Analytics
 *  - Single unified action toolbar
 */

const DashboardModule = {
  render(trips) {
    const list = trips || DataManager.getAll();

    let totalFreight = 0;
    let totalAdvances = 0;
    let totalCod = 0;
    let totalBalance = 0;
    let totalFinalBalance = 0;

    const operationalAlerts = [];
    const monthlyStats = {};

    list.forEach(t => {
      const calc = CalculationEngine.calculate(t);
      totalFreight += calc.fright;
      totalAdvances += calc.totalAdvances;
      totalCod += calc.cod;
      totalBalance += calc.balc;
      totalFinalBalance += calc.finalBalc;

      // 1. Missing POD Alert (Red Warning)
      if (calc.isPodMissing) {
        operationalAlerts.push({
          type: 'missing_pod',
          level: 'danger',
          row: t.row,
          slNo: t.slNo || '',
          lrNo: t.lrNo || '\u2014',
          truckNo: t.truckNo || '\u2014',
          trspName: t.trspName || 'Unassigned Transporter',
          date: t.date || '\u2014',
          from: t.from || 'Origin',
          to: t.to || 'Destination',
          fright: calc.fright,
          message: 'Missing POD Receipt Date'
        });
      }
      // 2. Incomplete Trip Info Alert (Amber Warning)
      else if (!t.truckNo || !t.trspName || !t.from || !t.to) {
        operationalAlerts.push({
          type: 'incomplete_info',
          level: 'warning',
          row: t.row,
          slNo: t.slNo || '',
          lrNo: t.lrNo || '\u2014',
          truckNo: t.truckNo || 'Missing Plate',
          trspName: t.trspName || 'Missing Transporter',
          date: t.date || '\u2014',
          from: t.from || '\u2014',
          to: t.to || '\u2014',
          fright: calc.fright,
          message: 'Incomplete Shipment Details'
        });
      }

      // Group by Month dynamically
      const mKey = calc.monthKey;
      if (!monthlyStats[mKey]) {
        monthlyStats[mKey] = { count: 0, freight: 0, advances: 0, balance: 0 };
      }
      monthlyStats[mKey].count += 1;
      monthlyStats[mKey].freight += calc.fright;
      monthlyStats[mKey].advances += calc.totalAdvances;
      monthlyStats[mKey].balance += calc.finalBalc;
    });

    // 1. Update 4 Top KPI Metric Cards
    const elTrips = document.getElementById('dashTotalTrips');
    const elFreight = document.getElementById('dashTotalFreight');
    const elAdvances = document.getElementById('dashTotalAdvances');
    const elFinalBalc = document.getElementById('dashNetBalance');

    if (elTrips) elTrips.innerText = list.length;
    if (elFreight) elFreight.innerText = CalculationEngine.formatCurrency(totalFreight);
    if (elAdvances) elAdvances.innerText = CalculationEngine.formatCurrency(totalAdvances);
    if (elFinalBalc) elFinalBalc.innerText = CalculationEngine.formatCurrency(totalFinalBalance);

    const drawerStatus = document.getElementById('drawerStatusText');
    if (drawerStatus) drawerStatus.innerText = `Online \u2022 ${list.length} Active Trips`;

    // 2. Render Dedicated Operational Alerts Panel (Left Side of Main Grid)
    const alertHeadingEl = document.getElementById('alertPanelHeading');
    const alertCountEl = document.getElementById('alertPanelBadge');
    const alertListEl = document.getElementById('alertListContainer');

    const pendingCount = operationalAlerts.length;
    if (alertHeadingEl) alertHeadingEl.innerText = `POD Status & Missing Alerts`;
    if (alertCountEl) alertCountEl.innerText = `${pendingCount} Pending`;

    if (alertListEl) {
      if (operationalAlerts.length === 0) {
        alertListEl.innerHTML = `
          <div class="alert-empty-state">
            <span style="font-size: 1.5rem;">\uD83C\uDF89</span>
            <div>
              <strong style="color: #15803d; font-size: 0.9rem;">All caught up \u2014 no pending POD records!</strong>
              <div style="font-size: 0.78rem; color: #475569; margin-top: 2px;">
                All shipments have verified Proof of Delivery receipt dates confirmed.
              </div>
            </div>
          </div>
        `;
      } else {
        alertListEl.innerHTML = operationalAlerts.map(a => {
          const isDanger = (a.level === 'danger');
          const btnClass = isDanger ? 'alert-btn-enter-pod' : 'alert-btn-fix-info';
          const actionText = isDanger ? 'Enter POD &rarr;' : 'Edit &rarr;';

          return `
            <div class="operational-alert-card ${isDanger ? 'alert-border-danger' : 'alert-border-warning'}" 
                 onclick="TableModule.openEditModal(${a.row}, true)" 
                 title="Click to resolve alert for LR ${a.lrNo}">
              <div class="alert-card-content">
                <div class="alert-card-topbar">
                  <span class="alert-lr-tag">LR: ${a.lrNo}</span>
                  <span class="alert-truck-tag">${a.truckNo}</span>
                  <span class="alert-route-line">${a.from} &rarr; ${a.to}</span>
                </div>
                <div class="alert-card-subbar">
                  <span class="alert-trsp">${a.trspName}</span>
                  <span class="alert-date">\uD83C\uDFE6 ${a.date}</span>
                  <span class="alert-val">${CalculationEngine.formatCurrency(a.fright)}</span>
                </div>
              </div>
              <button class="${btnClass}" onclick="event.stopPropagation(); TableModule.openEditModal(${a.row}, true);">${actionText}</button>
            </div>
          `;
        }).join('');
      }
    }

    // 3. Render Financial Overview & Monthly Analytics (Right Side of Main Grid)
    const monthlyContainer = document.getElementById('monthlyBreakdownContainer');
    const monthSelect = document.getElementById('filterMonthSelect');

    const monthKeys = Object.keys(monthlyStats).filter(k => k !== 'Unknown' && k !== 'Other').sort((a, b) => {
      const order = { 'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6, 'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12 };
      const [mA, yA] = a.split(' '), [mB, yB] = b.split(' ');
      if (yA !== yB) return (Number(yA) || 0) - (Number(yB) || 0);
      return (order[mA] || 0) - (order[mB] || 0);
    });

    if (monthSelect) {
      const curVal = monthSelect.value || 'all';
      monthSelect.innerHTML = `<option value="all">All Months</option>` + monthKeys.map(m =>
        `<option value="${m}" ${curVal === m ? 'selected' : ''}>${m}</option>`
      ).join('');
    }

    if (monthlyContainer) {
      monthlyContainer.innerHTML = monthKeys.map(mKey => {
        const stat = monthlyStats[mKey];
        const isSelected = (AppModule.selectedMonth === mKey);
        return `
          <div class="month-stat-card ${isSelected ? 'active-month' : ''}" 
               onclick="AppModule.filterByMonth('${mKey}')" 
               title="Click to filter ledger by ${mKey}">
            <div class="month-card-header">
              <span class="month-card-title">\uD83D\uDCC5 ${mKey}</span>
              <span class="month-card-badge">${stat.count} Trips</span>
            </div>
            <div class="month-stat-row">
              <span>Gross Freight:</span>
              <span class="month-val-fright">${CalculationEngine.formatCurrency(stat.freight)}</span>
            </div>
            <div class="month-stat-row">
              <span>Advances Paid:</span>
              <span class="month-val-adv">${CalculationEngine.formatCurrency(stat.advances)}</span>
            </div>
            <div class="month-stat-row" style="border-top: 1px dashed #cbd5e1; padding-top: 3px; margin-top: 3px;">
              <span style="font-weight: 700;">Net Balance:</span>
              <span class="month-val-balc">${CalculationEngine.formatCurrency(stat.balance)}</span>
            </div>
            <div style="margin-top: 0.5rem; text-align: right; font-size: 0.78rem; font-weight: 800; color: #1e40af;">
              Filter &rarr;
            </div>
          </div>
        `;
      }).join('');
    }
  }
};
