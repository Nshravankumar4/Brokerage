/**
 * app.js - Main Application Controller
 * Connects Auth, Search, Date Filters, Dynamic Monthly Filters, Dashboard & Excel View
 */

const AppModule = {
  currentView: 'dashboard', // 'dashboard', 'tripEdit', or 'viewExcel'
  currentFilter: 'all',    // 'all', 'missingPod', 'topay'
  selectedMonth: 'all',    // 'all' or dynamic month key (e.g. 'Aug 2026', 'Sep 2026')
  searchQuery: '',
  dateFrom: '',
  dateTo: '',

  init() {
    if (typeof AuthModule !== 'undefined') {
      AuthModule.updateHeaderUI();
    }
    this.bindEvents();
    this.refresh();
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

    // 6. Login Form Submit
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const u = document.getElementById('loginUsername').value;
        const p = document.getElementById('loginPassword').value;
        const res = AuthModule.login(u, p);
        if (!res.success) {
          alert(res.message);
        } else {
          this.showToast(`Logged in as ${res.user.displayName}`);
        }
      });
    }

    // 7. Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        TableModule.closeModal();
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
      if (apiUrlInput && typeof ApiService !== 'undefined') {
        apiUrlInput.value = ApiService.config.apiUrl || '';
      }
      modal.style.display = 'flex';
    }
  },

  saveApiUrl() {
    const apiUrlInput = document.getElementById('settingApiUrlInput');
    if (apiUrlInput && typeof ApiService !== 'undefined') {
      const url = apiUrlInput.value.trim();
      ApiService.setApiUrl(url);
      this.showToast(url ? '☁️ Google Sheets API URL saved!' : 'Switched to offline local storage');
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

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  AppModule.init();
});
