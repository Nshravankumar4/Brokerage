/**
 * api.js - Authoritative Cloud API & Synchronization Service
 * Transport Brokerage Ledger Pvt Ltd
 * Interfaces with Google Apps Script backend (backend/Code.gs)
 * Live Production Endpoint: https://script.google.com/macros/s/AKfycbxhwvJi8UDsJd2yFo9oprDAQGS8M9L6UfcM5M9Tmn98UPZFP8ijYdS9ZIYAl4hiyKbopA/exec
 */

const ApiService = {
  config: {
    defaultApiUrl: 'https://script.google.com/macros/s/AKfycbxhwvJi8UDsJd2yFo9oprDAQGS8M9L6UfcM5M9Tmn98UPZFP8ijYdS9ZIYAl4hiyKbopA/exec',
    apiUrl: localStorage.getItem('broker_api_url') || 'https://script.google.com/macros/s/AKfycbxhwvJi8UDsJd2yFo9oprDAQGS8M9L6UfcM5M9Tmn98UPZFP8ijYdS9ZIYAl4hiyKbopA/exec',
    sheetId: localStorage.getItem('broker_sheet_id') || '',
    timeoutMs: 12000
  },

  getApiUrl() {
    return this.config.apiUrl || this.config.defaultApiUrl;
  },

  setApiUrl(url) {
    this.config.apiUrl = url ? url.trim() : this.config.defaultApiUrl;
    localStorage.setItem('broker_api_url', this.config.apiUrl);
  },

  getSheetId() {
    return this.config.sheetId || '';
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

  async deleteTrip(rowNum) {
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
            sheetId: this.getSheetId()
          })
        });
        if (res.ok) {
          const result = await res.json();
          if (result && result.version) {
            DataManager.setVersion(String(result.version));
          }
        }
      } catch (err) {
        console.warn('Cloud sync note for deleteTrip:', err.message);
      }
    }

    return { status: 'success', message: 'Trip deleted' };
  },

  async triggerRestoreDatabase() {
    const url = this.getApiUrl();
    if (url && window.navigator.onLine) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'restoreDatabase',
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
