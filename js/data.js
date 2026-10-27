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

const CURRENT_WORKBOOK_SCHEMA_VERSION = 'current-workbook-v1';

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
  if (!normalized.sheetName) {
    normalized.sheetName = normalized.topay === 'F/TO-PAY'
      ? 'F-TO-PAY'
      : normalized.topay === 'A/TO-PAY' ? 'A-TO-PAY' : 'TOBILLED';
  }
  return normalized;
}

const INITIAL_TRIPS = CURRENT_WORKBOOK_TRIPS;

const DataManager = {
  storageKey: 'broker_ledger_trips_v8_current_workbook',
  versionKey: 'broker_ledger_cloud_version_v1',
  schemaVersionKey: 'broker_ledger_schema_v1',

  getAll() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data !== null) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          localStorage.setItem(this.schemaVersionKey, CURRENT_WORKBOOK_SCHEMA_VERSION);
          return parsed.map(normalizeTrip);
        }
      }
    } catch (e) {
      return [];
    }
    return [];
  },

  saveAll(list) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(list.map(normalizeTrip)));
      localStorage.setItem(this.schemaVersionKey, CURRENT_WORKBOOK_SCHEMA_VERSION);
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

  getTrip(rowNum, optSheetName = null) {
    const list = this.getAll();
    return list.find(t => Number(t.row) === Number(rowNum) &&
      (!optSheetName || String(t.sheetName || '').trim() === String(optSheetName).trim())) || null;
  },

  isDuplicateLr(lrNo, excludeRow = null, excludeSheet = null) {
    if (!lrNo) return null;
    const target = String(lrNo).trim().toUpperCase();
    const list = this.getAll();
    return list.find(t => {
      const existing = String(t.lrNo || '').trim().toUpperCase();
      if (!existing) return false;
      const sameSheet = excludeSheet
        ? String(t.sheetName || '').trim() === String(excludeSheet).trim()
        : !t.sheetName;
      const isSame = (excludeRow !== null && Number(t.row) === Number(excludeRow) && sameSheet);
      return existing === target && !isSame;
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
      if (!trip.podAmountStatus || trip.podAmountStatus === 0 || trip.podAmountStatus === '0') {
        trip.podAmountStatus = (!calc.isPodMissing || trip.pod) ? 'DONE' : 'PENDING';
      }
    }
    const list = this.getAll();
    const tripSheet = trip.sourceSheet || trip.sheetName || '';
    const idx = trip.isAdd || Number(trip.row) < 2 ? -1 : list.findIndex(t =>
      Number(t.row) === Number(trip.row) &&
      (!tripSheet || String(t.sheetName || '').trim() === String(tripSheet).trim()));
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...trip };
    } else {
      list.push(trip);
    }
    this.saveAll(list);
    return list;
  },

  deleteTrip(rowNum, optSheetName = null) {
    if (typeof AuthModule !== 'undefined' && !AuthModule.canDelete()) {
      return false;
    }
    const cleanSheet = optSheetName ? String(optSheetName).trim() : null;
    const list = this.getAll().filter(t => {
      if (cleanSheet) {
        return !(Number(t.row) === Number(rowNum) && String(t.sheetName || '').trim() === cleanSheet);
      }
      return Number(t.row) !== Number(rowNum);
    });
    if (cleanSheet) {
      list.forEach(trip => {
        if (String(trip.sheetName || '').trim() === cleanSheet && Number(trip.row) > Number(rowNum)) {
          trip.row = Number(trip.row) - 1;
        }
      });
    }
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
