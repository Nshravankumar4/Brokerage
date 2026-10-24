/**
 * app.js - Main Application Controller & Real-Time Sync Engine
 * Transport Brokerage Ledger Pvt Ltd
 * Connects Auth, Search, Date Filters, Dynamic Monthly Filters, Dashboard, Spreadsheet & Cloud Sync
 */

const AppModule = {
  currentView: 'dashboard', // 'dashboard', 'tripEdit', or 'viewExcel'
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
  },

  // ================= MOBILE & DESKTOP SLIDE-IN SIDEBAR =================
  toggleSidebar() {
    const drawer = document.getElementById('appDrawer');
    const backdrop = document.getElementById('drawerBackdrop');
    if (!drawer) return;
    const isOpen = drawer.classList.contains('open');
    drawer.classList.toggle('open', !isOpen);
    if (backdrop) backdrop.classList.toggle('open', !isOpen);
  },

  closeSidebar() {
    const drawer = document.getElementById('appDrawer');
    const backdrop = document.getElementById('drawerBackdrop');
    if (drawer) drawer.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
  },

  // ================= REAL-TIME MULTI-DEVICE AUTO-SYNC (MATCHING SR_T) =================
  initRealtimeSync() {
    // 1. BroadcastChannel across all open tabs/windows
    if ('BroadcastChannel' in window) {
      window.brokerSyncChannel = new BroadcastChannel('broker_ledger_sync');
      window.brokerSyncChannel.onmessage = async (event) => {
        const type = event.data?.type || 'Data updated';
        console.log("⚡ Real-time broadcast event received:", type);
        this.refresh();
      };
    }

    // 2. Storage event listener fallback (for multi-tab / incognito)
    window.addEventListener('storage', (e) => {
      if (e.key && (e.key.startsWith('broker_') || e.key === 'broker_ledger_version_v5')) {
        this.refresh();
      }
    });

    // 3. Tab focus auto-sync (when user switches back to this tab)
    window.addEventListener('focus', () => {
      this.checkCloudVersionAndSync();
    });

    // 4. Background lightweight DATA_VERSION poller every 3.5 seconds
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
          this.showToast(`⚡ Live sync: Updated to cloud version ${serverVersion}`);
        }
      } else if (serverVersion) {
        this.updateCloudSyncBadge(true);
      }
    } catch (e) {
      this.isSyncing = false;
      console.warn("[Sync] Background poll note:", e);
    }
  },

  async syncNow() {
    this.showToast("🔄 Syncing latest cloud database...");
    this.updateCloudSyncBadge(false);
    if (typeof ApiService !== 'undefined') {
      const res = await ApiService.fetchAll();
      this.refresh();
      this.updateCloudSyncBadge(true);
      this.showToast("✅ Synced with latest database!");
    }
  },

  updateCloudSyncBadge(isLive) {
    const headerPill = document.getElementById('headerCloudSyncBadge');
    const drawerStatus = document.getElementById('drawerStatusText');
    const count = DataManager.getAll().length;

    if (headerPill) {
      if (isLive) {
        headerPill.innerHTML = `🟢 Cloud Synced (v${DataManager.getVersion()})`;
        headerPill.style.color = '#10b981';
      } else {
        headerPill.innerHTML = `🔄 Syncing...`;
        headerPill.style.color = '#38bdf8';
      }
    }

    if (drawerStatus) {
      drawerStatus.innerText = `Online • ${count} Active Trips`;
    }
  },

  bindEvents() {
    // 0. Sidebar Toggle Button
    const btnOpenSidebar = document.getElementById('btnOpenSidebar');
    if (btnOpenSidebar) {
      btnOpenSidebar.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleSidebar();
      });
    }

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
      this.showToast('☁️ Google Sheets API settings saved!');
      this.checkCloudVersionAndSync();
    }
  },

  closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
      modal.style.display = 'none';
    }
  },

  restoreDefaultData() {
    if (typeof AuthModule !== 'undefined' && !AuthModule.isAdmin()) {
      alert('Access Restricted: Only Administrator can restore original database records!');
      return;
    }
    if (confirm('Are you sure you want to restore the original 19 Excel records from BROKER DETAILS ADVANCE BALC DETAILS.xlsx? All unsaved manual edits will be reset.')) {
      DataManager.reset();
      this.refresh();
      this.showToast('📋 Restored original Excel records successfully!');
    }
  },

  setFilter(filterType, element) {
    this.currentFilter = filterType;

    document.querySelectorAll('.chip-btn').forEach(btn => btn.classList.remove('active'));
    if (element) {
      element.classList.add('active');
    }

    this.applyFilterAndRender();
  },

  filterMissingPod() {
    const chipMissing = document.getElementById('chipMissingPod');
    this.setFilter('missingPod', chipMissing);
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

    document.querySelectorAll('.chip-btn').forEach(btn => btn.classList.remove('active'));
    const chipAll = document.getElementById('chipAllTrips');
    if (chipAll) chipAll.classList.add('active');

    this.refresh();
    this.showToast('All filters cleared');
  },

  applyFilterAndRender() {
    const allTrips = DataManager.getAll();
    let filtered = allTrips;

    // 1. Status Chip Filter
    if (this.currentFilter === 'missingPod') {
      filtered = filtered.filter(t => CalculationEngine.calculate(t).isPodMissing);
    } else if (this.currentFilter === 'topay') {
      filtered = filtered.filter(t => Boolean(t.topay && t.topay.trim()));
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
        return lr.includes(q) || truck.includes(q) || trsp.includes(q) || 
               from.includes(q) || to.includes(q) || topay.includes(q) || sl === q;
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

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  AppModule.init();
});
