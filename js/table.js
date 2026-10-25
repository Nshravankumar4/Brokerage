/**
 * table.js - Spreadsheet Grid & Enterprise Trip Editor Renderer
 * Handles:
 *  - 1:1 Clean Excel View (No artificial yellow rows, starts at SL NO Col A)
 *  - Premium Trip Edit Cards View (Single Add Trip button, no duplicate header)
 *  - Role-Based Edit & Delete Permissions (Admin can delete; Employee edit only)
 *  - Add/Edit Trip Modal with "Submit Trip" (Add) vs "Save Changes" (Edit)
 *  - Excel-compatible CSV Export
 */

const TableModule = {
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

  // ================= 1:1 CLEAN EXCEL SPREADSHEET VIEW =================
  renderExcelView() {
    const tbody = document.getElementById('excelTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    let totF = 0, totTM = 0, totA1 = 0, totA2 = 0, totA3 = 0, totCOD = 0, totPM = 0, totB = 0, totPF = 0, totFB = 0;
    const canDel = (typeof AuthModule !== 'undefined') ? AuthModule.canDelete() : true;

    this.activeTrips.forEach((t) => {
      const calc = CalculationEngine.calculate(t);

      totF += calc.fright;
      totTM += calc.tm;
      totA1 += calc.adv1;
      totA2 += calc.adv2;
      totA3 += calc.adv3;
      totCOD += calc.cod;
      totPM += calc.pm;
      totB += calc.balc;
      totPF += calc.pmFinal;
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

      tr.innerHTML = `
        <td class="col-center" style="font-weight:700; color:#475569;">${t.slNo || ''}</td>
        <td style="font-weight:600; color:#0f172a;">${escapeHtml(t.trspName || '')}</td>
        <td class="col-center">${t.date || ''}</td>
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
        <td class="col-right col-bold">${CalculationEngine.formatCurrency(calc.cod, false)}</td>
        <td class="col-right">${CalculationEngine.formatCurrency(calc.pm, false)}</td>
        <td class="col-center">${t.payDate || ''}</td>
        <td class="col-right col-bold" style="background:#fef9c3;">${CalculationEngine.formatCurrency(calc.balc, false)}</td>
        <td class="col-right">${CalculationEngine.formatCurrency(calc.pmFinal, false)}</td>
        <td class="col-right col-bold" style="background:#fee2e2; color:${calc.finalBalc > 0 ? '#b91c1c' : '#15803d'};">
          ${CalculationEngine.formatCurrency(calc.finalBalc, false)}
        </td>
        <td class="col-center">${podCellHtml}</td>
        <td style="font-size:0.78rem;">${escapeHtml(t.note || '')}</td>
        <td class="col-center" style="white-space:nowrap;">
          <button class="btn btn-secondary btn-sm" onclick="TableModule.openEditModal(${t.row})" title="Edit Details">✏️ Edit</button>
          ${deleteBtnHtml}
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Update Bottom Sum Totals
    document.getElementById('totFreight').innerText = CalculationEngine.formatCurrency(totF, false);
    document.getElementById('totTM').innerText = CalculationEngine.formatCurrency(totTM, false);
    document.getElementById('totAdv1').innerText = CalculationEngine.formatCurrency(totA1, false);
    document.getElementById('totAdv2').innerText = CalculationEngine.formatCurrency(totA2, false);
    document.getElementById('totAdv3').innerText = CalculationEngine.formatCurrency(totA3, false);
    document.getElementById('totCOD').innerText = CalculationEngine.formatCurrency(totCOD, false);
    document.getElementById('totPM').innerText = CalculationEngine.formatCurrency(totPM, false);
    document.getElementById('totBalc').innerText = CalculationEngine.formatCurrency(totB, false);
    document.getElementById('totPMFinal').innerText = CalculationEngine.formatCurrency(totPF, false);
    document.getElementById('totFinalBalc').innerText = CalculationEngine.formatCurrency(totFB, false);
  },

  // ================= ENTERPRISE TRIP EDIT VIEW =================
  renderTripEditView() {
    const container = document.getElementById('tripEditContainer');
    if (!container) return;
    container.innerHTML = '';

    const canDel = (typeof AuthModule !== 'undefined') ? AuthModule.canDelete() : true;

    // Direct Cards Grid — NO redundant second header and NO duplicate Add button!
    const cardsGrid = document.createElement('div');
    cardsGrid.className = 'trip-cards-grid';

    this.activeTrips.forEach((t) => {
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
          <span class="route-point">${escapeHtml(t.from || 'Origin')}</span>
          <span class="route-line">── 🚛 ──&gt;</span>
          <span class="route-point">${escapeHtml(t.to || 'Destination')}</span>
        </div>

        <!-- Vehicle & To-Billed Status -->
        <div class="trip-details-row">
          <div>
            <span class="trip-detail-label">Truck No:</span>
            <span class="truck-plate">${escapeHtml(t.truckNo || '—')}</span>
          </div>
          <div style="text-align: right;">
            <span class="trip-detail-label">ToPayStatus:</span>
            <span class="topay-tag ${t.topay ? 'has-topay' : ''}">${escapeHtml(t.topay || 'TOBILLED')}</span>
          </div>
        </div>

        <!-- Financial Summary -->
        <div class="trip-financial-grid">
          <div class="fin-box">
            <span class="fin-label">FREIGHT (K)</span>
            <span class="fin-val fin-fright">${CalculationEngine.formatCurrency(calc.fright)}</span>
          </div>
          <div class="fin-box">
            <span class="fin-label">ADVANCES (O+Q+S)</span>
            <span class="fin-val fin-adv">${CalculationEngine.formatCurrency(calc.totalAdvances)}</span>
          </div>
          <div class="fin-box highlight-balc">
            <span class="fin-label">FINAL BALC (Y)</span>
            <span class="fin-val fin-final">${CalculationEngine.formatCurrency(calc.finalBalc)}</span>
          </div>
        </div>

        <!-- POD Status Pill -->
        <div class="trip-card-pod-row">
          <span style="font-size: 0.76rem; color: #64748b; font-weight: 700;">POD Delivery Status:</span>
          <div>${podBadge}</div>
        </div>

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

  openEditModal(rowNum, focusPod = false) {
    const trip = DataManager.getTrip(rowNum);
    if (!trip) return;

    document.getElementById('modalTitle').innerText = `✏️ Edit Trip (SL NO: ${trip.slNo || trip.row})`;
    document.getElementById('m_editRow').value = trip.row;
    document.getElementById('m_isAdd').value = 'false';

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
    document.getElementById('m_fright').value = (trip.fright !== undefined && trip.fright !== null && trip.fright !== '') ? trip.fright : 0;
    
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

    document.getElementById('m_tm').value = (trip.tm !== undefined && trip.tm !== null && trip.tm !== '') ? trip.tm : 0;
    document.getElementById('m_advance1').value = (trip.advance1 !== undefined && trip.advance1 !== null && trip.advance1 !== '') ? trip.advance1 : 0;
    document.getElementById('m_date1').value = this.toInputDate(trip.date1);
    document.getElementById('m_advance2').value = (trip.advance2 !== undefined && trip.advance2 !== null && trip.advance2 !== '') ? trip.advance2 : 0;
    document.getElementById('m_date2').value = this.toInputDate(trip.date2);
    document.getElementById('m_advance3').value = (trip.advance3 !== undefined && trip.advance3 !== null && trip.advance3 !== '') ? trip.advance3 : 0;
    document.getElementById('m_date3').value = this.toInputDate(trip.date3);
    document.getElementById('m_cod').value = (trip.cod !== undefined && trip.cod !== null && trip.cod !== '') ? trip.cod : 0;
    document.getElementById('m_pm').value = (trip.pm !== undefined && trip.pm !== null && trip.pm !== '') ? trip.pm : 0;
    document.getElementById('m_pmFinal').value = (trip.pmFinal !== undefined && trip.pmFinal !== null && trip.pmFinal !== '') ? trip.pmFinal : 0;
    document.getElementById('m_payDate').value = this.toInputDate(trip.payDate);
    document.getElementById('m_pod').value = this.toInputDate(trip.pod);
    document.getElementById('m_note').value = trip.note || '';

    this.liveCalcModal();
    document.getElementById('editModal').style.display = 'flex';

    if (focusPod) {
      setTimeout(() => {
        const podInput = document.getElementById('m_pod');
        if (podInput) podInput.focus();
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
    document.getElementById('m_fright').value = 0;
    document.getElementById('m_topay').value = 'A/TO-PAY';
    document.getElementById('m_tm').value = 0;
    document.getElementById('m_advance1').value = 0;
    document.getElementById('m_date1').value = '';
    document.getElementById('m_advance2').value = 0;
    document.getElementById('m_date2').value = '';
    document.getElementById('m_advance3').value = 0;
    document.getElementById('m_date3').value = '';
    document.getElementById('m_cod').value = 0;
    document.getElementById('m_pm').value = 0;
    document.getElementById('m_pmFinal').value = 0;
    document.getElementById('m_payDate').value = '';
    document.getElementById('m_pod').value = '';
    document.getElementById('m_note').value = '';

    this.liveCalcModal();
    document.getElementById('editModal').style.display = 'flex';
  },

  closeModal() {
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
        errSpan.innerText = '✓ Unique LR';
        errSpan.style.color = '#15803d';
        errSpan.style.display = 'inline';
      }
      return true;
    }
  },

  liveCalcModal() {
    const dummy = {
      fright: Number(document.getElementById('m_fright').value) || 0,
      topay: document.getElementById('m_topay').value,
      tm: Number(document.getElementById('m_tm').value) || 0,
      advance1: Number(document.getElementById('m_advance1').value) || 0,
      advance2: Number(document.getElementById('m_advance2').value) || 0,
      advance3: Number(document.getElementById('m_advance3').value) || 0,
      cod: Number(document.getElementById('m_cod').value) || 0,
      pm: Number(document.getElementById('m_pm').value) || 0,
      pmFinal: Number(document.getElementById('m_pmFinal').value) || 0
    };

    const calc = CalculationEngine.calculate(dummy);

    document.getElementById('mRuleText').innerText = 'Rule Applied: ' + calc.ruleText;
    document.getElementById('mCalcBalc').innerText = CalculationEngine.formatCurrency(calc.balc);
    document.getElementById('mCalcFinalBalc').innerText = CalculationEngine.formatCurrency(calc.finalBalc);
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

    const tripData = {
      row: rowNum,
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
      fright: Number(document.getElementById('m_fright').value) || 0,
      topay: document.getElementById('m_topay').value.trim(),
      tm: Number(document.getElementById('m_tm').value) || 0,
      advance1: Number(document.getElementById('m_advance1').value) || 0,
      date1: this.toDisplayDate(document.getElementById('m_date1').value),
      advance2: Number(document.getElementById('m_advance2').value) || 0,
      date2: this.toDisplayDate(document.getElementById('m_date2').value),
      advance3: Number(document.getElementById('m_advance3').value) || 0,
      date3: this.toDisplayDate(document.getElementById('m_date3').value),
      cod: Number(document.getElementById('m_cod').value) || 0,
      pm: Number(document.getElementById('m_pm').value) || 0,
      payDate: this.toDisplayDate(document.getElementById('m_payDate').value),
      pmFinal: Number(document.getElementById('m_pmFinal').value) || 0,
      pod: this.toDisplayDate(document.getElementById('m_pod').value),
      note: document.getElementById('m_note').value.trim()
    };

    // Auto-calculate exact BALC (W) and FINAL BALC (Y) according to To-Billed condition before saving
    const calc = CalculationEngine.calculate(tripData);
    tripData.balc = calc.balc;
    tripData.finalBalc = calc.finalBalc;

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
      DataManager.deleteTrip(rowNum);
      if (typeof AppModule !== 'undefined') {
        AppModule.refresh();
        AppModule.showToast('🗑️ Trip deleted successfully.');
      }

      // Authoritative Cloud Sync to Google Sheets
      if (typeof ApiService !== 'undefined' && ApiService.isCloudConnected() && window.navigator.onLine) {
        ApiService.deleteTrip(rowNum).then(async (res) => {
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

  // ================= EXCEL-COMPATIBLE CSV EXPORT =================
    // ================= EXCEL (.XLSX) EXPORT WITH PRESERVED CELL COLORS =================
  async exportToExcel() {
    if (typeof ExcelJS === 'undefined') {
      console.warn('ExcelJS not loaded, falling back to CSV export.');
      return this.exportToCSV();
    }

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Transport Brokerage Ledger Pvt Ltd";
      workbook.created = new Date();

      const ws = workbook.addWorksheet('Broker Ledger', {
        views: [{ showGridLines: true }]
      });

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
        { header: 'To-Billed (COD)', key: 'cod', width: 15 },
        { header: 'P/M', key: 'pm', width: 11 },
        { header: 'DATE', key: 'payDate', width: 13 },
        { header: 'BALC', key: 'balc', width: 14 },
        { header: 'P/M', key: 'pmFinal', width: 11 },
        { header: 'FINAL BALC', key: 'finalBalc', width: 15 },
        { header: 'POD RECD', key: 'pod', width: 16 },
        { header: 'REMARKS / NOTE', key: 'note', width: 26 }
      ];

      ws.columns = colDefs;

      // Style Header Row (Row 1)
      const headerRow = ws.getRow(1);
      headerRow.height = 26;

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

      headerRow.eachCell((cell, colNumber) => {
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = thinBorder;

        // Custom Header colors matching Excel
        if (colNumber === 13) {
          cell.fill = greenFill; // Col M To-Billed
        } else if (colNumber === 15) {
          cell.fill = purpleFill; // Col O ADVANCE
        } else if (colNumber === 23) {
          cell.fill = yellowHeaderFill; // Col W BALC
        } else if (colNumber === 25 || colNumber === 26) {
          cell.fill = redHeaderFill; // Col Y FINAL BALC, Col Z POD
        } else {
          cell.fill = navyFill;
        }
      });

      // Data Rows
      let sumF = 0, sumTM = 0, sumA1 = 0, sumA2 = 0, sumA3 = 0, sumCOD = 0, sumPM = 0, sumB = 0, sumPF = 0, sumFB = 0;

      this.activeTrips.forEach((t) => {
        const calc = CalculationEngine.calculate(t);
        sumF += calc.fright;
        sumTM += calc.tm;
        sumA1 += calc.adv1;
        sumA2 += calc.adv2;
        sumA3 += calc.adv3;
        sumCOD += calc.cod;
        sumPM += calc.pm;
        sumB += calc.balc;
        sumPF += calc.pmFinal;
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
          cod: calc.cod || 0,
          pm: calc.pm || 0,
          payDate: t.payDate || '',
          balc: calc.balc || 0,
          pmFinal: calc.pmFinal || 0,
          finalBalc: calc.finalBalc || 0,
          pod: calc.isPodMissing ? 'MISSING' : (t.pod || ''),
          note: t.note || ''
        });

        row.height = 20;

        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.border = thinBorder;
          cell.font = { name: 'Calibri', size: 10 };
          cell.alignment = { vertical: 'middle' };

          // Text / Numbers Alignment
          if ([1, 3, 4, 5, 8, 9, 12, 13, 16, 18, 22, 26].includes(colNumber)) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else if ([11, 14, 15, 17, 19, 20, 21, 23, 24, 25].includes(colNumber)) {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            cell.numFmt = '#,##0';
          }

          // Col M Topay styling
          if (colNumber === 13 && t.topay) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
            cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF15803D' } };
          }

          // Col O Advance styling
          if (colNumber === 15 && calc.adv1 > 0) {
            cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF7E22CE' } };
          }

          // Col W BALC styling
          if (colNumber === 23) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF9C3' } };
            cell.font = { name: 'Calibri', size: 10, bold: true };
          }

          // Col Y FINAL BALC styling
          if (colNumber === 25) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
            cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: calc.finalBalc > 0 ? 'FFB91C1C' : 'FF15803D' } };
          }

          // Col Z POD cell highlighting
          if (colNumber === 26) {
            if (calc.isPodMissing) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
              cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFDC2626' } };
            } else {
              cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF15803D' } };
            }
          }
        });
      });

      // Bottom SUM TOTALS Row
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
        cod: sumCOD,
        pm: sumPM,
        payDate: '',
        balc: sumB,
        pmFinal: sumPF,
        finalBalc: sumFB,
        pod: '',
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

        if ([11, 14, 15, 17, 19, 20, 21, 23, 24, 25].includes(colNumber)) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '#,##0';
        } else if (colNumber === 2) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      });

      // Export file using FileSaver
      const buf = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const nowStr = new Date().toISOString().slice(0, 10);
      saveAs(blob, `SR_Brokerage_Ledger_${nowStr}.xlsx`);

      if (typeof AppModule !== 'undefined') {
        AppModule.showToast('📊 Genuine Excel (.xlsx) downloaded with cell colors & formatting!');
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
      'To-Billed (COD)', 'P/M', 'DATE', 'BALC', 'P/M', 'FINAL BALC', 'POD RECD', 'NOTE'
    ];

    const rows = list.map(t => {
      const calc = CalculationEngine.calculate(t);
      return [
        `"${t.slNo || ''}"`,
        `"${(t.trspName || '').replace(/"/g, '""')}"`,
        `"${t.date || ''}"`,
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
        calc.cod || 0,
        calc.pm || 0,
        `"${t.payDate || ''}"`,
        calc.balc || 0,
        calc.pmFinal || 0,
        calc.finalBalc || 0,
        `"${(t.pod || '').replace(/"/g, '""')}"`,
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
      AppModule.showToast('📥 Ledger exported to CSV/Excel successfully!');
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
