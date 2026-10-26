/**
 * table.js - Spreadsheet Grid & Enterprise Trip Editor Renderer
 * SR Brokerage Ledger • Transport Brokerage Ledger Pvt Ltd
 * Fleet Logistics & Financial Accounts Management
 * Authoritative 28-Column Architecture (Columns A through AB)
 * Developed by Shravan Kumar
 */

const TableModule = {
  // ================= 3-SHEET VIEW CONTROLLER =================
  currentExcelSheet: 'all', // 'all', 'TOBILLED', 'A/TO-PAY', 'F/TO-PAY'

  switchExcelSheet(sheetType, element) {
    this.currentExcelSheet = sheetType;
    document.querySelectorAll('.excel-sheet-tab-btn').forEach(btn => btn.classList.remove('active'));
    if (element) {
      element.classList.add('active');
    }

    const pill = document.getElementById('excelSheetInfoPill');
    if (pill) {
      if (sheetType === 'TOBILLED') {
        pill.innerHTML = '<span>📄 Sheet 1: Showing TOBILLED trips (Freight - TM - Advances + Extra - PM)</span>';
      } else if (sheetType === 'A/TO-PAY') {
        pill.innerHTML = '<span>💳 Sheet 2: Showing A/TO-PAY trips (COD = Freight - TM - Advance 1)</span>';
      } else if (sheetType === 'F/TO-PAY') {
        pill.innerHTML = '<span>🚛 Sheet 3: Showing F/TO-PAY trips (COD = Full Freight)</span>';
      } else {
        pill.innerHTML = '<span>📑 Master Ledger: Showing all 28-column master records</span>';
      }
    }

    this.renderExcelView();
  },

  // ================= DYNAMIC FORM MODE CONTROLLER =================
  selectToPayStatus(status) {
    const topaySelect = document.getElementById('m_topay');
    if (topaySelect) {
      topaySelect.value = status;
    }
    const codInput = document.getElementById('m_cod');
    if (codInput) {
      codInput.dataset.autoFilled = 'true';
    }
    this.updateFormFieldsVisibility(status);
    this.liveCalcModal();
  },

  syncToPayFromSelect() {
    const topaySelect = document.getElementById('m_topay');
    const val = topaySelect ? topaySelect.value : 'TOBILLED';
    this.updateFormFieldsVisibility(val);
    this.liveCalcModal();
  },

  updateFormFieldsVisibility(status) {
    const s = String(status || 'TOBILLED').trim().toUpperCase();

    // Update active pill button
    const pillToBilled = document.getElementById('pill_tobilled');
    const pillAToPay = document.getElementById('pill_atopay');
    const pillFToPay = document.getElementById('pill_ftopay');
    const badge = document.getElementById('m_status_badge');

    if (pillToBilled) pillToBilled.classList.toggle('active', s === 'TOBILLED');
    if (pillAToPay) pillAToPay.classList.toggle('active', s === 'A/TO-PAY');
    if (pillFToPay) pillFToPay.classList.toggle('active', s === 'F/TO-PAY');

    if (badge) {
      if (s === 'F/TO-PAY') {
        badge.innerText = '🚚 F/TO-PAY Mode (Full To-Pay)';
        badge.style.background = '#fef3c7';
        badge.style.color = '#92400e';
      } else if (s === 'A/TO-PAY') {
        badge.innerText = '💳 A/TO-PAY Mode (Adv To-Pay)';
        badge.style.background = '#d1fae5';
        badge.style.color = '#065f46';
      } else {
        badge.innerText = '📋 TOBILLED Mode';
        badge.style.background = '#dbeafe';
        badge.style.color = '#1e40af';
      }
    }

    // Helper: Enable & show active fields, strictly block, disable & clear non-applicable fields
    const setFieldState = (containerId, inputId, isVisible, isNumeric = true) => {
      const container = document.getElementById(containerId);
      const input = document.getElementById(inputId);
      if (container) {
        container.style.display = isVisible ? '' : 'none';
      }
      if (input) {
        input.disabled = !isVisible;
        if (!isVisible) {
          input.value = isNumeric ? 0 : '';
          input.classList.add('field-blocked');
        } else {
          input.classList.remove('field-blocked');
        }
      }
    };

    if (s === 'F/TO-PAY') {
      // Full To-Pay: Only Freight & COD apply. All advances, T/M, Extra, P/M are strictly blocked & zeroed.
      setFieldState('field_fright', 'm_fright', true, true);
      setFieldState('field_tm', 'm_tm', false, true);
      setFieldState('field_advance1', 'm_advance1', false, true);
      setFieldState('field_date1', 'm_date1', false, false);
      setFieldState('field_advance2', 'm_advance2', false, true);
      setFieldState('field_date2', 'm_date2', false, false);
      setFieldState('field_advance3', 'm_advance3', false, true);
      setFieldState('field_date3', 'm_date3', false, false);
      setFieldState('field_cod', 'm_cod', true, true);
      setFieldState('field_extraAmount', 'm_extraAmount', false, true);
      setFieldState('field_payDate', 'm_payDate', false, false);
      setFieldState('field_pm', 'm_pm', false, true);
    } else if (s === 'A/TO-PAY') {
      // Advance To-Pay: Freight, T/M, Advance 1 & Date, COD. Advances 2-3, Extra, P/M are strictly blocked & zeroed.
      setFieldState('field_fright', 'm_fright', true, true);
      setFieldState('field_tm', 'm_tm', true, true);
      setFieldState('field_advance1', 'm_advance1', true, true);
      setFieldState('field_date1', 'm_date1', true, false);
      setFieldState('field_advance2', 'm_advance2', false, true);
      setFieldState('field_date2', 'm_date2', false, false);
      setFieldState('field_advance3', 'm_advance3', false, true);
      setFieldState('field_date3', 'm_date3', false, false);
      setFieldState('field_cod', 'm_cod', true, true);
      setFieldState('field_extraAmount', 'm_extraAmount', false, true);
      setFieldState('field_payDate', 'm_payDate', false, false);
      setFieldState('field_pm', 'm_pm', false, true);
    } else {
      // TOBILLED: Freight, T/M, Advances 1-3 & Dates, Extra Amount, PM/PA Date, P/M Mamul. COD is strictly blocked & zeroed.
      setFieldState('field_fright', 'm_fright', true, true);
      setFieldState('field_tm', 'm_tm', true, true);
      setFieldState('field_advance1', 'm_advance1', true, true);
      setFieldState('field_date1', 'm_date1', true, false);
      setFieldState('field_advance2', 'm_advance2', true, true);
      setFieldState('field_date2', 'm_date2', true, false);
      setFieldState('field_advance3', 'm_advance3', true, true);
      setFieldState('field_date3', 'm_date3', true, false);
      setFieldState('field_cod', 'm_cod', false, true);
      setFieldState('field_extraAmount', 'm_extraAmount', true, true);
      setFieldState('field_payDate', 'm_payDate', true, false);
      setFieldState('field_pm', 'm_pm', true, true);
    }
  },
  activeTrips: [],
  currentZoom: 100,

  setZoom(percent) {
    this.currentZoom = percent;
    const table = document.querySelector('.excel-grid');
    if (table) {
      if ('zoom' in table.style) {
        table.style.zoom = (percent / 100);
      } else {
        table.style.transform = `scale(${percent / 100})`;
        table.style.transformOrigin = 'top left';
      }
    }
    ['btnZoom80', 'btnZoom90', 'btnZoom100', 'btnZoom115'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
      }
    });
    const activeBtn = document.getElementById(`btnZoom${percent}`);
    if (activeBtn) {
      activeBtn.classList.remove('btn-secondary');
      activeBtn.classList.add('btn-primary');
    }
  },

  setTrips(list) {
    this.activeTrips = list || [];
    this.renderExcelView();
    this.renderTripEditView();
  },

  // ================= 1:1 CLEAN EXCEL SPREADSHEET VIEW (28 COLUMNS A to AB) =================
  renderExcelView() {
    const tbody = document.getElementById('excelTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    let totF = 0, totTM = 0, totA1 = 0, totA2 = 0, totA3 = 0;
    let totCOD = 0, totPendingTobilled = 0, totExtra = 0, totPM = 0, totFB = 0;
    const canDel = (typeof AuthModule !== 'undefined') ? AuthModule.canDelete() : true;

    let displayedTrips = this.activeTrips;
    if (this.currentExcelSheet === 'TOBILLED') {
      displayedTrips = displayedTrips.filter(t => {
        const s = String(t.topay || '').trim().toUpperCase();
        return s === 'TOBILLED' || s === 'TO-BILLED' || s === 'TO-PAY' || s === 'TO BILLED' || s === '';
      });
    } else if (this.currentExcelSheet === 'A/TO-PAY') {
      displayedTrips = displayedTrips.filter(t => {
        const s = String(t.topay || '').trim().toUpperCase();
        return s === 'A/TO-PAY' || s === 'A/TO-BILLED' || s.startsWith('A');
      });
    } else if (this.currentExcelSheet === 'F/TO-PAY') {
      displayedTrips = displayedTrips.filter(t => {
        const s = String(t.topay || '').trim().toUpperCase();
        return s === 'F/TO-PAY' || s === 'F/TO-BILLED' || s.startsWith('F');
      });
    }

    displayedTrips.forEach((t) => {
      const calc = CalculationEngine.calculate(t);

      totF += calc.fright;
      totTM += calc.tm;
      totA1 += calc.adv1;
      totA2 += calc.adv2;
      totA3 += calc.adv3;
      totCOD += calc.cod;
      totPendingTobilled += calc.pendingTobilled;
      totExtra += calc.extraAmount;
      totPM += calc.pm;
      totFB += calc.finalBalc;

      const tr = document.createElement('tr');

      // POD cell styling: RED badge ONLY on the POD cell if date is missing
      const podCellHtml = calc.isPodMissing
        ? `<span class="pod-missing-badge" onclick="TableModule.openEditModal(${t.row}, true)" style="cursor:pointer;" title="Click to enter POD date">⚠️ Missing</span>`
        : `<span class="pod-received-text">${escapeHtml(t.pod)}</span>`;

      // Role-based delete action
      const deleteBtnHtml = canDel
        ? `<button class="btn-action-del" onclick="TableModule.deleteTripRecord(${t.row})" title="Delete Trip (Admin Only)">🗑️</button>`
        : `<button class="btn-action-del disabled" title="Delete restricted to Admin" disabled>🔒</button>`;

      const rawPodStatus = String(t.podAmountStatus || calc.podAmountStatus || '').trim().toUpperCase();
      const isPodDone = rawPodStatus === 'DONE' || (!calc.isPodMissing && (t.podAmountStatus === 0 || t.podAmountStatus === '0' || rawPodStatus === 'DONE'));
      const podStatusHtml = isPodDone
        ? `<span class="badge-pod-done" style="background:#dcfce7; color:#15803d; font-weight:700; padding:2px 8px; border-radius:12px; font-size:0.75rem;">✅ DONE</span>`
        : `<span class="badge-pod-pending" style="background:#fef3c7; color:#92400e; font-weight:700; padding:2px 8px; border-radius:12px; font-size:0.75rem;">⏳ PENDING</span>`;

      tr.innerHTML = `
        <td class="col-center" style="font-weight:700; color:#475569;">${t.slNo || ''}</td>
        <td style="font-weight:600; color:#0f172a;">${escapeHtml(t.trspName || '')}</td>
        <td class="col-center">${t.date || '—'}</td>
        <td class="col-center" style="font-weight:700; color:#1e40af;">${escapeHtml(t.lrNo || '')}</td>
        <td class="col-center" style="font-family:monospace; font-weight:700; letter-spacing:0.3px;">${escapeHtml(t.truckNo || '')}</td>
        <td>${escapeHtml(t.from || '')}</td>
        <td>${escapeHtml(t.to || '')}</td>
        <td class="col-center" style="font-family:monospace;">${escapeHtml(t.accountNo || '')}</td>
        <td class="col-center" style="font-family:monospace;">${escapeHtml(t.ifsc || '')}</td>
        <td>${escapeHtml(t.paymentMade || '')}</td>
        <td class="col-right col-bold">${CalculationEngine.formatCurrency(calc.fright, false)}</td>
        <td class="col-center">${t.date1 || ''}</td>
        <td class="col-center" style="${t.topay ? 'background:#dcfce7; font-weight:700; color:#15803d;' : ''}">${escapeHtml(t.topay || '')}</td>
        <td class="col-right">${CalculationEngine.formatCurrency(calc.tm, false)}</td>
        <td class="col-right col-bold" style="color:#7e22ce;">${CalculationEngine.formatCurrency(calc.adv1, false)}</td>
        <td class="col-center">${t.date2 || ''}</td>
        <td class="col-right">${CalculationEngine.formatCurrency(calc.adv2, false)}</td>
        <td class="col-center">${t.date3 || ''}</td>
        <td class="col-right">${CalculationEngine.formatCurrency(calc.adv3, false)}</td>
        <td class="col-center">${podCellHtml}</td>
        <td class="col-right col-bold" style="color:#0284c7;">${CalculationEngine.formatCurrency(calc.cod, false)}</td>
        <td class="col-right col-bold" style="background:#fef9c3; color:#1e3a8a;">${CalculationEngine.formatCurrency(calc.pendingTobilled, false)}</td>
        <td class="col-right col-bold" style="color:#0284c7;">${CalculationEngine.formatCurrency(calc.extraAmount, false)}</td>
        <td class="col-center">${t.payDate || ''}</td>
        <td class="col-right">${CalculationEngine.formatCurrency(calc.pm, false)}</td>
        <td class="col-right col-bold" style="background:#fee2e2; color:${calc.finalBalc > 0 ? '#b91c1c' : '#15803d'};">
          ${CalculationEngine.formatCurrency(calc.finalBalc, false)}
        </td>
        <td class="col-center">${podStatusHtml}</td>
        <td style="font-size:0.78rem;">${escapeHtml(t.note || '')}</td>
        <td class="col-center" style="white-space:nowrap;">
          <button class="btn btn-secondary btn-sm" onclick="TableModule.openEditModal(${t.row})" title="Edit Details">✏️ Edit</button>
          ${deleteBtnHtml}
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Update Bottom Sum Totals in tfoot
    const setFooterVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.innerText = CalculationEngine.formatCurrency(val, false);
    };

    setFooterVal('totFreight', totF);
    setFooterVal('totTM', totTM);
    setFooterVal('totAdv1', totA1);
    setFooterVal('totAdv2', totA2);
    setFooterVal('totAdv3', totA3);
    setFooterVal('totCOD', totCOD);
    setFooterVal('totPendingTobilled', totPendingTobilled);
    setFooterVal('totExtra', totExtra);
    setFooterVal('totPM', totPM);
    setFooterVal('totFinalBalc', totFB);
  },

  // ================= ENTERPRISE TRIP EDIT VIEW =================
  renderTripEditView() {
    const container = document.getElementById('tripEditContainer');
    if (!container) return;
    container.innerHTML = '';

    const canDel = (typeof AuthModule !== 'undefined') ? AuthModule.canDelete() : true;

    // Direct Cards Grid — Single Add Trip button in shared toolbar
    const cardsGrid = document.createElement('div');
    cardsGrid.className = 'trip-cards-grid';

    let displayedTrips = this.activeTrips;
    if (this.currentExcelSheet === 'TOBILLED') {
      displayedTrips = displayedTrips.filter(t => {
        const s = String(t.topay || '').trim().toUpperCase();
        return s === 'TOBILLED' || s === 'TO-BILLED' || s === 'TO-PAY' || s === 'TO BILLED' || s === '';
      });
    } else if (this.currentExcelSheet === 'A/TO-PAY') {
      displayedTrips = displayedTrips.filter(t => {
        const s = String(t.topay || '').trim().toUpperCase();
        return s === 'A/TO-PAY' || s === 'A/TO-BILLED' || s.startsWith('A');
      });
    } else if (this.currentExcelSheet === 'F/TO-PAY') {
      displayedTrips = displayedTrips.filter(t => {
        const s = String(t.topay || '').trim().toUpperCase();
        return s === 'F/TO-PAY' || s === 'F/TO-BILLED' || s.startsWith('F');
      });
    }

    displayedTrips.forEach((t) => {
      const calc = CalculationEngine.calculate(t);
      const card = document.createElement('div');
      card.className = `trip-card ${calc.isPodMissing ? 'card-pod-missing' : ''}`;

      const podBadge = calc.isPodMissing
        ? `<span class="pod-missing-badge" onclick="TableModule.openEditModal(${t.row}, true)" style="cursor:pointer;" title="Click to Enter POD Date">⚠️ POD Missing (Click to Enter)</span>`
        : `<span class="pod-ok-badge">✅ Received: ${escapeHtml(t.pod)}</span>`;

      const deleteBtn = canDel
        ? `<button class="btn btn-danger-soft btn-sm" onclick="TableModule.deleteTripRecord(${t.row})">🗑️ Delete</button>`
        : `<span class="role-restricted-tag" title="Only Admin can delete">🔒 Admin Delete</span>`;

      card.innerHTML = `
        <!-- Card Top Bar -->
        <div class="trip-card-top">
          <div class="trip-card-sl-tag">#${t.slNo || ''}</div>
          <div style="flex: 1; margin-left: 8px;">
            <div class="trip-card-transporter">${escapeHtml(t.trspName || 'Unassigned Transporter')}</div>
            <div class="trip-card-date">Trip Date: <strong>${t.date || '—'}</strong></div>
          </div>
          <div class="trip-card-lr-badge">
            LR: ${escapeHtml(t.lrNo || '—')}
          </div>
        </div>

        <!-- Route Indicator -->
        <div class="trip-route-banner">
          <div class="route-point origin-point">
            <span class="route-city-text">${escapeHtml(t.from || 'Origin')}</span>
          </div>
          <div class="route-connector">
            <div class="route-line-bar"></div>
            <span class="route-truck-icon">🚛</span>
          </div>
          <div class="route-point dest-point">
            <span class="route-city-text">${escapeHtml(t.to || 'Destination')}</span>
          </div>
        </div>

        <!-- Vehicle & ToPayStatus -->
        <div class="trip-details-row">
          <div class="truck-plate-wrapper">
            <span class="truck-plate-label">TRUCK:</span>
            <div class="truck-plate">
              <span class="truck-plate-ind">IND</span>
              <span class="truck-plate-num">${escapeHtml(t.truckNo || '—')}</span>
            </div>
          </div>
          <div style="text-align: right;">
            <span class="topay-badge topay-${(t.topay || 'TOBILLED').toLowerCase().replace(/[^a-z]/g, '')}">${escapeHtml(t.topay || 'TOBILLED')}</span>
          </div>
        </div>

        <!-- Financial Summary Grounded in 28-Column Engine -->
        <div class="trip-financial-grid">
          <div class="fin-box fin-box-fright">
            <span class="fin-label">FREIGHT (Col K)</span>
            <span class="fin-val fin-fright">${CalculationEngine.formatCurrency(calc.fright)}</span>
          </div>
          <div class="fin-box fin-box-adv">
            <span class="fin-label">${calc.cod > 0 ? 'COD (Col U)' : 'ADVANCES (O+Q+S)'}</span>
            <span class="fin-val fin-adv">${CalculationEngine.formatCurrency(calc.cod > 0 ? calc.cod : calc.totalAdvances)}</span>
          </div>
          <div class="fin-box fin-box-balc highlight-balc">
            <span class="fin-label">PENDING (Col Z)</span>
            <span class="fin-val fin-final">${CalculationEngine.formatCurrency(calc.finalBalc)}</span>
          </div>
        </div>

        <!-- POD Status Pill -->
        <div class="trip-card-pod-row">
          <span style="font-size: 0.76rem; color: #64748b; font-weight: 700;">POD Delivery Status:</span>
          <div>${podBadge}</div>
        </div>

        ${calc.extraAmount > 0 ? `
          <div style="margin:6px 0; font-size:0.75rem;">
            <span style="font-weight:700; color:#0284c7;">Extra/Halting:</span>
            <strong style="color:#0369a1;">₹${Number(calc.extraAmount).toLocaleString('en-IN')}</strong>
          </div>
        ` : ''}

        <!-- Card Action Footer -->
        <div class="trip-card-footer">
          <div>${deleteBtn}</div>
          <button class="btn btn-primary btn-sm" onclick="TableModule.openEditModal(${t.row})">
            ✏️ Edit Details
          </button>
        </div>
      `;
      cardsGrid.appendChild(card);
    });

    container.appendChild(cardsGrid);
  },

  // ================= MODAL OPERATIONS =================
  toInputDate(dateStr) {
    if (!dateStr) return '';
    const str = String(dateStr).trim();
    if (!str || str.toLowerCase().includes('if date') || str.toLowerCase().includes('empty')) return '';
    
    // Support numeric Excel serial dates (e.g. 46254)
    if (/^\d{5}$/.test(str)) {
      const serial = parseInt(str, 10);
      const utcDays = serial - 25569;
      const utcVal = utcDays * 86400 * 1000;
      const d = new Date(utcVal);
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }

    const parts = str.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length <= 2 && parts[2].length === 4) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
    }
    return '';
  },

  toDisplayDate(dateInputVal) {
    if (!dateInputVal) return '';
    const str = String(dateInputVal).trim();
    if (!str) return '';
    const parts = str.split(/[-/]/);
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[0]}`;
    }
    return str;
  },

  // ================= SMART AUTOFILL & HISTORICAL SEARCH =================
  _cachedAutofillMatches: [],

  populateAutofillDatalists() {
    const trips = (typeof DataManager !== 'undefined') ? DataManager.getAll() : [];
    const trspList = document.getElementById('m_trspName_list');
    const truckList = document.getElementById('m_truckNo_list');
    const fromList = document.getElementById('m_from_list');
    const toList = document.getElementById('m_to_list');
    const bankList = document.getElementById('m_paymentMade_list');

    const uniqueTrsp = [...new Set(trips.map(t => (t.trspName || '').trim()).filter(Boolean))];
    const uniqueTrucks = [...new Set(trips.map(t => (t.truckNo || '').trim().toUpperCase()).filter(Boolean))];
    const uniqueFrom = [...new Set(trips.map(t => (t.from || '').trim().toUpperCase()).filter(Boolean))];
    const uniqueTo = [...new Set(trips.map(t => (t.to || '').trim().toUpperCase()).filter(Boolean))];
    const uniqueBank = [...new Set(trips.map(t => (t.paymentMade || '').trim()).filter(Boolean))];

    if (trspList) trspList.innerHTML = uniqueTrsp.map(v => `<option value="${escapeHtml(v)}">`).join('');
    if (truckList) truckList.innerHTML = uniqueTrucks.map(v => `<option value="${escapeHtml(v)}">`).join('');
    if (fromList) fromList.innerHTML = uniqueFrom.map(v => `<option value="${escapeHtml(v)}">`).join('');
    if (toList) toList.innerHTML = uniqueTo.map(v => `<option value="${escapeHtml(v)}">`).join('');
    if (bankList) bankList.innerHTML = uniqueBank.map(v => `<option value="${escapeHtml(v)}">`).join('');
  },

  handleAutofillSearch(query) {
    const q = String(query || '').trim().toLowerCase();
    const dropdown = document.getElementById('autofillDropdown');
    if (!dropdown) return;

    if (!q || q.length < 2) {
      dropdown.style.display = 'none';
      dropdown.innerHTML = '';
      return;
    }

    const trips = (typeof DataManager !== 'undefined') ? DataManager.getAll() : [];
    const profilesMap = new Map();

    trips.forEach(t => {
      const trsp = (t.trspName || '').trim();
      const truck = (t.truckNo || '').trim();
      const from = (t.from || '').trim();
      const to = (t.to || '').trim();
      const acct = (t.accountNo || '').trim();
      const ifsc = (t.ifsc || '').trim();
      const bank = (t.paymentMade || '').trim();

      const searchableText = `${trsp} ${truck} ${from} ${to} ${acct} ${ifsc} ${bank}`.toLowerCase();
      if (searchableText.includes(q)) {
        const key = `${trsp.toUpperCase()}__${truck.toUpperCase()}`;
        if (!profilesMap.has(key)) {
          profilesMap.set(key, {
            trspName: trsp,
            truckNo: truck,
            from: from || 'MEDCHAL',
            to: to,
            accountNo: acct,
            ifsc: ifsc,
            paymentMade: bank || 'SBI BANK',
            fright: t.fright || 0,
            topay: t.topay || 'TOBILLED',
            slNo: t.slNo
          });
        }
      }
    });

    const matches = Array.from(profilesMap.values()).slice(0, 8);

    if (matches.length === 0) {
      dropdown.innerHTML = `<div style="padding: 0.6rem 0.85rem; font-size: 0.78rem; color: #94a3b8;">No past profiles matching "${escapeHtml(q)}". You can type details directly.</div>`;
      dropdown.style.display = 'block';
      return;
    }

    dropdown.innerHTML = matches.map((p, idx) => `
      <div class="autofill-item" onclick="TableModule.applyAutofillProfile(${idx})">
        <div class="autofill-item-title">
          <span>🚛 ${escapeHtml(p.trspName)} <strong style="color: #0284c7; font-family: monospace;">(${escapeHtml(p.truckNo || '—')})</strong></span>
          <span style="font-size: 0.72rem; color: #16a34a; font-weight: 700;">Trip #${p.slNo || ''}</span>
        </div>
        <div class="autofill-item-sub">
📍 Route: <strong>${escapeHtml(p.from)} ➔ ${escapeHtml(p.to || 'Any')}</strong> | 🏦 Bank: ${escapeHtml(p.paymentMade)} (A/C: ${escapeHtml(p.accountNo || '—')} | IFSC: ${escapeHtml(p.ifsc || '—')})
        </div>
      </div>
    `).join('');

    this._cachedAutofillMatches = matches;
    dropdown.style.display = 'block';
  },

  applyAutofillProfile(index) {
    if (!this._cachedAutofillMatches || !this._cachedAutofillMatches[index]) return;
    const p = this._cachedAutofillMatches[index];

    if (p.trspName) document.getElementById('m_trspName').value = p.trspName;
    if (p.truckNo) document.getElementById('m_truckNo').value = p.truckNo;
    if (p.from) document.getElementById('m_from').value = p.from;
    if (p.to) document.getElementById('m_to').value = p.to;
    if (p.accountNo) document.getElementById('m_accountNo').value = p.accountNo;
    if (p.ifsc) document.getElementById('m_ifsc').value = p.ifsc;
    if (p.paymentMade) document.getElementById('m_paymentMade').value = p.paymentMade;

    this.clearAutofillSearch();

    // Focus on LR NO because it must be unique and cannot be duplicated
    const lrInput = document.getElementById('m_lrNo');
    if (lrInput) {
      lrInput.focus();
    }

    if (typeof AppModule !== 'undefined') {
      AppModule.showToast(`⚡ Autofilled Bank & Route details for ${p.trspName}!`);
    }
  },

  clearAutofillSearch() {
    const input = document.getElementById('m_autofillSearch');
    if (input) input.value = '';
    const dropdown = document.getElementById('autofillDropdown');
    if (dropdown) {
      dropdown.style.display = 'none';
      dropdown.innerHTML = '';
    }
    this._cachedAutofillMatches = [];
  },

  handleFieldAutofill(field, val, isChange = false) {
    if (!val || val.trim().length < 2) return;
    const cleanVal = val.trim().toUpperCase();
    const trips = (typeof DataManager !== 'undefined') ? DataManager.getAll() : [];

    let match = null;
    if (field === 'trspName') {
      match = trips.slice().reverse().find(t => (t.trspName || '').trim().toUpperCase() === cleanVal);
    } else if (field === 'truckNo') {
      match = trips.slice().reverse().find(t => (t.truckNo || '').trim().toUpperCase() === cleanVal);
    }

    if (match) {
      const acctInput = document.getElementById('m_accountNo');
      const ifscInput = document.getElementById('m_ifsc');
      const bankInput = document.getElementById('m_paymentMade');
      const fromInput = document.getElementById('m_from');
      const toInput = document.getElementById('m_to');
      const truckInput = document.getElementById('m_truckNo');
      const trspInput = document.getElementById('m_trspName');

      if (acctInput && (!acctInput.value || isChange)) acctInput.value = match.accountNo || '';
      if (ifscInput && (!ifscInput.value || isChange)) ifscInput.value = match.ifsc || '';
      if (bankInput && (!bankInput.value || bankInput.value === 'SBI BANK' || isChange)) bankInput.value = match.paymentMade || 'SBI BANK';
      if (fromInput && (!fromInput.value || fromInput.value === 'MEDCHAL')) fromInput.value = match.from || 'MEDCHAL';
      if (toInput && (!toInput.value || isChange)) toInput.value = match.to || '';
      if (field === 'truckNo' && trspInput && (!trspInput.value || isChange)) trspInput.value = match.trspName || '';
      if (field === 'trspName' && truckInput && (!truckInput.value || isChange)) truckInput.value = match.truckNo || '';
    }
  },

  handlePodDateChange() {
    const podVal = document.getElementById('m_pod')?.value;
    const statusEl = document.getElementById('m_podAmountStatus');
    if (statusEl && podVal && podVal.trim() !== '') {
      statusEl.value = 'DONE';
    }
    this.liveCalcModal();
  },

  openEditModal(rowNum, focusPod = false) {
    const trip = DataManager.getTrip(rowNum);
    if (!trip) return;

    document.getElementById('modalTitle').innerText = `✏️ Edit Trip (SL NO: ${trip.slNo || trip.row})`;
    document.getElementById('m_editRow').value = trip.row;
    document.getElementById('m_isAdd').value = 'false';
    document.getElementById('m_sourceSheet').value = trip.sheetName || '';

    // Dedicated button: "Save Changes" for Edit
    const submitBtn = document.getElementById('m_submitBtn');
    if (submitBtn) submitBtn.innerText = '💾 Save Changes';

    document.getElementById('m_slNo').value = trip.slNo || '';
    document.getElementById('m_trspName').value = trip.trspName || '';
    document.getElementById('m_date').value = this.toInputDate(trip.date);
    const lrInput = document.getElementById('m_lrNo');
    if (lrInput) {
      lrInput.value = trip.lrNo || '';
      lrInput.style.borderColor = '';
      lrInput.style.backgroundColor = '';
    }
    const errSpan = document.getElementById('m_lrNoError');
    if (errSpan) {
      errSpan.innerText = '';
      errSpan.style.display = 'none';
    }
    document.getElementById('m_truckNo').value = trip.truckNo || '';
    document.getElementById('m_from').value = trip.from || '';
    document.getElementById('m_to').value = trip.to || '';
    document.getElementById('m_accountNo').value = trip.accountNo || '';
    document.getElementById('m_ifsc').value = trip.ifsc || '';
    document.getElementById('m_paymentMade').value = trip.paymentMade || '';
    const numVal = (v) => (v !== undefined && v !== null && v !== '' && Number(v) !== 0) ? Number(v) : '';
    document.getElementById('m_fright').value = numVal(trip.fright);
    
    // Normalize status into exactly one of the 3 supported options: A/TO-PAY, F/TO-PAY, TOBILLED
    let currentStatus = String(trip.topay || '').trim().toUpperCase();
    if (currentStatus.startsWith('F')) {
      currentStatus = 'F/TO-PAY';
    } else if (currentStatus.startsWith('A')) {
      currentStatus = 'A/TO-PAY';
    } else {
      currentStatus = 'TOBILLED';
    }
    document.getElementById('m_topay').value = currentStatus;

    document.getElementById('m_tm').value = numVal(trip.tm);
    document.getElementById('m_advance1').value = numVal(trip.advance1);
    document.getElementById('m_date1').value = this.toInputDate(trip.date1);
    document.getElementById('m_advance2').value = numVal(trip.advance2);
    document.getElementById('m_date2').value = this.toInputDate(trip.date2);
    document.getElementById('m_advance3').value = numVal(trip.advance3);
    document.getElementById('m_date3').value = this.toInputDate(trip.date3);
    document.getElementById('m_pod').value = this.toInputDate(trip.pod);
    const codEl = document.getElementById('m_cod');
    if (codEl) {
      codEl.value = numVal(trip.cod);
      codEl.dataset.autoFilled = (trip.cod === undefined || trip.cod === null || Number(trip.cod) === 0) ? 'true' : 'false';
    }
    document.getElementById('m_extraAmount').value = numVal(trip.extraAmount);
    document.getElementById('m_payDate').value = this.toInputDate(trip.payDate);
    document.getElementById('m_pm').value = numVal(trip.pm !== undefined && trip.pm !== null && trip.pm !== '' ? trip.pm : trip.pmFinal);
    document.getElementById('m_note').value = trip.note || '';
    const podStatusEl = document.getElementById('m_podAmountStatus');
    if (podStatusEl) {
      const curStatus = String(trip.podAmountStatus || '').trim().toUpperCase();
      podStatusEl.value = (curStatus === 'DONE' || trip.pod) ? 'DONE' : 'PENDING';
    }

    // Apply strict field visibility & zero out any blocked/non-applicable fields for this mode
    this.updateFormFieldsVisibility(currentStatus);

    this.populateAutofillDatalists();
    this.clearAutofillSearch();
    this.liveCalcModal();
    document.getElementById('editModal').style.display = 'flex';

    if (focusPod) {
      setTimeout(() => {
        const podInput = document.getElementById('m_pod');
        if (podInput) {
          podInput.focus();
          podInput.classList.add('pod-focus-pulse');
          setTimeout(() => podInput.classList.remove('pod-focus-pulse'), 3000);
        }
      }, 100);
    }
  },

  openAddModal() {
    const list = DataManager.getAll();
    const nextRowNum = list.length > 0 ? (Math.max(...list.map(t => t.row)) + 1) : 2;
    const nextSlNo = list.length > 0 ? (Math.max(...list.map(t => parseInt(t.slNo, 10) || 0)) + 1) : 1;
    const today = new Date().toISOString().split('T')[0];

    document.getElementById('modalTitle').innerText = '➕ Add New Shipment';
    document.getElementById('m_editRow').value = nextRowNum;
    document.getElementById('m_isAdd').value = 'true';
    document.getElementById('m_sourceSheet').value = '';
    const podStatusAddEl = document.getElementById('m_podAmountStatus');
    if (podStatusAddEl) podStatusAddEl.value = 'PENDING';

    // Dedicated button: "Submit / Add Shipment" for Add
    const submitBtn = document.getElementById('m_submitBtn');
    if (submitBtn) submitBtn.innerText = '➕ Submit / Add Shipment';

    // Sequential Starting SL NO starting at 1
    document.getElementById('m_slNo').value = nextSlNo;
    document.getElementById('m_trspName').value = '';
    document.getElementById('m_date').value = today;
    
    const lrInput = document.getElementById('m_lrNo');
    if (lrInput) {
      lrInput.value = '';
      lrInput.style.borderColor = '';
      lrInput.style.backgroundColor = '';
    }
    const errSpan = document.getElementById('m_lrNoError');
    if (errSpan) {
      errSpan.innerText = '';
      errSpan.style.display = 'none';
    }

    document.getElementById('m_truckNo').value = '';
    document.getElementById('m_from').value = 'MEDCHAL';
    document.getElementById('m_to').value = '';
    document.getElementById('m_accountNo').value = '';
    document.getElementById('m_ifsc').value = '';
    document.getElementById('m_paymentMade').value = 'SBI BANK';
    document.getElementById('m_fright').value = '';
    document.getElementById('m_topay').value = 'TOBILLED';
    this.updateFormFieldsVisibility('TOBILLED');
    document.getElementById('m_tm').value = '';
    document.getElementById('m_advance1').value = '';
    document.getElementById('m_date1').value = '';
    document.getElementById('m_advance2').value = '';
    document.getElementById('m_date2').value = '';
    document.getElementById('m_advance3').value = '';
    document.getElementById('m_date3').value = '';
    document.getElementById('m_pod').value = '';
    const codIn = document.getElementById('m_cod');
    if (codIn) {
      codIn.value = '';
      codIn.dataset.autoFilled = 'true';
    }
    document.getElementById('m_extraAmount').value = '';
    document.getElementById('m_payDate').value = '';
    document.getElementById('m_pm').value = '';
    document.getElementById('m_note').value = '';

    this.populateAutofillDatalists();
    this.clearAutofillSearch();
    this.liveCalcModal();
    document.getElementById('editModal').style.display = 'flex';
  },

  closeModal() {
    this.clearAutofillSearch();
    const podInput = document.getElementById('m_pod');
    if (podInput) podInput.classList.remove('pod-focus-pulse');
    const lrInput = document.getElementById('m_lrNo');
    if (lrInput) {
      lrInput.style.borderColor = '';
      lrInput.style.backgroundColor = '';
    }
    const errSpan = document.getElementById('m_lrNoError');
    if (errSpan) {
      errSpan.innerText = '';
      errSpan.style.display = 'none';
    }
    document.getElementById('editModal').style.display = 'none';
  },

  validateLrNoLive() {
    const lrInput = document.getElementById('m_lrNo');
    const errSpan = document.getElementById('m_lrNoError');
    if (!lrInput) return true;

    const rowNum = parseInt(document.getElementById('m_editRow').value) || 0;
    const isAdd = document.getElementById('m_isAdd').value === 'true';
    const lrVal = lrInput.value.trim();

    if (!lrVal) {
      lrInput.style.borderColor = '';
      lrInput.style.backgroundColor = '';
      if (errSpan) {
        errSpan.innerText = '';
        errSpan.style.display = 'none';
      }
      return true;
    }

    const duplicate = (typeof DataManager !== 'undefined') ? DataManager.isDuplicateLr(lrVal, isAdd ? null : rowNum) : null;

    if (duplicate) {
      lrInput.style.borderColor = '#ef4444';
      lrInput.style.backgroundColor = '#fef2f2';
      if (errSpan) {
        errSpan.innerText = `⚠️ Duplicate (Trip #${duplicate.slNo})`;
        errSpan.style.color = '#ef4444';
        errSpan.style.display = 'inline';
      }
      return false;
    } else {
      lrInput.style.borderColor = '#22c55e';
      lrInput.style.backgroundColor = '';
      if (errSpan) {
        errSpan.innerText = '✅ Unique LR';
        errSpan.style.color = '#15803d';
        errSpan.style.display = 'inline';
      }
      return true;
    }
  },

  handleNumberInput(el) {
    if (!el) return;
    let val = el.value;
    // Strip leading zero so "0120" automatically becomes "120"
    if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) {
      el.value = val.replace(/^0+/, '');
    }
    this.liveCalcModal();
  },

  liveCalcModal() {
    const fright = Number(document.getElementById('m_fright').value) || 0;
    const topay = document.getElementById('m_topay').value || 'TOBILLED';
    const topayVal = String(topay).trim().toUpperCase();

    // Read only active/enabled fields; disabled/blocked fields are treated as 0
    const getVal = (id) => {
      const el = document.getElementById(id);
      if (!el || el.disabled) return 0;
      return Number(el.value) || 0;
    };

    const tm = (topayVal.startsWith('F')) ? 0 : getVal('m_tm');
    const advance1 = (topayVal.startsWith('F')) ? 0 : getVal('m_advance1');
    const advance2 = (topayVal === 'TOBILLED') ? getVal('m_advance2') : 0;
    const advance3 = (topayVal === 'TOBILLED') ? getVal('m_advance3') : 0;
    const extraAmount = (topayVal === 'TOBILLED') ? getVal('m_extraAmount') : 0;
    const pm = (topayVal === 'TOBILLED') ? getVal('m_pm') : 0;
    const codInput = document.getElementById('m_cod');
    const userCod = (codInput && !codInput.disabled) ? (Number(codInput.value) || 0) : 0;

    const dummy = {
      fright,
      topay: topayVal,
      tm,
      advance1,
      advance2,
      advance3,
      extraAmount,
      cod: userCod,
      pm
    };

    const calc = CalculationEngine.calculate(dummy);

    // Rule description text
    const ruleEl = document.getElementById('mRuleText');
    if (ruleEl) ruleEl.innerText = 'Rule Applied: ' + calc.ruleText;

    // COD Banner Box (show for A/F-Topay, hide for TOBILLED)
    const mCodBox = document.getElementById('mCodBox');
    const mCalcCod = document.getElementById('mCalcCod');

    if (topayVal.startsWith('A') || topayVal.startsWith('F')) {
      if (mCodBox) mCodBox.style.display = 'block';
      if (mCalcCod) mCalcCod.innerText = CalculationEngine.formatCurrency(calc.cod);
      // Auto-fill COD field if it's currently 0 or previously auto-set
      if (codInput && (userCod === 0 || codInput.dataset.autoFilled === 'true')) {
        codInput.value = calc.cod;
        codInput.dataset.autoFilled = 'true';
      }
    } else {
      if (mCodBox) mCodBox.style.display = 'none';
      if (codInput) {
        codInput.value = 0;
        codInput.dataset.autoFilled = 'false';
      }
    }

    // Pending ToBilled (Col V)
    const mCalcBalc = document.getElementById('mCalcBalc');
    if (mCalcBalc) mCalcBalc.innerText = CalculationEngine.formatCurrency(calc.pendingTobilled);

    // Pending Amount / Final Net Balance (Col Z)
    const mCalcFinalBalc = document.getElementById('mCalcFinalBalc');
    if (mCalcFinalBalc) mCalcFinalBalc.innerText = CalculationEngine.formatCurrency(calc.finalBalc);

  },

  handleSaveModal(e) {
    if (e) e.preventDefault();

    const rowNum = parseInt(document.getElementById('m_editRow').value);
    const isAdd = document.getElementById('m_isAdd').value === 'true';
    const lrNo = document.getElementById('m_lrNo').value.trim();

    if (!lrNo) {
      alert('⚠️ LR NO is required. Please enter an LR NO.');
      document.getElementById('m_lrNo').focus();
      return;
    }

    // Strict Duplicate LR NO Enforcement: LR NO must be unique across all trips
    const duplicate = (typeof DataManager !== 'undefined') ? DataManager.isDuplicateLr(lrNo, isAdd ? null : rowNum) : null;

    if (duplicate) {
      const lrInput = document.getElementById('m_lrNo');
      if (lrInput) {
        lrInput.style.borderColor = '#ef4444';
        lrInput.style.backgroundColor = '#fef2f2';
        lrInput.focus();
      }
      const errSpan = document.getElementById('m_lrNoError');
      if (errSpan) {
        errSpan.innerText = `⚠️ Duplicate of Trip #${duplicate.slNo}`;
        errSpan.style.color = '#ef4444';
        errSpan.style.display = 'inline';
      }
      alert(`❌ Duplicate LR NO Error:\n\nLR NO "${lrNo}" is already in use by Trip #${duplicate.slNo} (${duplicate.truckNo} - ${duplicate.trspName})!\n\nEach shipment must have a unique LR NO. Duplicate LR numbers are not allowed.`);
      return;
    }

    // Determine strict normalized status and clean non-applicable fields
    const rawTopay = String(document.getElementById('m_topay').value || 'TOBILLED').trim().toUpperCase();
    let normalizedTopay = 'TOBILLED';
    if (rawTopay.startsWith('F')) {
      normalizedTopay = 'F/TO-PAY';
    } else if (rawTopay.startsWith('A')) {
      normalizedTopay = 'A/TO-PAY';
    }

    const frightVal = Number(document.getElementById('m_fright').value) || 0;
    let tmVal = 0;
    let adv1Val = 0;
    let date1Val = '';
    let adv2Val = 0;
    let date2Val = '';
    let adv3Val = 0;
    let date3Val = '';
    let codVal = 0;
    let extraVal = 0;
    let payDateVal = '';
    let pmVal = 0;

    if (normalizedTopay === 'F/TO-PAY') {
      codVal = frightVal;
      // All other advances, TM, Extra, PM are strictly 0 and blank dates
    } else if (normalizedTopay === 'A/TO-PAY') {
      tmVal = Number(document.getElementById('m_tm').value) || 0;
      adv1Val = Number(document.getElementById('m_advance1').value) || 0;
      date1Val = this.toDisplayDate(document.getElementById('m_date1').value);
      codVal = Math.max(0, frightVal - tmVal - adv1Val);
      // Adv 2, 3, Extra, PM are strictly 0 and blank dates
    } else { // TOBILLED
      tmVal = Number(document.getElementById('m_tm').value) || 0;
      adv1Val = Number(document.getElementById('m_advance1').value) || 0;
      date1Val = this.toDisplayDate(document.getElementById('m_date1').value);
      adv2Val = Number(document.getElementById('m_advance2').value) || 0;
      date2Val = this.toDisplayDate(document.getElementById('m_date2').value);
      adv3Val = Number(document.getElementById('m_advance3').value) || 0;
      date3Val = this.toDisplayDate(document.getElementById('m_date3').value);
      codVal = 0;
      extraVal = Number(document.getElementById('m_extraAmount').value) || 0;
      payDateVal = this.toDisplayDate(document.getElementById('m_payDate').value);
      pmVal = Number(document.getElementById('m_pm').value) || 0;
    }

    const sourceSheet = document.getElementById('m_sourceSheet')?.value || '';
    const podStatusSelected = document.getElementById('m_podAmountStatus')?.value || 'PENDING';

    const tripData = {
      row: rowNum,
      sourceSheet: sourceSheet,
      sheetName: sourceSheet || normalizedTopay,
      slNo: document.getElementById('m_slNo').value || String(DataManager.getAll().length + 1),
      trspName: document.getElementById('m_trspName').value.trim(),
      date: this.toDisplayDate(document.getElementById('m_date').value),
      lrNo: lrNo,
      truckNo: document.getElementById('m_truckNo').value.trim().toUpperCase(),
      from: document.getElementById('m_from').value.trim(),
      to: document.getElementById('m_to').value.trim(),
      accountNo: document.getElementById('m_accountNo').value.trim(),
      ifsc: document.getElementById('m_ifsc').value.trim().toUpperCase(),
      paymentMade: document.getElementById('m_paymentMade').value.trim(),
      fright: frightVal,
      date1: date1Val,
      topay: normalizedTopay,
      tm: tmVal,
      advance1: adv1Val,
      date2: date2Val,
      advance2: adv2Val,
      date3: date3Val,
      advance3: adv3Val,
      pod: this.toDisplayDate(document.getElementById('m_pod').value),
      cod: codVal,
      extraAmount: extraVal,
      payDate: payDateVal,
      pm: pmVal,
      note: document.getElementById('m_note').value.trim()
    };

    // Calculate exact authoritative balances matching BROKER DETAILS ADVANCE BALC DETAILS.xlsx
    const calc = CalculationEngine.calculate(tripData);
    tripData.cod = calc.cod;
    tripData.pendingTobilled = calc.pendingTobilled;
    tripData.balc = calc.pendingTobilled;
    tripData.finalBalc = calc.finalBalc;
    tripData.podAmountStatus = (podStatusSelected === 'DONE' || tripData.pod || calc.podAmountStatus === 'DONE') ? 'DONE' : 'PENDING';

    DataManager.saveTrip(tripData);
    this.closeModal();

    if (typeof AppModule !== 'undefined') {
      AppModule.refresh();
      AppModule.showToast(isAdd ? '➕ New shipment submitted!' : '💾 Changes saved!');
    }

    // Authoritative Cloud Sync to Google Sheets
    if (typeof ApiService !== 'undefined' && ApiService.isCloudConnected() && window.navigator.onLine) {
      ApiService.saveTrip(tripData).then(async (res) => {
        console.log('✅ Cloud mutation synced to Google Sheets:', res);
        if (res && res.version) {
          DataManager.setVersion(String(res.version));
        }
        if (typeof AppModule !== 'undefined') {
          await AppModule.syncNow(true);
        }
      }).catch(err => {
        console.warn('Cloud sync note for saveTrip:', err);
      });
    }
  },

  deleteTripRecord(rowNum) {
    if (typeof AuthModule !== 'undefined' && !AuthModule.canDelete()) {
      alert('Access Restricted: Only Administrator has permission to delete trips!');
      return;
    }

    if (confirm(`Are you sure you want to delete this trip record? This action cannot be undone.`)) {
      const targetTrip = (typeof DataManager !== 'undefined') ? DataManager.getTrip(rowNum) : null;
      const targetSheetName = targetTrip?.sheetName || '';
      DataManager.deleteTrip(rowNum);
      if (typeof AppModule !== 'undefined') {
        AppModule.refresh();
        AppModule.showToast('🗑️ Trip deleted successfully.');
      }

      // Authoritative Cloud Sync to Google Sheets
      if (typeof ApiService !== 'undefined' && ApiService.isCloudConnected() && window.navigator.onLine) {
        ApiService.deleteTrip(rowNum, targetSheetName).then(async (res) => {
          console.log('✅ Cloud delete synced to Google Sheets:', res);
          if (typeof AppModule !== 'undefined') {
            await AppModule.syncNow(true);
          }
        }).catch(err => {
          console.warn('Cloud sync note for deleteTrip:', err);
        });
      }
    }
  },

  // ================= EXCEL (.XLSX) EXPORT WITH 28 COLUMNS & PRESERVED CELL COLORS =================
  async exportToExcel() {
    if (typeof ExcelJS === 'undefined') {
      console.warn('ExcelJS not loaded, falling back to CSV export.');
      return this.exportToCSV();
    }

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Transport Brokerage Ledger Pvt Ltd";
      workbook.created = new Date();

      const colDefs = [
        { header: 'SL NO', key: 'slNo', width: 9 },
        { header: 'TRSP NAME', key: 'trspName', width: 22 },
        { header: 'DATE', key: 'date', width: 13 },
        { header: 'LR NO', key: 'lrNo', width: 14 },
        { header: 'TRUCK NO', key: 'truckNo', width: 15 },
        { header: 'FROM', key: 'from', width: 14 },
        { header: 'TO', key: 'to', width: 22 },
        { header: 'ACCOUNT NO', key: 'accountNo', width: 18 },
        { header: 'IFSC CODE', key: 'ifsc', width: 14 },
        { header: 'PAYMENT MADE', key: 'paymentMade', width: 16 },
        { header: 'FRIGHT', key: 'fright', width: 14 },
        { header: 'DATE', key: 'date1', width: 13 },
        { header: 'ToPayStatus', key: 'topay', width: 16 },
        { header: 'T/M', key: 'tm', width: 11 },
        { header: 'ADVANCE', key: 'adv1', width: 14 },
        { header: 'DATE 2', key: 'date2', width: 13 },
        { header: 'ADVANCE2', key: 'adv2', width: 12 },
        { header: 'DATE3', key: 'date3', width: 13 },
        { header: 'ADVANCE3', key: 'adv3', width: 12 },
        { header: 'POD RECD Date', key: 'pod', width: 16 },
        { header: 'Cash on Delivery (COD) :A/Topay&Ftopay', key: 'cod', width: 22 },
        { header: 'Pending Amount: Tobilled', key: 'pendingTobilled', width: 20 },
        { header: 'Extra Amount', key: 'extraAmount', width: 14 },
        { header: 'PM/PA Date', key: 'payDate', width: 13 },
        { header: 'P/M', key: 'pm', width: 11 },
        { header: 'Pending Amount', key: 'finalBalc', width: 16 },
        { header: 'POD Amount Status', key: 'podAmountStatus', width: 16 },
        { header: 'REMARKS / NOTE', key: 'note', width: 26 }
      ];

      const navyFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF002060' } };
      const greenFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } };
      const purpleFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7E22CE' } };
      const yellowHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCA8A04' } };
      const redHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB91C1C' } };

      const thinBorder = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };

      const populateSheet = (sheetName, filterFn) => {
        const ws = workbook.addWorksheet(sheetName, { views: [{ showGridLines: true }] });
        ws.columns = colDefs;

        const headerRow = ws.getRow(1);
        headerRow.height = 28;

        headerRow.eachCell((cell, colNumber) => {
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          cell.border = thinBorder;

          if (colNumber === 13) cell.fill = greenFill;
          else if (colNumber === 15) cell.fill = purpleFill;
          else if (colNumber === 20) cell.fill = redHeaderFill;
          else if (colNumber === 22) cell.fill = yellowHeaderFill;
          else if (colNumber === 26) cell.fill = redHeaderFill;
          else cell.fill = navyFill;
        });

        const allTrips = (typeof DataManager !== 'undefined') ? DataManager.getAll() : this.activeTrips;
        const trips = filterFn ? allTrips.filter(filterFn) : allTrips;

        let sumF = 0, sumTM = 0, sumA1 = 0, sumA2 = 0, sumA3 = 0;
        let sumCOD = 0, sumPendingTobilled = 0, sumExtra = 0, sumPM = 0, sumFB = 0;

        trips.forEach((t) => {
          const calc = CalculationEngine.calculate(t);
          sumF += calc.fright;
          sumTM += calc.tm;
          sumA1 += calc.adv1;
          sumA2 += calc.adv2;
          sumA3 += calc.adv3;
          sumCOD += calc.cod;
          sumPendingTobilled += calc.pendingTobilled;
          sumExtra += calc.extraAmount;
          sumPM += calc.pm;
          sumFB += calc.finalBalc;

          const row = ws.addRow({
            slNo: t.slNo || '',
            trspName: t.trspName || '',
            date: t.date || '',
            lrNo: t.lrNo || '',
            truckNo: t.truckNo || '',
            from: t.from || '',
            to: t.to || '',
            accountNo: t.accountNo || '',
            ifsc: t.ifsc || '',
            paymentMade: t.paymentMade || '',
            fright: calc.fright || 0,
            date1: t.date1 || '',
            topay: t.topay || '',
            tm: calc.tm || 0,
            adv1: calc.adv1 || 0,
            date2: t.date2 || '',
            adv2: calc.adv2 || 0,
            date3: t.date3 || '',
            adv3: calc.adv3 || 0,
            pod: calc.isPodMissing ? 'MISSING' : (t.pod || ''),
            cod: calc.cod || 0,
            pendingTobilled: calc.pendingTobilled || 0,
            extraAmount: calc.extraAmount || 0,
            payDate: t.payDate || '',
            pm: calc.pm || 0,
            finalBalc: calc.finalBalc || 0,
            podAmountStatus: calc.podAmountStatus || 0,
            note: t.note || ''
          });

          row.height = 20;

          row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            cell.border = thinBorder;
            cell.font = { name: 'Calibri', size: 10 };
            cell.alignment = { vertical: 'middle' };

            if ([1, 3, 4, 5, 8, 9, 12, 13, 16, 18, 20, 24].includes(colNumber)) {
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
            } else if ([11, 14, 15, 17, 19, 21, 22, 23, 25, 26, 27].includes(colNumber)) {
              cell.alignment = { horizontal: 'right', vertical: 'middle' };
              cell.numFmt = '#,##0';
            }

            if (colNumber === 13 && t.topay) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
              cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF15803D' } };
            }
            if (colNumber === 15 && calc.adv1 > 0) {
              cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF7E22CE' } };
            }
            if (colNumber === 20) {
              if (calc.isPodMissing) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
                cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFDC2626' } };
              } else {
                cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF15803D' } };
              }
            }
            if (colNumber === 22) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF9C3' } };
              cell.font = { name: 'Calibri', size: 10, bold: true };
            }
            if (colNumber === 26) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
              cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: calc.finalBalc > 0 ? 'FFB91C1C' : 'FF15803D' } };
            }
          });
        });

        // Totals Row
        const totRow = ws.addRow({
          slNo: '',
          trspName: 'SUM TOTALS:',
          date: '',
          lrNo: '',
          truckNo: '',
          from: '',
          to: '',
          accountNo: '',
          ifsc: '',
          paymentMade: '',
          fright: sumF,
          date1: '',
          topay: '',
          tm: sumTM,
          adv1: sumA1,
          date2: '',
          adv2: sumA2,
          date3: '',
          adv3: sumA3,
          pod: '',
          cod: sumCOD,
          pendingTobilled: sumPendingTobilled,
          extraAmount: sumExtra,
          payDate: '',
          pm: sumPM,
          finalBalc: sumFB,
          podAmountStatus: 0,
          note: ''
        });

        totRow.height = 24;
        const yellowTotalFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF08A' } };
        const doubleBottomBorder = {
          top: { style: 'medium', color: { argb: 'FFCA8A04' } },
          bottom: { style: 'double', color: { argb: 'FFCA8A04' } },
          left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
        };

        totRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.fill = yellowTotalFill;
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF000000' } };
          cell.border = doubleBottomBorder;
          cell.alignment = { vertical: 'middle' };

          if ([11, 14, 15, 17, 19, 21, 22, 23, 25, 26, 27].includes(colNumber)) {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            cell.numFmt = '#,##0';
          } else if (colNumber === 2) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          }
        });
      };

      // 1. Sheet 1: TOBILLED
      populateSheet('TOBILLED', (t) => {
        const s = String(t.topay || '').trim().toUpperCase();
        return s === 'TOBILLED' || s === 'TO-BILLED' || s === 'TO-PAY' || s === 'TO BILLED' || s === '';
      });

      // 2. Sheet 2: A_TOPAY
      populateSheet('A_TOPAY', (t) => {
        const s = String(t.topay || '').trim().toUpperCase();
        return s === 'A/TO-PAY' || s === 'A/TO-BILLED' || s.startsWith('A');
      });

      // 3. Sheet 3: F_TOPAY
      populateSheet('F_TOPAY', (t) => {
        const s = String(t.topay || '').trim().toUpperCase();
        return s === 'F/TO-PAY' || s === 'F/TO-BILLED' || s.startsWith('F');
      });

      // 4. Sheet 4: Master Ledger (All)
      populateSheet('Master Ledger', null);

      // Export file using FileSaver
      const buf = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const nowStr = new Date().toISOString().slice(0, 10);
      saveAs(blob, `SR_Brokerage_Ledger_${nowStr}.xlsx`);

      if (typeof AppModule !== 'undefined') {
        AppModule.showToast('📊 Genuine 3-Sheet Excel (.xlsx) downloaded with TOBILLED, A_TOPAY & F_TOPAY sheets!');
      }
    } catch (err) {
      console.error('exportToExcel error:', err);
      alert('Error exporting Excel: ' + err.message);
    }
  },
  exportToCSV() {
    const list = DataManager.getAll();
    if (!list || list.length === 0) {
      alert('No data to export!');
      return;
    }

    const headers = [
      'SL NO', 'TRSP NAME', 'DATE', 'LR NO', 'TRUCK NO', 'FROM', 'TO',
      'ACCOUNT NO', 'IFSC CODE', 'PAYMENT MADE', 'FRIGHT', 'DATE', 'ToPayStatus',
      'T/M', 'ADVANCE', 'DATE 2', 'ADVANCE2', 'DATE3', 'ADVANCE3',
      'POD RECD Date', 'Cash on Delivery (COD) :A/Topay&Ftopay',
      'Pending Amount: Tobilled', 'Extra Amount', 'PM/PA Date',
      'P/M', 'Pending Amount', 'POD Amount Status', 'REMARKS / NOTE'
    ];

    const rows = list.map(t => {
      const calc = CalculationEngine.calculate(t);
      return [
        `"${t.slNo || ''}"`,
        `"${(t.trspName || '').replace(/"/g, '""')}"`,
        `"${t.date || '—'}"`,
        `"${t.lrNo || ''}"`,
        `"${t.truckNo || ''}"`,
        `"${(t.from || '').replace(/"/g, '""')}"`,
        `"${(t.to || '').replace(/"/g, '""')}"`,
        `"${t.accountNo || ''}"`,
        `"${t.ifsc || ''}"`,
        `"${(t.paymentMade || '').replace(/"/g, '""')}"`,
        calc.fright || 0,
        `"${t.date1 || ''}"`,
        `"${(t.topay || '').replace(/"/g, '""')}"`,
        calc.tm || 0,
        calc.adv1 || 0,
        `"${t.date2 || ''}"`,
        calc.adv2 || 0,
        `"${t.date3 || ''}"`,
        calc.adv3 || 0,
        `"${(t.pod || '').replace(/"/g, '""')}"`,
        calc.cod || 0,
        calc.pendingTobilled || 0,
        calc.extraAmount || 0,
        `"${t.payDate || ''}"`,
        calc.pm || 0,
        calc.finalBalc || 0,
        calc.podAmountStatus || 0,
        `"${(t.note || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SR_Brokerage_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (typeof AppModule !== 'undefined') {
      AppModule.showToast('📊 Ledger exported to CSV/Excel successfully!');
    }
  }
};

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
