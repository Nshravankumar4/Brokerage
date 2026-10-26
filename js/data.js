/**
 * data.js - Data Store & Local Persistence Manager
 * SR Brokerage Ledger - Transport Brokerage Ledger Pvt Ltd
 * Fleet Logistics & Financial Accounts Management
 * Developed by Shravan Kumar
 * Pre-seeded directly with the exact records from BROKER DETAILS ADVANCE BALC DETAILS.xlsx
 * Master 28-Column Architecture (Columns A through AB)
 */

// Initialize cross-tab synchronization channel immediately
if (typeof window !== 'undefined' && 'BroadcastChannel' in window && !window.brokerSyncChannel) {
  try {
    window.brokerSyncChannel = new BroadcastChannel('broker_ledger_sync');
  } catch (e) {}
}

const CURRENT_WORKBOOK_TRIPS = [
  {
    row: 2,
    slNo: "1",
    trspName: "ANTP SAINATH",
    date: "20-08-2026",
    lrNo: "207",
    truckNo: "AP39UD3564",
    from: "LUCKNOW",
    to: "MEDCHAL",
    accountNo: "38216860303",
    ifsc: "SBIN0010659",
    paymentMade: "SBI BANK",
    fright: 60000,
    date1: "02-09-2026",
    topay: "TOBILLED",
    tm: 300,
    advance1: 49700,
    date2: "na",
    advance2: 0,
    date3: "na",
    advance3: 0,
    pod: "20-08-2026",
    cod: 10000,
    pendingTobilled: 10000,
    extraAmount: 0,
    payDate: "28-08-2026",
    pm: 200,
    finalBalc: 9800,
    podAmountStatus: 0,
    note: ""
  },
  {
    row: 3,
    slNo: "2",
    trspName: "SARITHA TRSP",
    date: "03-09-2026",
    lrNo: "208",
    truckNo: "TG15T6666",
    from: "RAIPUR",
    to: "MEDCHAL",
    accountNo: "0312035592",
    ifsc: "KKBK0008406",
    paymentMade: "KKBK BANK",
    fright: 60000,
    date1: "15-10-2026",
    topay: "TOBILLED",
    tm: 300,
    advance1: 49700,
    date2: "na",
    advance2: 0,
    date3: "na",
    advance3: 0,
    pod: "07-09-2026",
    cod: 10000,
    pendingTobilled: 10000,
    extraAmount: 5000,
    payDate: "29-08-2026",
    pm: 300,
    finalBalc: 14700,
    podAmountStatus: 0,
    note: "Halted"
  },
  {
    row: 4,
    slNo: "3",
    trspName: "CG RANCHI R/WAYS",
    date: "29-09-2026",
    lrNo: "195",
    truckNo: "CG08AZ4714",
    from: "MEDCHAL",
    to: "PANKANJUR",
    accountNo: "29122900001083",
    ifsc: "DCBL0000291",
    paymentMade: "DCB BANK",
    fright: 42000,
    date1: "01-10-2026",
    topay: "F/TO-PAY",
    tm: 0,
    advance1: 0,
    date2: "na",
    advance2: 0,
    date3: "na",
    advance3: 0,
    pod: "Pending",
    cod: 42000,
    pendingTobilled: 0,
    extraAmount: 0,
    payDate: "30-08-2026",
    pm: 0,
    finalBalc: 0,
    podAmountStatus: 0,
    note: "F/TO-PAY Shipment"
  },
  {
    row: 5,
    slNo: "4",
    trspName: "SARITHA TRSP",
    date: "01-10-2026",
    lrNo: "196",
    truckNo: "TG15T6666",
    from: "MEDCHAL",
    to: "MADHAPURA",
    accountNo: "0312035592",
    ifsc: "KKBK0008406",
    paymentMade: "KKBK BANK",
    fright: 90000,
    date1: "17-10-2026",
    topay: "A/TO-PAY",
    tm: 200,
    advance1: 49800,
    date2: "na",
    advance2: 0,
    date3: "na",
    advance3: 0,
    pod: "19-10-2026",
    cod: 40000,
    pendingTobilled: 0,
    extraAmount: 0,
    payDate: "31-08-2026",
    pm: 0,
    finalBalc: 0,
    podAmountStatus: 0,
    note: ""
  }
];

const CURRENT_WORKBOOK_STORAGE_VERSION = 'current-workbook-v1';
const LEGACY_WORKBOOK_VALUES = new Set(['65000', '110250', '231000', '135000']);

function normalizeTrip(trip) {
  const item = trip || {};
  const normalized = { ...item };
  delete normalized.pocDate;
  delete normalized.pocAmount;
  delete normalized.pocNotes;
  const s = String(normalized.topay || '').trim().toUpperCase();
  if (s.startsWith('F')) normalized.topay = 'F/TO-PAY';
  else if (s.startsWith('A')) normalized.topay = 'A/TO-PAY';
  else normalized.topay = 'TOBILLED';
  return normalized;
}

function isLegacyWorkbookData(list) {
  if (!Array.isArray(list) || list.length === 0) return false;

  if (list.length >= 10) {
    const hasLegacyValues = list.some(trip => {
      const freight = Number(trip && trip.fright);
      return LEGACY_WORKBOOK_VALUES.has(String(freight || '')) || String(trip && trip.lrNo || '').trim() === '';
    });
    if (hasLegacyValues) return true;
  }

  if (list.length === CURRENT_WORKBOOK_TRIPS.length) {
    const mismatched = list.some(trip => {
      const item = trip || {};
      const expected = CURRENT_WORKBOOK_TRIPS.find(sample => Number(sample.row) === Number(item.row));
      if (!expected) return true;
      const matches = String(item.trspName || '').trim() === String(expected.trspName || '').trim() &&
        Number(item.fright || 0) === Number(expected.fright || 0) &&
        String(item.topay || '').trim().toUpperCase() === String(expected.topay || '').trim().toUpperCase();
      return !matches;
    });
    return mismatched;
  }

  return list.length === 19;
}

const INITIAL_TRIPS = CURRENT_WORKBOOK_TRIPS;

const DataManager = {
  storageKey: 'broker_ledger_trips_v8_current_workbook',
  versionKey: 'broker_ledger_version_v8_current_workbook',

  getAll() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (isLegacyWorkbookData(parsed)) {
            this.saveAll(INITIAL_TRIPS);
            this.setVersion(CURRENT_WORKBOOK_STORAGE_VERSION);
            return JSON.parse(JSON.stringify(INITIAL_TRIPS));
          }
          this.setVersion(CURRENT_WORKBOOK_STORAGE_VERSION);
          return parsed.map(normalizeTrip);
        }
      }
    } catch (e) {}
    this.saveAll(INITIAL_TRIPS);
    this.setVersion(CURRENT_WORKBOOK_STORAGE_VERSION);
    return JSON.parse(JSON.stringify(INITIAL_TRIPS));
  },

  saveAll(list) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(list.map(normalizeTrip)));
      this.setVersion(CURRENT_WORKBOOK_STORAGE_VERSION);
      // Broadcast to other open tabs
      if (window.brokerSyncChannel) {
        window.brokerSyncChannel.postMessage({ type: 'trips_updated', timestamp: Date.now() });
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('broker_trips_updated', { detail: { timestamp: Date.now() } }));
      }
    } catch (e) {}
  },

  getVersion() {
    return localStorage.getItem(this.versionKey) || '1';
  },

  setVersion(v) {
    if (v) {
      localStorage.setItem(this.versionKey, String(v));
    }
  },

  getTrip(rowNum) {
    const list = this.getAll();
    return list.find(t => t.row === rowNum) || null;
  },

  isDuplicateLr(lrNo, excludeRow = null) {
    if (!lrNo) return null;
    const target = String(lrNo).trim().toUpperCase();
    const list = this.getAll();
    return list.find(t => {
      const existing = String(t.lrNo || '').trim().toUpperCase();
      if (!existing) return false;
      return existing === target && (excludeRow === null || t.row !== excludeRow);
    }) || null;
  },

  saveTrip(trip) {
    // Auto-calculate exact balances matching 28-column master engine
    if (typeof CalculationEngine !== 'undefined') {
      const calc = CalculationEngine.calculate(trip);
      trip.cod = calc.cod;
      trip.pendingTobilled = calc.pendingTobilled;
      trip.balc = calc.pendingTobilled;
      trip.finalBalc = calc.finalBalc;
      trip.podAmountStatus = calc.podAmountStatus;
    }
    const list = this.getAll();
    const idx = list.findIndex(t => t.row === trip.row);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...trip };
    } else {
      list.push(trip);
    }
    this.saveAll(list);
    return list;
  },

  deleteTrip(rowNum) {
    if (typeof AuthModule !== 'undefined' && !AuthModule.canDelete()) {
      return false;
    }
    const list = this.getAll().filter(t => t.row !== rowNum);
    this.saveAll(list);
    return true;
  },

  reset() {
    this.saveAll(INITIAL_TRIPS);
    this.setVersion('1');
    return JSON.parse(JSON.stringify(INITIAL_TRIPS));
  }
};

window.DataManager = DataManager;
