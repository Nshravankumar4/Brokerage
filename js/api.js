/**
 * api.js - Authoritative Cloud API & Synchronization Service
 * SR Brokerage Ledger - Transport Brokerage Ledger Pvt Ltd
 * Fleet Logistics & Financial Accounts Management
 * Developed by Shravan Kumar
 * Interfaces with Google Apps Script backend (backend/Code.gs)
 */

const ApiService = {
  config: {
    apiUrl: 'https://script.google.com/macros/s/AKfycbyfa4DRua4NpAMDFJ-njLHvwXOl5SaE6A_QT48yqPaxY64DB5r8KPFH2L7AkEm4f3g1/exec',
    timeoutMs: 30000
  },

  getApiUrl() {
    return this.config.apiUrl;
  },

  isCloudConnected() {
    return Boolean(this.getApiUrl());
  },

  async request(action, payload = {}, requiresSession = true) {
    const url = this.getApiUrl();
    if (!url) return { status: 'error', code: 'API_NOT_CONFIGURED', message: 'Cloud API is not configured.' };
    const sessionToken = (typeof AuthModule !== 'undefined') ? AuthModule.getSessionToken() : '';
    if (requiresSession && !sessionToken) {
      return { status: 'error', code: 'UNAUTHORIZED', message: 'Sign in before using the cloud ledger.' };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        signal: controller.signal,
        body: JSON.stringify({
          action,
          ...payload,
          ...(sessionToken ? { sessionToken } : {})
        })
      });
      let result;
      try {
        result = await response.json();
      } catch (error) {
        return { status: 'error', code: 'INVALID_RESPONSE', message: 'The cloud service returned an invalid response.' };
      }
      if (!response.ok) {
        return { status: 'error', code: 'HTTP_ERROR', message: `Cloud service returned HTTP ${response.status}.` };
      }
      if (result && result.code === 'UNAUTHORIZED' && typeof AuthModule !== 'undefined') {
        AuthModule.handleSessionExpired();
      }
      return result;
    } catch (error) {
      return {
        status: 'error',
        code: error.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR',
        message: error.name === 'AbortError' ? 'Cloud request timed out.' : 'Cloud service is unavailable.'
      };
    } finally {
      clearTimeout(timeoutId);
    }
  },

  async login(username, password) {
    return this.request('login', { username, password }, false);
  },

  async logout() {
    return this.request('logout');
  },

  async changePassword(newPassword) {
    return this.request('changePassword', { newPassword });
  },

  /**
   * Lightweight DATA_VERSION check for background polling (15s)
   */
  async getDataVersion() {
    if (!window.navigator.onLine) return null;
    const data = await this.request('getVersion');
    return data && data.status === 'success' && data.version !== undefined
      ? String(data.version)
      : null;
  },

  async fetchAll() {
    if (!window.navigator.onLine) {
      try {
        return { status: 'error', source: 'offline', trips: DataManager.getAll(), version: DataManager.getVersion() };
      } catch (error) {
        console.error('Could not read the offline shipment cache:', error);
        return { status: 'error', source: 'local', code: 'INVALID_LOCAL_CACHE', message: 'The local shipment cache is invalid; reconnect and load the cloud ledger.' };
      }
    }
    const data = await this.request('getAll');
    if (data && data.status === 'success' && Array.isArray(data.trips)) {
      try {
        DataManager.saveAll(data.trips);
      } catch (error) {
        console.error('Cloud shipment data could not be cached:', error);
        return {
          status: 'error',
          source: 'local',
          code: 'INVALID_CLOUD_DATA',
          message: 'Cloud shipment data is invalid and was not saved to the local cache.'
        };
      }
      if (data.version !== undefined && data.version !== null) DataManager.setVersion(String(data.version));
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
    }
    return {
      status: 'error',
      source: data && data.code === 'UNAUTHORIZED' ? 'unauthorized' : 'local',
      error: data && data.message ? data.message : 'Invalid cloud payload structure',
      version: DataManager.getVersion()
    };
  },

  async saveTrip(trip) {
    if (!window.navigator.onLine) return { status: 'error', source: 'offline', code: 'OFFLINE', message: 'Connect to the cloud ledger before saving.' };
    const result = await this.request('saveTrip', { trip });
    if (result && result.version !== undefined) DataManager.setVersion(String(result.version));
    return result;
  },

  async deleteTrip(id, sheetName = '', lrNo = '') {
    if (typeof AuthModule !== 'undefined' && !AuthModule.canDelete()) {
      return { status: 'error', message: 'Unauthorized: Admin role required' };
    }

    if (!window.navigator.onLine) return { status: 'error', source: 'offline', code: 'OFFLINE', message: 'Connect to the cloud ledger before deleting.' };
    const result = await this.request('deleteTrip', {
      id,
      sheetName,
      lrNo
    });
    if (result && result.version !== undefined) DataManager.setVersion(String(result.version));
    return result;
  },

  async triggerRestoreDatabase() {
    return { status: 'error', code: 'RESTORE_DISABLED', message: 'Database restore is disabled. Use a reviewed manual recovery procedure.' };
  },

  async triggerCloudBackup() {
    if (!window.navigator.onLine) return { status: 'error', code: 'OFFLINE', message: 'Connect to the cloud ledger before creating a cloud backup.' };
    return this.request('backupDatabase');
  }
};

window.ApiService = ApiService;
