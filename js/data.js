/**
 * data.js - Local cache and shipment persistence helpers
 * SR Brokerage Ledger - Transport Brokerage Ledger Pvt Ltd
 */

if (typeof window !== 'undefined' && 'BroadcastChannel' in window && !window.brokerSyncChannel) {
  window.brokerSyncChannel = new BroadcastChannel('broker_ledger_sync');
}

const CURRENT_WORKBOOK_SCHEMA_VERSION = 'current-workbook-v1';
const SHIPMENT_STATUS_TO_SHEET = Object.freeze({
  TOBILLED: 'TOBILLED',
  'A/TO-PAY': 'A-TO-PAY',
  'F/TO-PAY': 'F-TO-PAY'
});

function physicalSheetNameForStatus(status) {
  const normalized = String(status || '').trim().toUpperCase();
  const sheetName = SHIPMENT_STATUS_TO_SHEET[normalized];
  if (!sheetName) throw new Error(`Unsupported shipment status: ${normalized || '(empty)'}`);
  return sheetName;
}

function normalizeTrip(trip) {
  if (!trip || typeof trip !== 'object' || Array.isArray(trip)) {
    throw new Error('Shipment data must be an object.');
  }
  const normalized = { ...trip };
  delete normalized.pocDate;
  delete normalized.pocAmount;
  delete normalized.pocNotes;
  const status = String(normalized.topay || '').trim().toUpperCase();
  const statuses = {
    'A/TO-PAY': 'A/TO-PAY',
    'A-TO-PAY': 'A/TO-PAY',
    'F/TO-PAY': 'F/TO-PAY',
    'F-TO-PAY': 'F/TO-PAY',
    TOBILLED: 'TOBILLED',
    'TO-BILLED': 'TOBILLED',
    'TO BILLED': 'TOBILLED'
  };
  if (!statuses[status]) throw new Error(`Unsupported shipment status: ${status || '(empty)'}`);
  normalized.topay = statuses[status];
  return normalized;
}

const DataManager = {
  storageKey: 'broker_ledger_trips_v8_current_workbook',
  versionKey: 'broker_ledger_cloud_version_v1',
  schemaVersionKey: 'broker_ledger_schema_v1',

  getAll() {
    const stored = localStorage.getItem(this.storageKey);
    if (stored === null) return [];
    let parsed;
    try {
      parsed = JSON.parse(stored);
    } catch (error) {
      console.error('Stored shipment cache is invalid JSON.', error);
      throw new Error('Stored shipment cache is invalid. Reconnect to load the cloud ledger.');
    }
    if (!Array.isArray(parsed)) {
      throw new Error('Stored shipment cache has an invalid format.');
    }
    localStorage.setItem(this.schemaVersionKey, CURRENT_WORKBOOK_SCHEMA_VERSION);
    return parsed.map(normalizeTrip);
  },

  saveAll(list) {
    if (!Array.isArray(list)) throw new Error('Shipment data must be an array.');
    localStorage.setItem(this.storageKey, JSON.stringify(list.map(normalizeTrip)));
    localStorage.setItem(this.schemaVersionKey, CURRENT_WORKBOOK_SCHEMA_VERSION);
    if (window.brokerSyncChannel) {
      window.brokerSyncChannel.postMessage({ type: 'trips_updated', timestamp: Date.now() });
    }
    window.dispatchEvent(new CustomEvent('broker_trips_updated', { detail: { timestamp: Date.now() } }));
  },

  getVersion() {
    return localStorage.getItem(this.versionKey) || '1';
  },

  setVersion(version) {
    if (version !== undefined && version !== null && String(version) !== '') {
      localStorage.setItem(this.versionKey, String(version));
    }
  },

  getTrip(id) {
    return this.getAll().find(trip => String(trip.id || '') === String(id || '')) || null;
  },

  createShipmentId() {
    if (!window.crypto || typeof window.crypto.randomUUID !== 'function') {
      throw new Error('Secure shipment ID generation is unavailable in this browser.');
    }
    return window.crypto.randomUUID();
  },

  isDuplicateLr(lrNo, excludeRow = null, excludeSheet = null) {
    if (!lrNo) return null;
    const target = String(lrNo).trim().toUpperCase();
    return this.getAll().find(trip => {
      const existing = String(trip.lrNo || '').trim().toUpperCase();
      if (!existing) return false;
      const sameRecord = excludeRow !== null &&
        Number(trip.row) === Number(excludeRow) &&
        (!excludeSheet || trip.sheetName === excludeSheet);
      return existing === target && !sameRecord;
    }) || null;
  },

  saveTrip(trip) {
    const normalized = normalizeTrip(trip);
    if (typeof CalculationEngine !== 'undefined') {
      const calc = CalculationEngine.calculate(normalized);
      normalized.cod = calc.cod;
      normalized.pendingTobilled = calc.pendingTobilled;
      normalized.balc = calc.pendingTobilled;
      normalized.finalBalc = calc.finalBalc;
      if (!normalized.podAmountStatus || normalized.podAmountStatus === 0 || normalized.podAmountStatus === '0') {
        normalized.podAmountStatus = (!calc.isPodMissing || normalized.pod) ? 'DONE' : 'PENDING';
      }
    }

    const list = this.getAll();
    const sourceSheet = normalized.sourceSheet || normalized.sheetName || '';
    const isAdd = Boolean(normalized.isAdd) || Number(normalized.row) < 2;
    const index = isAdd ? -1 : list.findIndex(existing =>
      String(existing.id || '') === String(normalized.id || ''));
    if (!isAdd && index < 0) throw new Error('Shipment identity is missing or stale. Refresh and retry.');
    if (index >= 0) {
      normalized.id = normalized.id || list[index].id;
      list[index] = { ...list[index], ...normalized };
    } else {
      list.push(normalized);
    }
    this.saveAll(list);
    return list;
  },

  deleteTrip(id) {
    if (typeof AuthModule !== 'undefined' && !AuthModule.canDelete()) return false;
    if (!id) return false;
    const list = this.getAll();
    const matches = list.filter(trip => String(trip.id || '') === String(id));
    if (matches.length !== 1) return false;
    const target = matches[0];
    if (!target) return false;
    this.saveAll(list.filter(trip => trip !== target));
    return true;
  },

  reset() {
    this.saveAll([]);
    return [];
  }
};

window.DataManager = DataManager;
