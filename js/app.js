/**
 * app.js - Main Application Controller & Real-Time Sync Engine
 * Transport Brokerage Ledger Pvt Ltd
 * Connects Auth, Search, Date Filters, Dynamic Monthly Filters, Dashboard, Spreadsheet & Cloud Sync
 */

const AppModule = {
  currentView: 'viewExcel', // 'dashboard', 'tripEdit', or 'viewExcel'
  currentFilter: 'all',    // 'all', 'missingPod', 'topay'
  selectedMonth: 'all',    // 'all' or dynamic month key (e.g. 'Aug 2026', 'Sep 2026')
  searchQuery: '',
  dateFrom: '',
  dateTo: '',
  isSyncing: false,
  _pollerInterval: null,

  init() {
    if (typeof AuthModule !== 'undefined') {
      AuthModule.updateHeaderUI();
    }
    this.bindEvents();
    this.initRealtimeSync();
    this.refresh();

    // CLOUD-FIRST ARCHITECTURE: Immediately fetch live data from Google Sheets endpoint
    if (typeof ApiService !== 'undefined' && ApiService.isCloudConnected() && window.navigator.onLine) {
      ApiService.fetchAll().then(res => {
        if (res && res.source === 'cloud') {
          this.refresh();
          this.updateCloudSyncBadge(true);
          console.log('\u2705 Live Google Sheets cloud ledger synchronized on startup.');
        }
      }).catch(e => console.warn('Cloud startup fetch note:', e));
    }
  },

  // ================= MOBILE & DESKTOP SLIDE-IN SIDEBAR =================
  openSidebar() {
    const drawer = document.getElementById('appDrawer');
    const backdrop = document.getElementById('drawerBackdrop');
    if (drawer) {
      drawer.classList.add('open');
      drawer.style.transform = 'translateX(0)';
    }
    if (backdrop) {
      backdrop.classList.add('open');
      backdrop.style.display = 'block';
    }
    document.body.classList.add('sidebar-open');
  },

  closeSidebar() {
    const drawer = document.getElementById('appDrawer');
    const backdrop = document.getElementById('drawerBackdrop');
    if (drawer) {
      drawer.classList.remove('open');
      drawer.style.transform = '';
    }
    if (backdrop) {
      backdrop.classList.remove('open');
      backdrop.style.display = '';
    }
    document.body.classList.remove('sidebar-open');
  },

  toggleSidebar(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    const drawer = document.getElementById('appDrawer');
    if (!drawer) return;
    if (drawer.classList.contains('open')) {
      this.closeSidebar();
    } else {
      this.openSidebar();
    }
  },

  // ================= REAL-TIME MULTI-DEVICE AUTO-SYNC =================
  initRealtimeSync() {
    // 1. BroadcastChannel across all open tabs/windows
    if ('BroadcastChannel' in window) {
      if (!window.brokerSyncChannel) {
        window.brokerSyncChannel = new BroadcastChannel('broker_ledger_sync');
      }
      window.brokerSyncChannel.onmessage = async (event) => {
        const type = event.data?.type || 'Data updated';
        console.log("\u26A1 Real-time broadcast event received:", type);
        this.refresh();
      };
    }

    // 2. Custom Window Event Listener for instant same-tab/cross-script refreshes
    window.addEventListener('broker_trips_updated', () => {
      this.refresh();
    });

    // 3. Storage event listener fallback (for multi-tab / incognito)
    window.addEventListener('storage', (e) => {
      if (e.key && (e.key.startsWith('broker_') || e.key === 'broker_ledger_version_v5')) {
        this.refresh();
      }
    });

    // 4. Tab focus auto-sync (when user switches back to this tab)
    window.addEventListener('focus', () => {
      this.checkCloudVersionAndSync();
    });

    // 5. Background lightweight DATA_VERSION poller every 3.5 seconds
    if (this._pollerInterval) clearInterval(this._pollerInterval);
    this._pollerInterval = setInterval(() => {
      if (typeof ApiService !== 'undefined' && ApiService.isCloudConnected() && window.navigator.onLine) {
        this.checkCloudVersionAndSync();
      }
    }, 3500);
  },

  async checkCloudVersionAndSync() {
    if (this.isSyncing) return;
    if (typeof ApiService === 'undefined' || !ApiService.isCloudConnected()) return;

    try {
      const serverVersion = await ApiService.getDataVersion();
      const localVersion = DataManager.getVersion();

      if (serverVersion && serverVersion !== localVersion) {
        console.log(`[Sync] Cloud mutation detected (Local v${localVersion} !== Cloud v${serverVersion}). Syncing full dataset...`);
        this.isSyncing = true;
        this.updateCloudSyncBadge(false);

        const res = await ApiService.fetchAll();
        this.isSyncing = false;

        if (res && res.trips) {
          this.refresh();
          this.updateCloudSyncBadge(true);
          this.showToast(`\u26A1 Live sync: Updated to cloud version ${serverVersion}`);
        }
      } else if (serverVersion) {
        this.updateCloudSyncBadge(true);
      }
    } catch (e) {
      this.isSyncing = false;
      console.warn("[Sync] Background poll note:", e);
    }
  },

  async syncNow(silent = false) {
    if (!silent) this.showToast("\uD83D\uDD04 Syncing latest cloud database...");
    this.updateCloudSyncBadge(false);
    if (typeof ApiService !== 'undefined') {
      const res = await ApiService.fetchAll();
      this.refresh();
      this.updateCloudSyncBadge(true);
      if (!silent) this.showToast("\u2705 Synced with latest Google Sheets ledger!");
    }
  },

  updateCloudSyncBadge(isLive) {
    const headerPill = document.getElementById('headerCloudSyncBadge');
    const drawerStatus = document.getElementById('drawerStatusText');
    const count = DataManager.getAll().length;

    if (headerPill) {
      if (isLive) {
        headerPill.innerHTML = `\uD83D\uDFE2 Cloud Synced (v${DataManager.getVersion()})`;
        headerPill.style.color = '#10b981';
      } else {
        headerPill.innerHTML = `\uD83D\uDD04 Syncing...`;
        headerPill.style.color = '#38bdf8';
      }
    }

    if (drawerStatus) {
      drawerStatus.innerText = `Online \u2022 ${count} Active Trips`;
    }
  },

  bindEvents() {
    // 1. Text Search Filter
    const searchInput = document.getElementById('tableSearch');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        this.applyFilterAndRender();
      });
    }

    // 2. Month Selector Filter
    const monthSelect = document.getElementById('filterMonthSelect');
    if (monthSelect) {
      monthSelect.addEventListener('change', (e) => {
        this.selectedMonth = e.target.value;
        this.applyFilterAndRender();
        this.renderDashboardOnly();
      });
    }

    // 3. Date Range Filters
    const dFrom = document.getElementById('filterDateFrom');
    if (dFrom) {
      dFrom.addEventListener('change', (e) => {
        this.dateFrom = e.target.value;
        this.applyFilterAndRender();
      });
    }

    const dTo = document.getElementById('filterDateTo');
    if (dTo) {
      dTo.addEventListener('change', (e) => {
        this.dateTo = e.target.value;
        this.applyFilterAndRender();
      });
    }

    // 4. Modal Live Recalculation
    const modalCalcInputs = [
      'm_fright', 'm_topay', 'm_tm', 'm_advance1', 'm_advance2', 
      'm_advance3', 'm_cod', 'm_pm', 'm_pmFinal'
    ];

    modalCalcInputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => TableModule.liveCalcModal());
        el.addEventListener('change', () => TableModule.liveCalcModal());
      }
    });

    // 5. Form Submit
    const editForm = document.getElementById('editTripForm');
    if (editForm) {
      editForm.addEventListener('submit', (e) => TableModule.handleSaveModal(e));
    }

    // 6. Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        TableModule.closeModal();
        this.closeSidebar();
        this.closeSettingsModal();
      }
    });
  },

  switchView(viewName) {
    this.currentView = viewName;

    const btnDashboard = document.getElementById('btnNavDashboard');
    const btnTripEdit = document.getElementById('btnNavTripEdit');
    const btnViewExcel = document.getElementById('btnNavViewExcel');

    const drawerDashboard = document.getElementById('drawerNavDashboard');
    const drawerTripEdit = document.getElementById('drawerNavTripEdit');
    const drawerViewExcel = document.getElementById('drawerNavViewExcel');

    const viewDashboard = document.getElementById('viewDashboard');
    const viewTripEdit = document.getElementById('viewTripEdit');
    const viewExcel = document.getElementById('viewExcel');
    const dataToolbar = document.getElementById('dataToolbar');
    const zoomGroup = document.getElementById('excelZoomGroup');

    // Toggle top nav button active classes
    if (btnDashboard) btnDashboard.classList.toggle('active', viewName === 'dashboard');
    if (btnTripEdit) btnTripEdit.classList.toggle('active', viewName === 'tripEdit');
    if (btnViewExcel) btnViewExcel.classList.toggle('active', viewName === 'viewExcel');

    // Toggle drawer menu active classes
    if (drawerDashboard) drawerDashboard.classList.toggle('active', viewName === 'dashboard');
    if (drawerTripEdit) drawerTripEdit.classList.toggle('active', viewName === 'tripEdit');
    if (drawerViewExcel) drawerViewExcel.classList.toggle('active', viewName === 'viewExcel');

    // Toggle view visibility
    if (viewDashboard) viewDashboard.classList.toggle('active', viewName === 'dashboard');
    if (viewTripEdit) viewTripEdit.classList.toggle('active', viewName === 'tripEdit');
    if (viewExcel) viewExcel.classList.toggle('active', viewName === 'viewExcel');

    // Toolbar is visible on Trip Edit and Excel View
    if (dataToolbar) {
      dataToolbar.style.display = (viewName === 'dashboard') ? 'none' : 'flex';
    }

    // Zoom controls only visible on Excel Spreadsheet view
    if (zoomGroup) {
      zoomGroup.style.display = (viewName === 'viewExcel') ? 'flex' : 'none';
    }
  },

  openSettingsModal() {
    if (typeof AuthModule !== 'undefined' && !AuthModule.isAdmin()) {
      alert('Access Restricted: Only Administrator has permission to access API and System Settings!');
      return;
    }
    const modal = document.getElementById('settingsModal');
    if (modal) {
      if (typeof AuthModule !== 'undefined') AuthModule.updateHeaderUI();
      const apiUrlInput = document.getElementById('settingApiUrlInput');
      const sheetIdInput = document.getElementById('settingSheetIdInput');
      if (apiUrlInput && typeof ApiService !== 'undefined') {
        apiUrlInput.value = ApiService.config.apiUrl || '';
      }
      if (sheetIdInput && typeof ApiService !== 'undefined') {
        sheetIdInput.value = ApiService.getSheetId() || '';
      }
      modal.style.display = 'flex';
    }
  },

  saveSettings() {
    const apiUrlInput = document.getElementById('settingApiUrlInput');
    const sheetIdInput = document.getElementById('settingSheetIdInput');
    if (typeof ApiService !== 'undefined') {
      if (apiUrlInput) ApiService.setApiUrl(apiUrlInput.value.trim());
      if (sheetIdInput) ApiService.setSheetId(sheetIdInput.value.trim());
      this.showToast('\u2601\uFE0F Google Sheets API settings saved!');
      this.checkCloudVersionAndSync();
    }
  },

  closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
      modal.style.display = 'none';
    }
  },

  async restoreDefaultData() {
    if (typeof AuthModule !== 'undefined' && !AuthModule.isAdmin()) {
      alert('Access Restricted: Only Administrator can restore original database records!');
      return;
    }
    if (confirm('Are you sure you want to restore the current workbook records from BROKER DETAILS ADVANCE BALC DETAILS.xlsx? All unsaved manual edits will be reset.')) {
      if (typeof ApiService !== 'undefined' && ApiService.isCloudConnected() && window.navigator.onLine) {
        await ApiService.triggerRestoreDatabase();
      } else {
        DataManager.reset();
      }
      this.refresh();
      this.showToast('\uD83D\uDCCB Restored current workbook records successfully!');
    }
  },

  setFilter(filterType) {
    this.currentFilter = filterType;
    this.applyFilterAndRender();
    if (filterType === 'missingPod') {
      this.showToast('\u26A0\uFE0F Filtered: Showing shipments with Missing POD');
    } else if (filterType === 'A/TO-PAY') {
      this.showToast('Filtered: A/TO-PAY shipments');
    } else if (filterType === 'F/TO-PAY') {
      this.showToast('Filtered: F/TO-PAY shipments');
    } else if (filterType === 'TOBILLED') {
      this.showToast('Filtered: TOBILLED shipments');
    }
  },

  filterMissingPod() {
    if (this.currentView === 'dashboard') {
      this.switchView('tripEdit');
    }
    this.setFilter('missingPod');
  },

  filterByMonth(mKey) {
    this.selectedMonth = (this.selectedMonth === mKey) ? 'all' : mKey;
    const monthSelect = document.getElementById('filterMonthSelect');
    if (monthSelect) monthSelect.value = this.selectedMonth;
    if (this.currentView === 'dashboard') {
      this.switchView('tripEdit');
    }
    this.refresh();
    this.showToast(this.selectedMonth !== 'all' ? `Filtered shipments for ${mKey}` : 'All months displayed');
  },

  clearAllFilters() {
    this.currentFilter = 'all';
    this.selectedMonth = 'all';
    this.searchQuery = '';
    this.dateFrom = '';
    this.dateTo = '';

    const searchInput = document.getElementById('tableSearch');
    if (searchInput) searchInput.value = '';

    const monthSelect = document.getElementById('filterMonthSelect');
    if (monthSelect) monthSelect.value = 'all';

    const dFrom = document.getElementById('filterDateFrom');
    if (dFrom) dFrom.value = '';

    const dTo = document.getElementById('filterDateTo');
    if (dTo) dTo.value = '';

    this.refresh();
    this.showToast('All filters cleared');
  },

  applyFilterAndRender() {
    const allTrips = DataManager.getAll();
    let filtered = allTrips;

    // 1. Status Filter (A/TO-PAY, F/TO-PAY, TOBILLED, missingPod)
    if (this.currentFilter === 'A/TO-PAY') {
      filtered = filtered.filter(t => {
        const s = String(t.topay || '').trim().toUpperCase();
        return s === 'A/TO-PAY' || s === 'A/TO-BILLED' || s.startsWith('A');
      });
    } else if (this.currentFilter === 'F/TO-PAY') {
      filtered = filtered.filter(t => {
        const s = String(t.topay || '').trim().toUpperCase();
        return s === 'F/TO-PAY' || s === 'F/TO-BILLED' || s.startsWith('F');
      });
    } else if (this.currentFilter === 'TOBILLED') {
      filtered = filtered.filter(t => {
        const s = String(t.topay || '').trim().toUpperCase();
        return s === 'TOBILLED' || s === 'TO-BILLED' || s === 'TO-PAY' || s === 'TO BILLED' || s === '';
      });
    } else if (this.currentFilter === 'missingPod' || this.currentFilter === 'POD missing' || this.currentFilter === 'podMissing') {
      filtered = filtered.filter(t => {
        const calc = CalculationEngine.calculate(t);
        return calc.isPodMissing;
      });
    }

    // 2. Month Filter
    if (this.selectedMonth && this.selectedMonth !== 'all') {
      filtered = filtered.filter(t => {
        const calc = CalculationEngine.calculate(t);
        return calc.monthKey === this.selectedMonth;
      });
    }

    // 3. Search Query
    if (this.searchQuery) {
      const q = this.searchQuery;
      filtered = filtered.filter(t => {
        const lr = (t.lrNo || '').toLowerCase();
        const truck = (t.truckNo || '').toLowerCase();
        const trsp = (t.trspName || '').toLowerCase();
        const from = (t.from || '').toLowerCase();
        const to = (t.to || '').toLowerCase();
        const topay = (t.topay || '').toLowerCase();
        const sl = String(t.slNo || '');
        const matchToBilled = (q === 'to-billed' || q === 'tobilled' || q === 'to billed') && topay === 'tobilled';
        const matchToPay = (q === 'topaystatus' || q === 'topay' || q === 'to-pay') && topay.includes('pay');
        return lr.includes(q) || truck.includes(q) || trsp.includes(q) || 
               from.includes(q) || to.includes(q) || topay.includes(q) || matchToBilled || matchToPay || sl === q;
      });
    }

    // 4. Date Range Filter (Parses DD-MM-YYYY)
    if (this.dateFrom || this.dateTo) {
      filtered = filtered.filter(t => {
        if (!t.date) return false;
        const parts = t.date.split('-');
        if (parts.length === 3) {
          const tripIso = `${parts[2]}-${parts[1]}-${parts[0]}`;
          if (this.dateFrom && tripIso < this.dateFrom) return false;
          if (this.dateTo && tripIso > this.dateTo) return false;
        }
        return true;
      });
    }

    // Render Table and Trip Cards with filtered trips
    TableModule.setTrips(filtered);

    // Update Result Counters
    const countEl = document.getElementById('activeRecordCount');
    if (countEl) {
      countEl.innerText = `Showing ${filtered.length} of ${allTrips.length} shipments`;
    }
  },

  renderDashboardOnly() {
    const allTrips = DataManager.getAll();
    DashboardModule.render(allTrips);
  },

  refresh() {
    this.renderDashboardOnly();
    this.applyFilterAndRender();
    this.updateCloudSyncBadge(true);
  },

  showToast(message) {
    let toast = document.getElementById('appToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'appToast';
      toast.className = 'app-toast';
      document.body.appendChild(toast);
    }
    toast.innerText = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }
};

// Expose modules globally on window to ensure all inline onclick handlers execute reliably
window.AppModule = AppModule;
window.AuthModule = AuthModule;
window.TableModule = TableModule;
window.DashboardModule = DashboardModule;
window.DataManager = DataManager;
window.ApiService = ApiService;
window.CalculationEngine = CalculationEngine;
window.toggleSidebar = (e) => AppModule.toggleSidebar(e);
window.openSidebar = () => AppModule.openSidebar();
window.closeSidebar = () => AppModule.closeSidebar();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  AppModule.init();
});
