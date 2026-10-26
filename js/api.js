/**
 * api.js - Authoritative Cloud API & Synchronization Service
 * SR Brokerage Ledger • Transport Brokerage Ledger Pvt Ltd
 * Fleet Logistics & Financial Accounts Management
 * Developed by Shravan Kumar
 * Interfaces with Google Apps Script backend (backend/Code.gs)
 * Live Production Endpoint: https://script.google.com/macros/s/AKfycbzjzIDLeIpl63TC5RPrSPmusBktgCqILD6EemOKVwHUQj41gqYtYdJwQoufJYgHvZSoBQ/exec
 */

const ApiService = {
  config: {
    defaultApiUrl: 'https://script.google.com/macros/s/AKfycbxHwxcs9iEPhSqRbNmtiGpEAxKdGL7A50Bg_hn3DHQuQMu-dPhaLcxc1GXeKX8nrVmuIQ/exec',
    defaultSheetId: '1pp9s62Oi41XW6N3cz_qxPTaG1JCjqK4iUqxxcIc3ZPA',
    apiUrl: localStorage.getItem('broker_api_url') || 'https://script.google.com/macros/s/AKfycbxHwxcs9iEPhSqRbNmtiGpEAxKdGL7A50Bg_hn3DHQuQMu-dPhaLcxc1GXeKX8nrVmuIQ/exec',
    sheetId: localStorage.getItem('broker_sheet_id') || '1pp9s62Oi41XW6N3cz_qxPTaG1JCjqK4iUqxxcIc3ZPA',
    timeoutMs: 12000
  },

  getApiUrl() {
    const stored = localStorage.getItem('broker_api_url');
    // Auto-migrate legacy deployment endpoints to active Version 3 endpoint
    if (!stored || stored.includes('AKfycbwVgbDsDazKLlwR2Bh') || stored.includes('AKfycbxhwvJi8UDsJd2yFo') || stored.includes('AKfycbzIxZGX9QwNWqZSzDJ2HMV3Ma79GdFYVKod0a7z30cbdXNn_322azdSDVj6wiyru_4yow') || stored.includes('AKfycbzjzIDLeIpl63TC5RPrSPmusBktgCqILD6EemOKVwHUQj41gqYtYdJwQoufJYgHvZSoBQ') || stored.includes('AKfycbwqykkt53iglV7FrceyixlDjUSe5ry4JIG_jlLPwbBukqrRF1lagM49Hem7jYcHm7HK4A')) {
      return this.config.defaultApiUrl;
    }
    return this.config.apiUrl || this.config.defaultApiUrl;
  },

  setApiUrl(url) {
    this.config.apiUrl = url ? url.trim() : this.config.defaultApiUrl;
    localStorage.setItem('broker_api_url', this.config.apiUrl);
  },

  getSheetId() {
    return this.config.sheetId || this.config.defaultSheetId || '';
  },

  setSheetId(id) {
    let cleanId = (id || '').trim();
    // Extract ID if a full Google Sheets URL was pasted
    const match = cleanId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
      cleanId = match[1];
    }
    this.config.sheetId = cleanId;
    localStorage.setItem('broker_sheet_id', cleanId);
  },

  isCloudConnected() {
    return Boolean(this.getApiUrl());
  },

  buildUrl(action) {
    const base = this.getApiUrl();
    const sheetParam = this.getSheetId() ? `&sheetId=${encodeURIComponent(this.getSheetId())}` : '';
    return `${base}?action=${action}${sheetParam}`;
  },

  /**
   * Lightweight DATA_VERSION check for real-time background polling (3.5s)
   */
  async getDataVersion() {
    const url = this.getApiUrl();
    if (!url || !window.navigator.onLine) return null;

    try {
      const targetUrl = this.buildUrl('getVersion');
      const res = await fetch(targetUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data && data.status === 'success' && data.version !== undefined) {
        return String(data.version);
      }
    } catch (e) {
      // Poller fails silently without spamming logs
    }
    return null;
  },

  async fetchAll() {
    const url = this.getApiUrl();

    if (url && window.navigator.onLine) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

        const targetUrl = this.buildUrl('getAll');
        const res = await fetch(targetUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data && data.status === 'success' && Array.isArray(data.trips) && data.trips.length > 0) {
            DataManager.saveAll(data.trips);
            if (data.version) {
              DataManager.setVersion(String(data.version));
            }
            return {
              status: 'success',
              source: 'cloud',
              trips: data.trips,
              version: data.version,
              summary: data.summary
            };
          }
        }
      } catch (err) {
        console.warn('Cloud API fetch note (fallback to verified local cache):', err.message);
      }
    }

    // High-performance local store fallback
    const localTrips = DataManager.getAll();
    return {
      status: 'success',
      source: 'local',
      trips: localTrips,
      version: DataManager.getVersion()
    };
  },

  async saveTrip(trip) {
    // 1. Immediately persist to local store for instant UI response
    DataManager.saveTrip(trip);

    // 2. Synchronize with Cloud backend
    const url = this.getApiUrl();
    if (url && window.navigator.onLine) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          // Use text/plain to avoid CORS preflight OPTIONS rejection in Google Apps Script
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'saveTrip',
            trip: trip,
            sheetName: trip.sheetName || '',
            sourceSheet: trip.sourceSheet || trip.sheetName || '',
            sheetId: this.getSheetId()
          })
        });
        if (res.ok) {
          const result = await res.json();
          if (result && result.version) {
            DataManager.setVersion(String(result.version));
          }
          return result;
        }
      } catch (err) {
        console.warn('Cloud sync note for saveTrip:', err.message);
      }
    }

    return { status: 'success', source: 'local', trip: trip };
  },

  async deleteTrip(rowNum, sheetName = '') {
    if (typeof AuthModule !== 'undefined' && !AuthModule.canDelete()) {
      alert('Access Denied: Only Administrator is authorized to delete trips.');
      return { status: 'error', message: 'Unauthorized: Admin role required' };
    }

    const session = (typeof AuthModule !== 'undefined') ? AuthModule.getCurrentUser() : null;
    DataManager.deleteTrip(rowNum);

    const url = this.getApiUrl();
    if (url && window.navigator.onLine) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'deleteTrip',
            rowNum: rowNum,
            sheetName: sheetName || '',
            role: session?.role || '',
            authHash: session?.authHash || '',
            sheetId: this.getSheetId()
          })
        });
        if (res.ok) {
          const result = await res.json();
          if (result && result.version) {
            DataManager.setVersion(String(result.version));
          }
          if (result && result.status === 'error') {
            console.error('Server rejection on deleteTrip:', result.message);
          }
        }
      } catch (err) {
        console.warn('Cloud sync note for deleteTrip:', err.message);
      }
    }

    return { status: 'success', message: 'Trip deleted' };
  },

  async triggerRestoreDatabase() {
    if (typeof AuthModule !== 'undefined' && !AuthModule.isAdmin()) {
      alert('Access Denied: Only Administrator is authorized to restore database.');
      return { status: 'error', message: 'Unauthorized: Admin role required' };
    }

    const session = (typeof AuthModule !== 'undefined') ? AuthModule.getCurrentUser() : null;
    const url = this.getApiUrl();
    if (url && window.navigator.onLine) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'restoreDatabase',
            role: session?.role || '',
            authHash: session?.authHash || '',
            sheetId: this.getSheetId()
          })
        });
        if (res.ok) {
          const result = await res.json();
          await this.fetchAll();
          return result;
        }
      } catch (err) {
        console.warn('Cloud restore note:', err);
      }
    }
    DataManager.restoreDefault();
    return { status: 'success', message: 'Local default data restored' };
  },

  async triggerCloudBackup() {
    const url = this.getApiUrl();
    if (!url || !window.navigator.onLine) {
      TableModule.exportToExcel();
      return { status: 'success', message: 'Local Excel backup generated.' };
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'backupDatabase',
          sheetId: this.getSheetId()
        })
      });
      return await res.json();
    } catch (err) {
      console.warn('Cloud backup note, downloading local copy:', err);
      TableModule.exportToExcel();
      return { status: 'local_only', message: 'Cloud backup unavailable, downloaded local Excel copy.' };
    }
  }
};

window.ApiService = ApiService;
