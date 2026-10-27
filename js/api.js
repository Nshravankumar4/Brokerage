/**
 * api.js - Authoritative Cloud API & Synchronization Service
 * SR Brokerage Ledger - Transport Brokerage Ledger Pvt Ltd
 * Fleet Logistics & Financial Accounts Management
 * Developed by Shravan Kumar
 * Interfaces with Google Apps Script backend (backend/Code.gs)
 * Live Production Endpoint: https://script.google.com/macros/s/AKfycbypHu63P8CqfmipBTYGe3GQO6zoYdCxrGZPSPFeR5mah4_knL06pS7KQAyDSEhIjcA/exec
 */

const ApiService = {
  config: {
    defaultApiUrl: 'https://script.google.com/macros/s/AKfycbypHu63P8CqfmipBTYGe3GQO6zoYdCxrGZPSPFeR5mah4_knL06pS7KQAyDSEhIjcA/exec',
    defaultSheetId: '1wCu03TqXMhokFYarECDBCFDd_dMWx5LpLtiZL2iryiU',
    apiUrl: localStorage.getItem('broker_api_url') || 'https://script.google.com/macros/s/AKfycbypHu63P8CqfmipBTYGe3GQO6zoYdCxrGZPSPFeR5mah4_knL06pS7KQAyDSEhIjcA/exec',
    sheetId: localStorage.getItem('broker_sheet_id') || '1wCu03TqXMhokFYarECDBCFDd_dMWx5LpLtiZL2iryiU',
    timeoutMs: 12000
  },

  getApiUrl() {
    return this.config.defaultApiUrl;
  },

  setApiUrl(url) {
    this.config.apiUrl = this.config.defaultApiUrl;
    localStorage.setItem('broker_api_url', this.config.defaultApiUrl);
  },

  getSheetId() {
    return this.config.defaultSheetId;
  },

  setSheetId(id) {
    this.config.sheetId = this.config.defaultSheetId;
    localStorage.setItem('broker_sheet_id', this.config.defaultSheetId);
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
          // Clear distinction: A valid cloud response returning an empty or populated trips array is authoritative cloud data
          if (data && data.status === 'success' && Array.isArray(data.trips)) {
            DataManager.saveAll(data.trips);
            if (data.version !== undefined && data.version !== null) {
              DataManager.setVersion(String(data.version));
            }
            return {
              status: 'success',
              source: 'cloud',
              trips: data.trips,
              version: data.version,
              summary: data.summary || {
                totalTrips: data.trips.length,
                totalFreight: 0,
                totalAdvances: 0,
                finalBalance: 0,
                pendingPod: 0
              }
            };
          } else {
            console.warn('Unexpected cloud payload structure:', data);
            return {
              status: 'error',
              source: 'local',
              error: 'Invalid cloud payload structure',
              trips: DataManager.getAll(),
              version: DataManager.getVersion()
            };
          }
        } else {
          console.warn(`Cloud API HTTP error: ${res.status}`);
          return {
            status: 'error',
            source: 'local',
            error: `HTTP error ${res.status}`,
            trips: DataManager.getAll(),
            version: DataManager.getVersion()
          };
        }
      } catch (err) {
        console.warn('Cloud API fetch note (fallback to verified local cache):', err.message);
        return {
          status: 'error',
          source: 'local',
          error: err.message,
          trips: DataManager.getAll(),
          version: DataManager.getVersion()
        };
      }
    }

    // Explicitly supported offline mode fallback
    const localTrips = DataManager.getAll();
    return {
      status: 'success',
      source: 'offline',
      trips: localTrips,
      version: DataManager.getVersion()
    };
  },

  async saveTrip(trip) {
    // Synchronize with Cloud backend (no double-save: caller handles local DataManager)
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
            isAdd: trip.isAdd || false,
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
        return { status: 'error', code: 'NETWORK_ERROR', message: err.message };
      }
    }

    return { status: 'success', source: 'local', trip: trip };
  },

  async deleteTrip(rowNum, sheetName = '') {
    if (typeof AuthModule !== 'undefined' && !AuthModule.canDelete()) {
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
          if (result && result.version !== undefined) {
            DataManager.setVersion(String(result.version));
          }
          if (result && result.status === 'success') {
            // Confirm cloud success before deleting local state
            DataManager.deleteTrip(rowNum, sheetName);
            return {
              status: 'success',
              source: 'cloud',
              message: result.message || 'Trip deleted from Google Sheets',
              sheetName: result.sheetName
            };
          } else {
            const msg = (result && result.message) ? result.message : 'Cloud deletion rejected by server';
            console.error('Server rejection on deleteTrip:', msg);
            return { status: 'error', code: result?.code || 'SERVER_ERROR', message: msg };
          }
        } else {
          return { status: 'error', code: 'HTTP_ERROR', message: `Server returned HTTP ${res.status}` };
        }
      } catch (err) {
        console.warn('Cloud sync error for deleteTrip:', err.message);
        return { status: 'error', code: 'NETWORK_ERROR', message: err.message };
      }
    }

    // Explicitly supported offline mode deletion
    DataManager.deleteTrip(rowNum, sheetName);
    return { status: 'success', source: 'offline', message: 'Trip deleted locally (offline mode)' };
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
