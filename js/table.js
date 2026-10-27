/**
 * table.js - Spreadsheet Grid & Enterprise Trip Editor Renderer
 * SR Brokerage Ledger \u2022 Transport Brokerage Ledger Pvt Ltd
 * Fleet Logistics & Financial Accounts Management
 * Authoritative 28-Column Architecture (Columns A through AB)
 * Developed by Shravan Kumar
 */

const TableModule = {
  // ================= 3-SHEET VIEW CONTROLLER =================
  currentExcelSheet: 'TOBILLED', // 'all', 'TOBILLED', 'A/TO-PAY', 'F/TO-PAY'
  currentEditingId: null,

  switchExcelSheet(sheetType, element) {
    this.currentExcelSheet = sheetType;
    document.querySelectorAll('.excel-sheet-tab-btn').forEach(btn => btn.classList.remove('active'));
    if (element) {
      element.classList.add('active');
    } else {
      const activeBtn = document.getElementById(`sheetTab_${sheetType.toLowerCase().replace(/[^a-z0-9]/g, '')}`);
      if (activeBtn) activeBtn.classList.add('active');
    }

    const pill = document.getElementById('excelSheetInfoPill');
    if (pill) {
      if (sheetType === 'TOBILLED') {
        pill.innerHTML = '<span>\uD83D\uDCC4 Physical Worksheet: TOBILLED</span>';
      } else if (sheetType === 'A/TO-PAY') {
        pill.innerHTML = '<span>\uD83D\uDCB3 Physical Worksheet: A/TO-PAY</span>';
      } else if (sheetType === 'F/TO-PAY') {
        pill.innerHTML = '<span>\uD83D\uDE9A Physical Worksheet: F/TO-PAY</span>';
      } else {
        pill.innerHTML = '<span>\uD83D\uDCCB Master Ledger: All Worksheets</span>';
      }
    }

    const secTitle = document.getElementById('excelSectionTitle');
    if (secTitle) {
      if (sheetType === 'all') {
        secTitle.innerHTML = '<span>\uD83D\uDCCB</span> Section: ALL (All Worksheets)';
      } else {
        secTitle.innerHTML = `<span>\uD83D\uDCC4</span> Section: ${sheetType} (Active Physical Worksheet)`;
      }
    }

    const grid = document.querySelector('.excel-grid');
    if (grid) {
      grid.classList.remove('sheet-view-all', 'sheet-view-tobilled', 'sheet-view-atopay', 'sheet-view-ftopay');
      if (sheetType === 'TOBILLED') grid.classList.add('sheet-view-tobilled');
      else if (sheetType === 'A/TO-PAY') grid.classList.add('sheet-view-atopay');
      else if (sheetType === 'F/TO-PAY') grid.classList.add('sheet-view-ftopay');
      else grid.classList.add('sheet-view-all');
    }

    this.renderExcelView();
  },

  isFullscreen: false,
  toggleFullscreen() {
    this.isFullscreen = !this.isFullscreen;
    const tab = document.getElementById('viewExcel');
    const btn = document.getElementById('btnToggleFullscreen');
    
    if (this.isFullscreen) {
      tab?.classList.add('sheet-fullscreen-mode');
      document.body.classList.add('in-sheet-fullscreen');
      if (btn) {
        btn.innerHTML = '&#10006; Exit Full Screen';
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn-danger');
      }
      try {
        if (!document.fullscreenElement && tab?.requestFullscreen) {
          tab.requestFullscreen().catch(() => {});
        }
      } catch (e) {}
    } else {
      tab?.classList.remove('sheet-fullscreen-mode');
      document.body.classList.remove('in-sheet-fullscreen');
      if (btn) {
        btn.innerHTML = '&#9974; Full Screen';
        btn.classList.remove('btn-danger');
        btn.classList.add('btn-secondary');
      }
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      } catch (e) {}
    }
  },

  // ================= DYNAMIC FORM MODE CONTROLLER =================
  cleanIncompatibleFields(status) {
    const s = String(status || 'TOBILLED').trim().toUpperCase();
    if (s === 'F/TO-PAY') {
      const ids = ['m_advance1', 'm_date1', 'm_advance2', 'm_date2', 'm_advance3', 'm_date3', 'm_extraAmount', 'm_payDate', 'm_pm'];
      ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      const codIn = document.getElementById('m_cod');
      if (codIn) codIn.dataset.autoFilled = 'true';
    } else if (s === 'A/TO-PAY') {
      const ids = ['m_advance2', 'm_date2', 'm_advance3', 'm_date3', 'm_extraAmount', 'm_payDate', 'm_pm'];
      ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      const codIn = document.getElementById('m_cod');
      if (codIn) codIn.dataset.autoFilled = 'true';
    } else if (s === 'TOBILLED') {
      const codIn = document.getElementById('m_cod');
      if (codIn) {
        codIn.value = '';
        codIn.dataset.autoFilled = 'false';
      }
    }
  },

  clearSection(section) {
    if (section === 'shipment') {
      const isAdd = document.getElementById('m_isAdd')?.value === 'true';
      const today = new Date().toISOString().split('T')[0];
      const dateEl = document.getElementById('m_date');
      if (dateEl) dateEl.value = isAdd ? today : '';

      const trspEl = document.getElementById('m_trspName');
      if (trspEl) trspEl.value = '';

      const lrEl = document.getElementById('m_lrNo');
      if (lrEl) {
        lrEl.value = '';
        lrEl.style.borderColor = '';
        lrEl.style.backgroundColor = '';
      }
      const errSpan = document.getElementById('m_lrNoError');
      if (errSpan) {
        errSpan.innerText = '';
        errSpan.style.display = 'none';
      }

      const truckEl = document.getElementById('m_truckNo');
      if (truckEl) truckEl.value = '';

      const fromEl = document.getElementById('m_from');
      if (fromEl) fromEl.value = '';

      const toEl = document.getElementById('m_to');
      if (toEl) toEl.value = '';
      // SL NO (m_slNo) is intentionally preserved to maintain sequential ordering
    } else if (section === 'payment') {
      const ids = ['m_fright', 'm_tm', 'm_advance1', 'm_date1', 'm_advance2', 'm_date2', 'm_advance3', 'm_date3', 'm_cod', 'm_extraAmount', 'm_payDate', 'm_pm'];
      ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      const codIn = document.getElementById('m_cod');
      if (codIn) {
        codIn.dataset.autoFilled = 'true';
      }
      this.liveCalcModal();
    } else if (section === 'bank') {
      const ids = ['m_accountNo', 'm_ifsc', 'm_paymentMade', 'm_pod', 'm_note'];
      ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      this.handlePodDateChange();
    }
  },

  selectToPayStatus(status) {
    const topaySelect = document.getElementById('m_topay');
    if (topaySelect) {
      topaySelect.value = status;
    }
    const codInput = document.getElementById('m_cod');
    if (codInput) {
      codInput.dataset.autoFilled = 'true';
    }
    this.cleanIncompatibleFields(status);
    this.updateFormFieldsVisibility(status);
    this.liveCalcModal();
  },

  syncToPayFromSelect() {
    const topaySelect = document.getElementById('m_topay');
    const val = topaySelect ? topaySelect.value : 'TOBILLED';
    this.cleanIncompatibleFields(val);
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
        badge.innerText = '\uD83D\uDE9A F/TO-PAY Mode (Full To-Pay)';
        badge.style.background = '#fef3c7';
        badge.style.color = '#92400e';
      } else if (s === 'A/TO-PAY') {
        badge.innerText = '\uD83D\uDCB3 A/TO-PAY Mode (Adv To-Pay)';
        badge.style.background = '#d1fae5';
        badge.style.color = '#065f46';
      } else {
        badge.innerText = '\uD83D\uDCCB TOBILLED Mode';
        badge.style.background = '#dbeafe';
        badge.style.color = '#1e40af';
      }
    }

    // Helper: Enable & show active fields without clearing user-entered values
    const setFieldState = (containerId, inputId, isVisible, isNumeric = true) => {
      const container = document.getElementById(containerId);
      const input = document.getElementById(inputId);
      if (container) {
        container.style.display = isVisible ? '' : 'none';
      }
      if (input) {
        input.disabled = !isVisible;
        if (!isVisible) {
          input.classList.add('field-blocked');
        } else {
          input.classList.remove('field-blocked');
        }
      }
    };

    if (s === 'F/TO-PAY') {
      // Full To-Pay: Freight, T/M & COD apply.
      setFieldState('field_fright', 'm_fright', true, true);
      setFieldState('field_tm', 'm_tm', true, true);
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
      // Advance To-Pay: Freight, T/M, Advance 1 & Date, COD apply.
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
      // TOBILLED: Freight, T/M, Advances 1-3 & Dates, Extra Amount, PM/PA Date, P/M apply. COD is disabled & hidden.
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
      const shipmentId = /^[a-zA-Z0-9_-]{20,80}$/.test(String(t.id || '')) ? String(t.id) : '';

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
        ? `<span class="pod-missing-badge" ${shipmentId ? `onclick="TableModule.openEditModal('${shipmentId}', true)"` : ''} style="cursor:${shipmentId ? 'pointer' : 'not-allowed'};" title="${shipmentId ? 'Click to enter POD date' : 'Run the reviewed shipment ID migration first'}">\u26A0\uFE0F Missing</span>`
        : `<span class="pod-received-text">${escapeHtml(t.pod)}</span>`;

      // Role-based delete action
      const deleteBtnHtml = canDel
        ? `<button class="btn-action-del" ${shipmentId ? `onclick="TableModule.deleteTripRecord('${shipmentId}', '${escapeHtml(t.sheetName || '')}')"` : 'disabled'} title="${shipmentId ? 'Delete Trip (Admin Only)' : 'Run the reviewed shipment ID migration first'}">\uD83D\uDDD1\uFE0F</button>`
        : `<button class="btn-action-del disabled" title="Delete restricted to Admin" disabled>\uD83D\uDD12</button>`;

      const rawPodStatus = String(t.podAmountStatus || calc.podAmountStatus || '').trim().toUpperCase();
      const isPodDone = rawPodStatus === 'DONE' || (!calc.isPodMissing && (t.podAmountStatus === 0 || t.podAmountStatus === '0' || rawPodStatus === 'DONE'));
      const podStatusHtml = isPodDone
        ? `<span class="badge-pod-done" style="background:#dcfce7; color:#15803d; font-weight:700; padding:2px 8px; border-radius:12px; font-size:0.75rem;">\u2705 DONE</span>`
        : `<span class="badge-pod-pending" style="background:#fef3c7; color:#92400e; font-weight:700; padding:2px 8px; border-radius:12px; font-size:0.75rem;">\u23F3 PENDING</span>`;

      tr.innerHTML = `
        <td class="col-center" style="font-weight:700; color:#475569;">${t.slNo || ''}</td>
        <td style="font-weight:600; color:#0f172a;">${escapeHtml(t.trspName || '')}</td>
        <td class="col-center">${t.date || '\u2014'}</td>
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
        <td>${escapeHtml(t.note || '')}</td>
        <td class="col-center" style="white-space:nowrap;">
          <button class="btn btn-secondary btn-sm" ${shipmentId ? `onclick="TableModule.openEditModal('${shipmentId}')"` : 'disabled'} title="${shipmentId ? 'Edit Details' : 'Run the reviewed shipment ID migration first'}">\u270F\uFE0F Edit</button>
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

    const sumPill = document.getElementById('excelHeaderSummaryPill');
    if (sumPill) {
      sumPill.innerText = `Total Freight: ${CalculationEngine.formatCurrency(totF, false)} (${displayedTrips.length} Shipments)`;
    }
  },

  // ================= ENTERPRISE TRIP EDIT VIEW =================
  renderTripEditView() {
    const container = document.getElementById('tripEditContainer');
    if (!container) return;
    container.innerHTML = '';

    const canDel = (typeof AuthModule !== 'undefined') ? AuthModule.canDelete() : true;

    // Direct Cards Grid \u2014 Single Add Trip button in shared toolbar
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
      const shipmentId = /^[a-zA-Z0-9_-]{20,80}$/.test(String(t.id || '')) ? String(t.id) : '';
      const card = document.createElement('div');
      card.className = `trip-card ${calc.isPodMissing ? 'card-pod-missing' : ''}`;

      const podBadge = calc.isPodMissing
        ? `<span class="pod-missing-badge" ${shipmentId ? `onclick="TableModule.openEditModal('${shipmentId}', true)"` : ''} style="cursor:${shipmentId ? 'pointer' : 'not-allowed'};" title="${shipmentId ? 'Click to enter POD date' : 'Run the reviewed shipment ID migration first'}">\u26A0\uFE0F POD Missing (Click to Enter)</span>`
        : `<span class="pod-ok-badge">\u2705 Received: ${escapeHtml(t.pod)}</span>`;

      const deleteBtn = canDel
        ? `<button class="btn btn-danger-soft btn-sm" ${shipmentId ? `onclick="TableModule.deleteTripRecord('${shipmentId}', '${escapeHtml(t.sheetName || '')}')"` : 'disabled'}>\uD83D\uDDD1\uFE0F Delete</button>`
        : `<span class="role-restricted-tag" title="Only Admin can delete">\uD83D\uDD12 Admin Delete</span>`;

      card.innerHTML = `
        <!-- Card Top Bar -->
        <div class="trip-card-top">
          <div class="trip-card-sl-tag">#${t.slNo || ''}</div>
          <div style="flex: 1; margin-left: 8px;">
            <div class="trip-card-transporter">${escapeHtml(t.trspName || 'Unassigned Transporter')}</div>
            <div class="trip-card-date">Trip Date: <strong>${t.date || '\u2014'}</strong></div>
          </div>
          <div class="trip-card-lr-badge">
            LR: ${escapeHtml(t.lrNo || '\u2014')}
          </div>
        </div>

        <!-- Route Indicator -->
        <div class="trip-route-banner">
          <div class="route-point origin-point">
            <span class="route-city-text">${escapeHtml(t.from || 'Origin')}</span>
          </div>
          <div class="route-connector">
            <div class="route-line-bar"></div>
            <span class="route-truck-icon">\uD83D\uDE9B</span>
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
              <span class="truck-plate-num">${escapeHtml(t.truckNo || '\u2014')}</span>
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
            <strong style="color:#0369a1;">\u20B9${Number(calc.extraAmount).toLocaleString('en-IN')}</strong>
          </div>
        ` : ''}

        <!-- Card Action Footer -->
        <div class="trip-card-footer">
          <div>${deleteBtn}</div>
          <button class="btn btn-primary btn-sm" ${shipmentId ? `onclick="TableModule.openEditModal('${shipmentId}')"` : 'disabled'}>
            \u270F\uFE0F Edit Details
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

    const hubSuggestions = ['MEDCHAL', 'WARANGAL', 'HYDERABAD', 'RAIPUR', 'LUCKNOW', 'PANKANJUR', 'MADHAPURA', 'NAGPUR', 'MUMBAI'];
    const uniqueTrsp = [...new Set(trips.map(t => (t.trspName || '').trim()).filter(Boolean))];
    const uniqueTrucks = [...new Set(trips.map(t => (t.truckNo || '').trim().toUpperCase()).filter(Boolean))];
    const uniqueFrom = [...new Set([...trips.map(t => (t.from || '').trim().toUpperCase()), ...hubSuggestions].filter(Boolean))];
    const uniqueTo = [...new Set([...trips.map(t => (t.to || '').trim().toUpperCase()), ...hubSuggestions].filter(Boolean))];
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
          <span>\uD83D\uDE9B ${escapeHtml(p.trspName)} <strong style="color: #0284c7; font-family: monospace;">(${escapeHtml(p.truckNo || '\u2014')})</strong></span>
          <span style="font-size: 0.72rem; color: #16a34a; font-weight: 700;">Trip #${p.slNo || ''}</span>
        </div>
        <div class="autofill-item-sub">
\uD83D\uDCCD Route: <strong>${escapeHtml(p.from)} \u2794 ${escapeHtml(p.to || 'Any')}</strong> | \uD83C\uDFE6 Bank: ${escapeHtml(p.paymentMade)} (A/C: ${escapeHtml(p.accountNo || '\u2014')} | IFSC: ${escapeHtml(p.ifsc || '\u2014')})
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
      AppModule.showToast(`\u26A1 Autofilled Bank & Route details for ${p.trspName}!`);
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
      match = trips.slice().reverse().find(t => (t.trspName || '').trim().toUpperCase() === cleanVal) ||
              trips.slice().reverse().find(t => (t.trspName || '').trim().toUpperCase().startsWith(cleanVal)) ||
              trips.slice().reverse().find(t => (t.trspName || '').trim().toUpperCase().includes(cleanVal));
    } else if (field === 'truckNo') {
      match = trips.slice().reverse().find(t => (t.truckNo || '').trim().toUpperCase() === cleanVal) ||
              trips.slice().reverse().find(t => (t.truckNo || '').trim().toUpperCase().startsWith(cleanVal));
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
      // Route & vehicle fields: preserve manually typed values; only populate when completely empty
      if (fromInput && !fromInput.value.trim()) fromInput.value = match.from || '';
      if (toInput && !toInput.value.trim()) toInput.value = match.to || '';
      if (field === 'truckNo' && trspInput && !trspInput.value.trim()) trspInput.value = match.trspName || '';
      if (field === 'trspName' && truckInput && !truckInput.value.trim()) truckInput.value = match.truckNo || '';
    }
  },

  handlePodDateChange() {
    const podVal = (document.getElementById('m_pod')?.value || '').trim();
    const statusEl = document.getElementById('m_podAmountStatus');
    if (statusEl) {
      if (podVal && podVal !== '') {
        statusEl.value = 'DONE';
        statusEl.style.color = '#15803d';
        statusEl.style.backgroundColor = '#f0fdf4';
      } else {
        statusEl.value = 'PENDING';
        statusEl.style.color = '#92400e';
        statusEl.style.backgroundColor = '#fef3c7';
      }
    }
    this.liveCalcModal();
  },

  handlePodStatusChange() {
    const statusEl = document.getElementById('m_podAmountStatus');
    if (statusEl) {
      if (statusEl.value === 'DONE') {
        statusEl.style.color = '#15803d';
        statusEl.style.backgroundColor = '#f0fdf4';
      } else {
        statusEl.style.color = '#92400e';
        statusEl.style.backgroundColor = '#fef3c7';
      }
    }
  },

  openEditModal(shipmentId, focusPod = false) {
    const trip = DataManager.getTrip(shipmentId);
    if (!trip || !trip.id) {
      if (typeof AppModule !== 'undefined') AppModule.showToast('Run the reviewed shipment ID migration before editing existing records.');
      return;
    }
    this.currentEditingId = trip.id;

    document.getElementById('modalTitle').innerText = `\u270F\uFE0F Edit Trip (SL NO: ${trip.slNo || trip.row})`;
    document.getElementById('m_editRow').value = trip.row;
    document.getElementById('m_isAdd').value = 'false';
    document.getElementById('m_sourceSheet').value = trip.sheetName || '';

    // Dedicated button: "Save Changes" for Edit
    const submitBtn = document.getElementById('m_submitBtn');
    if (submitBtn) submitBtn.innerText = '\uD83D\uDCBE Save Changes';

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
      const isDone = (curStatus === 'DONE' || trip.pod);
      podStatusEl.value = isDone ? 'DONE' : 'PENDING';
      podStatusEl.style.color = isDone ? '#15803d' : '#92400e';
      podStatusEl.style.backgroundColor = isDone ? '#f0fdf4' : '#fef3c7';
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
    this.currentEditingId = DataManager.createShipmentId();

    document.getElementById('modalTitle').innerText = '\u2795 Add New Shipment';
    document.getElementById('m_editRow').value = 0;
    document.getElementById('m_isAdd').value = 'true';
    document.getElementById('m_sourceSheet').value = '';
    const podStatusAddEl = document.getElementById('m_podAmountStatus');
    if (podStatusAddEl) {
      podStatusAddEl.value = 'PENDING';
      podStatusAddEl.style.color = '#92400e';
      podStatusAddEl.style.backgroundColor = '#fef3c7';
    }

    // Dedicated button: "Submit / Add Shipment" for Add
    const submitBtn = document.getElementById('m_submitBtn');
    if (submitBtn) submitBtn.innerText = '\u2795 Submit / Add Shipment';

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
    document.getElementById('m_from').value = '';
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
    this.currentEditingId = null;
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

    const sourceSheet = document.getElementById('m_sourceSheet')?.value || null;
    const duplicate = (typeof DataManager !== 'undefined') ? DataManager.isDuplicateLr(lrVal, isAdd ? null : rowNum, isAdd ? null : sourceSheet) : null;

    if (duplicate) {
      lrInput.style.borderColor = '#ef4444';
      lrInput.style.backgroundColor = '#fef2f2';
      if (errSpan) {
        errSpan.innerText = `\u26A0\uFE0F Duplicate (Trip #${duplicate.slNo})`;
        errSpan.style.color = '#ef4444';
        errSpan.style.display = 'inline';
      }
      return false;
    } else {
      lrInput.style.borderColor = '#22c55e';
      lrInput.style.backgroundColor = '';
      if (errSpan) {
        errSpan.innerText = '\u2705 Unique LR';
        errSpan.style.color = '#15803d';
        errSpan.style.display = 'inline';
      }
      return true;
    }
  },

  handleUppercaseInput(el) {
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    el.value = el.value.toUpperCase();
    if (start !== null && end !== null) {
      el.setSelectionRange(start, end);
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

    const tm = getVal('m_tm');
    const advance1 = (topayVal.startsWith('F')) ? 0 : getVal('m_advance1');
    const advance2 = (topayVal === 'TOBILLED') ? getVal('m_advance2') : 0;
    const advance3 = (topayVal === 'TOBILLED') ? getVal('m_advance3') : 0;
    const extraAmount = (topayVal === 'TOBILLED') ? getVal('m_extraAmount') : 0;
    const pm = (topayVal === 'TOBILLED') ? getVal('m_pm') : 0;
    const codInput = document.getElementById('m_cod');
    const isCodAuto = codInput ? (codInput.dataset.autoFilled === 'true' || !codInput.dataset.autoFilled) : true;
    const userCod = (codInput && !codInput.disabled) ? (Number(codInput.value) || 0) : 0;

    const dummy = {
      fright,
      topay: topayVal,
      tm,
      advance1,
      advance2,
      advance3,
      extraAmount,
      cod: isCodAuto ? 0 : userCod,
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
      // Auto-fill COD field ONLY if auto-filled mode is active AND user is not actively editing it
      if (codInput) {
        if (isCodAuto && document.activeElement !== codInput) {
          codInput.value = calc.cod > 0 ? calc.cod : '';
          codInput.dataset.autoFilled = 'true';
        }
      }
    } else {
      if (mCodBox) mCodBox.style.display = 'none';
      if (codInput) {
        codInput.value = '';
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

  async handleSaveModal(e) {
    if (e) e.preventDefault();
    if (this._isSaving) return;
    this._isSaving = true;

    const rowNum = parseInt(document.getElementById('m_editRow').value) || 0;
    const isAdd = document.getElementById('m_isAdd').value === 'true';
    const lrNo = document.getElementById('m_lrNo').value.trim();

    // Inline LR NO required validation (no alert)
    if (!lrNo) {
      this._isSaving = false;
      const lrInput = document.getElementById('m_lrNo');
      if (lrInput) { lrInput.style.borderColor = '#ef4444'; lrInput.focus(); }
      const errSpan = document.getElementById('m_lrNoError');
      if (errSpan) { errSpan.innerText = '\u26A0\uFE0F LR NO is required.'; errSpan.style.color = '#ef4444'; errSpan.style.display = 'inline'; }
      return;
    }

    // Strict Duplicate LR NO Enforcement (inline, no alert)
    const sourceSheet = document.getElementById('m_sourceSheet')?.value || null;
    const duplicate = (typeof DataManager !== 'undefined') ? DataManager.isDuplicateLr(lrNo, isAdd ? null : rowNum, isAdd ? null : sourceSheet) : null;

    if (duplicate) {
      this._isSaving = false;
      const lrInput = document.getElementById('m_lrNo');
      if (lrInput) {
        lrInput.style.borderColor = '#ef4444';
        lrInput.style.backgroundColor = '#fef2f2';
        lrInput.focus();
      }
      const errSpan = document.getElementById('m_lrNoError');
      if (errSpan) {
        // Duplicate LR NO Error: LR is already in use
        errSpan.innerText = `\u26A0\uFE0F Duplicate LR NO Error: already used by Trip #${duplicate.slNo} (${duplicate.trspName})`;
        errSpan.style.color = '#ef4444';
        errSpan.style.display = 'inline';
      }
      return;
    }

    // Determine strict normalized status and clean non-applicable fields
    const rawTopay = String(document.getElementById('m_topay').value || '').trim().toUpperCase();
    const allowedStatuses = ['TOBILLED', 'A/TO-PAY', 'F/TO-PAY'];
    if (!allowedStatuses.includes(rawTopay)) {
      this._isSaving = false;
      if (typeof AppModule !== 'undefined') AppModule.showToast('Choose a supported shipment status.');
      return;
    }
    const normalizedTopay = rawTopay;

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
      tmVal = Number(document.getElementById('m_tm').value) || 0;
      codVal = frightVal;
      // All other advances, Extra, PM are strictly 0 and blank dates
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

    const podStatusSelected = document.getElementById('m_podAmountStatus')?.value || 'PENDING';

    const tripData = {
      id: this.currentEditingId || (isAdd ? DataManager.createShipmentId() : ''),
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
    tripData.isAdd = isAdd;
    const hasValidPodDate = Boolean(tripData.pod && !/^(pending|na|empty|if date.*)$/i.test(tripData.pod));
    if (normalizedTopay === 'TOBILLED') {
      tripData.podAmountStatus = (hasValidPodDate && (calc.finalBalc <= 0 || podStatusSelected === 'DONE')) ? 'DONE' : 'PENDING';
    } else {
      tripData.podAmountStatus = hasValidPodDate ? 'DONE' : 'PENDING';
    }

    // Keep the form intact until the cloud confirms the write.
    const submitBtn = document.getElementById('m_submitBtn');
    const origBtnText = submitBtn ? submitBtn.innerText : '';
    if (submitBtn) { submitBtn.disabled = true; submitBtn.innerText = 'Saving...'; }

    const doSave = async () => {
      let cloudSaveConfirmed = false;
      let localCacheUpdated = false;
      try {
        if (typeof ApiService === 'undefined' || !ApiService.isCloudConnected()) {
          throw new Error('Cloud API is not configured. The shipment was not saved.');
        }
        const result = await ApiService.saveTrip(tripData);
        if (!result || result.status !== 'success') {
          throw new Error(result && result.message ? result.message : 'Cloud save was rejected.');
        }
        cloudSaveConfirmed = true;

        const savedTrip = {
          ...tripData,
          id: result.id || tripData.id,
          row: result.rowNum || rowNum,
          sheetName: result.sheetName || tripData.sheetName,
          sourceSheet: result.sheetName || tripData.sheetName,
          isAdd: false
        };
        const trips = DataManager.getAll();
        const existingIndex = trips.findIndex(item => String(item.id || '') === String(savedTrip.id));
        if (existingIndex >= 0) trips[existingIndex] = savedTrip;
        else trips.push(savedTrip);
        DataManager.saveAll(trips);
        localCacheUpdated = true;
        this.closeModal();
        if (typeof AppModule !== 'undefined') {
          AppModule.refresh();
          AppModule.showToast(isAdd ? '\u2795 Shipment saved to Google Sheets.' : '\uD83D\uDCBE Changes saved to Google Sheets.');
          await AppModule.syncNow(true);
        }
      } catch (error) {
        if (cloudSaveConfirmed) {
          console.error('Cloud save succeeded but follow-up local processing failed:', error);
          this.closeModal();
          if (typeof AppModule !== 'undefined') {
            AppModule.showToast(localCacheUpdated
              ? 'Shipment was saved to Google Sheets, but the follow-up sync failed. Refresh the ledger.'
              : 'Shipment was saved to Google Sheets, but the local cache could not update. Refresh the ledger.');
          }
        } else if (typeof AppModule !== 'undefined') {
          AppModule.showToast(`\u274C Save failed: ${error.message}`);
        }
      } finally {
        this._isSaving = false;
        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = origBtnText; }
      }
    };

    doSave();
  },

  async deleteTripRecord(shipmentId, optSheetName = null) {
    if (typeof AuthModule !== 'undefined' && !AuthModule.canDelete()) {
      if (typeof AppModule !== 'undefined') {
        AppModule.showToast('\uD83D\uDEAB Access Restricted: Only Administrator can delete trips.');
      }
      return;
    }

    if (this._isDeleting) return; // Concurrency lock against rapid duplicate clicks

    const targetTrip = (typeof DataManager !== 'undefined') ? DataManager.getTrip(shipmentId) : null;
    if (!targetTrip || !targetTrip.id) {
      if (typeof AppModule !== 'undefined') AppModule.showToast('Cannot identify the selected shipment. Refresh the ledger and retry.');
      return;
    }
    if (optSheetName && String(targetTrip.sheetName || '').trim() !== String(optSheetName).trim()) {
      if (typeof AppModule !== 'undefined') AppModule.showToast('The shipment moved to another worksheet. Refresh the ledger and retry.');
      return;
    }
    const targetSheetName = physicalSheetNameForStatus(targetTrip.topay);
    const targetLrNo = targetTrip?.lrNo || '';

    if (!confirm(`Are you sure you want to delete trip LR "${targetTrip.lrNo || shipmentId}"? This action cannot be undone.`)) {
      return;
    }

    this._isDeleting = true;

    if (typeof ApiService !== 'undefined' && ApiService.isCloudConnected() && window.navigator.onLine) {
      if (typeof AppModule !== 'undefined') {
        AppModule.showToast('\u23F3 Deleting record from Google Sheets...');
      }
      let cloudDeleteConfirmed = false;
      try {
        const res = await ApiService.deleteTrip(targetTrip.id, targetSheetName, targetLrNo);
        if (res && res.status === 'success') {
          cloudDeleteConfirmed = true;
          const syncResult = await ApiService.fetchAll();
          if (typeof AppModule !== 'undefined') {
            if (syncResult && syncResult.status === 'success' && syncResult.source === 'cloud') {
              AppModule.refresh();
              AppModule.updateCloudSyncBadge(true);
              AppModule.showToast('\uD83D\uDDD1\uFE0F Trip deleted successfully from Google Sheets.');
            } else {
              AppModule.updateCloudSyncBadge(false, true, false);
              AppModule.showToast('Trip was deleted from Google Sheets, but the local ledger could not refresh. Sync before continuing.');
            }
          }
        } else {
          const msg = (res && res.message) ? res.message : 'Cloud deletion rejected by server';
          alert('Delete failed: ' + msg);
          if (typeof AppModule !== 'undefined') {
            AppModule.showToast('\u274C ' + msg);
          }
        }
      } catch (err) {
        if (cloudDeleteConfirmed) {
          console.error('Cloud deletion succeeded but local refresh failed:', err);
          if (typeof AppModule !== 'undefined') AppModule.showToast('Trip was deleted from Google Sheets, but the local ledger could not refresh. Sync before continuing.');
        } else {
          alert('Network error during deletion: ' + err.message);
          if (typeof AppModule !== 'undefined') AppModule.showToast('\u274C Network error during deletion');
        }
      } finally {
        this._isDeleting = false;
      }
    } else {
      if (typeof AppModule !== 'undefined') AppModule.showToast('Connect to the cloud ledger before deleting. No record was removed.');
      this._isDeleting = false;
    }
  },

  // ================= EXCEL (.XLSX) EXPORT WITH 28 COLUMNS & PRESERVED CELL COLORS =================
  async ensureCloudDataForExport() {
    if (typeof ApiService === 'undefined' || typeof AuthModule === 'undefined' ||
        !AuthModule.getSessionToken()) {
      if (typeof AppModule !== 'undefined') AppModule.showToast('Sign in before exporting ledger data.');
      return false;
    }
    if (!window.navigator.onLine) {
      if (typeof AppModule !== 'undefined') AppModule.showToast('Export cancelled: connect to the cloud to verify the latest ledger data.');
      return false;
    }

    try {
      const result = await ApiService.fetchAll();
      if (!result || result.status !== 'success' || result.source !== 'cloud') {
        if (typeof AppModule !== 'undefined') {
          AppModule.updateCloudSyncBadge(false, true, false);
          AppModule.showToast('Export cancelled: latest cloud data could not be verified.');
        }
        return false;
      }
      if (typeof AppModule !== 'undefined') {
        AppModule.refresh();
        AppModule.updateCloudSyncBadge(true);
      }
      return true;
    } catch (error) {
      console.error('Cloud verification failed before export:', error);
      if (typeof AppModule !== 'undefined') AppModule.showToast('Export cancelled: latest cloud data could not be verified.');
      return false;
    }
  },

  async exportToExcel() {
    if (typeof ExcelJS === 'undefined') {
      console.warn('ExcelJS not loaded, falling back to CSV export.');
      return this.exportToCSV();
    }

    if (!await this.ensureCloudDataForExport()) return;

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
        AppModule.showToast('\uD83D\uDCCA Genuine 3-Sheet Excel (.xlsx) downloaded with TOBILLED, A_TOPAY & F_TOPAY sheets!');
      }
    } catch (err) {
      console.error('exportToExcel error:', err);
      alert('Error exporting Excel: ' + err.message);
    }
  },
  async exportToCSV() {
    if (!await this.ensureCloudDataForExport()) return;
    let list;
    try {
      list = DataManager.getAll();
    } catch (error) {
      console.error('Could not read the verified ledger for CSV export:', error);
      if (typeof AppModule !== 'undefined') AppModule.showToast('CSV export cancelled: the local cache could not be read.');
      return;
    }
    if (!list || list.length === 0) {
      alert('No data to export!');
      return;
    }

    const csvText = value => {
      let text = String(value === null || value === undefined ? '' : value);
      if (/^[\t\r\n ]*[=+\-@]/.test(text)) text = `'${text}`;
      return `"${text.replace(/"/g, '""')}"`;
    };

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
        csvText(t.slNo),
        csvText(t.trspName),
        csvText(t.date || '\u2014'),
        csvText(t.lrNo),
        csvText(t.truckNo),
        csvText(t.from),
        csvText(t.to),
        csvText(t.accountNo),
        csvText(t.ifsc),
        csvText(t.paymentMade),
        calc.fright || 0,
        csvText(t.date1),
        csvText(t.topay),
        calc.tm || 0,
        calc.adv1 || 0,
        csvText(t.date2),
        calc.adv2 || 0,
        csvText(t.date3),
        calc.adv3 || 0,
        csvText(t.pod),
        calc.cod || 0,
        calc.pendingTobilled || 0,
        calc.extraAmount || 0,
        csvText(t.payDate),
        calc.pm || 0,
        calc.finalBalc || 0,
        calc.podAmountStatus || 0,
        csvText(t.note)
      ].join(',');
    });

    const csvBlob = new Blob([headers.join(',') + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const csvUrl = URL.createObjectURL(csvBlob);
    const link = document.createElement('a');
    link.setAttribute('href', csvUrl);
    link.setAttribute('download', `SR_Brokerage_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(csvUrl), 1000);

    if (typeof AppModule !== 'undefined') {
      AppModule.showToast('\uD83D\uDCCA Ledger exported to CSV/Excel successfully!');
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
