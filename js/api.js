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
    timeoutMs: 12000
  },

  setApiUrl(url) {
    this.config.apiUrl = url ? url.trim() : this.config.defaultApiUrl;
    localStorage.setItem('broker_api_url', this.config.apiUrl);
  },

  async fetchAll() {
    const url = this.config.apiUrl || this.config.defaultApiUrl;

    if (url) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

        const res = await fetch(`${url}?action=getAll`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data && data.status === 'success' && Array.isArray(data.trips) && data.trips.length > 0) {
            DataManager.saveAll(data.trips);
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
        console.warn('Cloud API fetch failed, using local store:', err.message);
      }
    }

    // High-performance local store fallback
    const localTrips = DataManager.getAll();
    return {
      status: 'success',
      source: 'local',
      trips: localTrips,
      version: '1.0'
    };
  },

  async saveTrip(trip) {
    // 1. Immediately persist to local store for instant UI response
    DataManager.saveTrip(trip);

    // 2. Synchronize with Cloud backend
    const url = this.config.apiUrl || this.config.defaultApiUrl;
    if (url) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          // Use text/plain to avoid CORS preflight OPTIONS rejection in Google Apps Script
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'saveTrip', trip: trip })
        });
        if (res.ok) {
          const result = await res.json();
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

    const url = this.config.apiUrl || this.config.defaultApiUrl;
    if (url) {
      try {
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'deleteTrip', rowNum: rowNum })
        });
      } catch (err) {
        console.warn('Cloud sync note for deleteTrip:', err.message);
      }
    }

    return { status: 'success', message: 'Trip deleted' };
  },

  async triggerCloudBackup() {
    const url = this.config.apiUrl || this.config.defaultApiUrl;
    if (!url) {
      TableModule.exportToExcel();
      return { status: 'success', message: 'Local Excel backup generated.' };
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'backupDatabase' })
      });
      return await res.json();
    } catch (err) {
      console.warn('Cloud backup failed, downloading local copy:', err);
      TableModule.exportToExcel();
      return { status: 'local_only', message: 'Cloud backup unavailable, downloaded local Excel file.' };
    }
  }
};
