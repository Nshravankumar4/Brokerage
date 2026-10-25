/**
 * data.js - Data Store & Local Persistence Manager
 * SR Brokerage Ledger • Transport Brokerage Ledger Pvt Ltd
 * Fleet Logistics & Financial Accounts Management
 * Developed by Shravan Kumar
 * Pre-seeded directly with the exact records from BROKER DETAILS ADVANCE BALC DETAILS.xlsx
 */

// Initialize cross-tab synchronization channel immediately
if (typeof window !== 'undefined' && 'BroadcastChannel' in window && !window.brokerSyncChannel) {
  try {
    window.brokerSyncChannel = new BroadcastChannel('broker_ledger_sync');
  } catch (e) {}
}

const INITIAL_TRIPS = [
  { row: 2, slNo: "1", trspName: "ANTP SAINATH", date: "20-08-2026", lrNo: "207", truckNo: "AP39UD3564", from: "LUCKNOW", to: "MEDCHAL", accountNo: "38216860303", ifsc: "SBIN0010659", paymentMade: "SBI BANK", fright: 65000, date1: "02-09-2026", topay: "TOBILLED", tm: 0, advance1: 65000, date2: "", advance2: 0, date3: "", advance3: 0, cod: 0, pm: 0, payDate: "", pmFinal: 0, pod: "29-08-2026", note: "" },
  { row: 3, slNo: "2", trspName: "SARITHA TRSP", date: "03-09-2026", lrNo: "208", truckNo: "TG15T6666", from: "RAIPUR", to: "MEDCHAL", accountNo: "0312035592", ifsc: "KKBK0008406", paymentMade: "KKBK BANK", fright: 110250, date1: "15-10-2026", topay: "TOBILLED", tm: 0, advance1: 110250, date2: "", advance2: 0, date3: "", advance3: 0, cod: 0, pm: 0, payDate: "", pmFinal: 0, pod: "07-09-2026", note: "" },
  { row: 4, slNo: "3", trspName: "SARITHA TRSP", date: "10-09-2026", lrNo: "190", truckNo: "TG15T6666", from: "MEDCHAL", to: "COOCHBEHAR", accountNo: "0312035592", ifsc: "KKBK0008406", paymentMade: "KKBK BANK", fright: 231000, date1: "", topay: "TOBILLED", tm: 0, advance1: 0, date2: "", advance2: 0, date3: "", advance3: 0, cod: 0, pm: 0, payDate: "", pmFinal: 0, pod: "25-09-2026", note: "" },
  { row: 5, slNo: "4", trspName: "MISHRA PIWARAN", date: "12-09-2026", lrNo: "191/192", truckNo: "RJ14GN7169", from: "MEDCHAL", to: "RAIGUNJ&DALKOLA", accountNo: "279805000462", ifsc: "ICIC0002798", paymentMade: "ICICI BANK", fright: 135000, date1: "16-09-2026", topay: "TOBILLED", tm: 200, advance1: 124800, date2: "", advance2: 0, date3: "", advance3: 0, cod: 0, pm: 200, payDate: "", pmFinal: 0, pod: "05-10-2026", note: "" },
  { row: 6, slNo: "5", trspName: "ANDHRA GORKARPUR", date: "16-09-2026", lrNo: "193/194", truckNo: "UP38T6479", from: "MEDCHAL", to: "SABDHAN/KALIACHAK", accountNo: "52641131001394", ifsc: "PUNB0219910", paymentMade: "PNB BANK", fright: 130000, date1: "18-09-2026", topay: "TOBILLED", tm: 0, advance1: 100000, date2: "21-09-2026", advance2: 20000, date3: "", advance3: 0, cod: 0, pm: 0, payDate: "", pmFinal: 0, pod: "10-10-2026", note: "" },
  { row: 7, slNo: "6", trspName: "ABHISHEK TRSP", date: "19-09-2026", lrNo: "209", truckNo: "TS05UF1719", from: "MEDCHAL", to: "MURISIRABAD", accountNo: "23405500018", ifsc: "ICIC0002384", paymentMade: "ICICI BANK", fright: 134750, date1: "21-09-2026", topay: "TOBILLED", tm: 0, advance1: 100000, date2: "", advance2: 0, date3: "", advance3: 0, cod: 0, pm: 0, payDate: "", pmFinal: 0, pod: "", note: "41BAGS WET CONDITION" },
  { row: 8, slNo: "7", trspName: "SARITHA TRSP", date: "24-09-2026", lrNo: "210/211", truckNo: "TS15UE1122", from: "MEDCHAL", to: "ARRARIYA/PURNIA", accountNo: "0312035592", ifsc: "KKBK0008406", paymentMade: "KKBK BANK", fright: 155000, date1: "", topay: "TOBILLED", tm: 0, advance1: 0, date2: "", advance2: 0, date3: "", advance3: 0, cod: 0, pm: 0, payDate: "", pmFinal: 0, pod: "05-10-2026", note: "" },
  { row: 9, slNo: "8", trspName: "CG RANCHI R/WAYS", date: "29-09-2026", lrNo: "195", truckNo: "CG08AZ4714", from: "MEDCHAL", to: "PANKANJUR", accountNo: "29122900001083", ifsc: "DCBL0000291", paymentMade: "DCB BANK", fright: 42000, date1: "01-10-2026", topay: "F/TO-PAY", tm: 0, advance1: 0, date2: "", advance2: 0, date3: "", advance3: 0, cod: 0, pm: 0, payDate: "", pmFinal: 0, pod: "", note: "F/TO-PAY Shipment" },
  { row: 10, slNo: "9", trspName: "SARITHA TRSP", date: "01-10-2026", lrNo: "196", truckNo: "TG15T6666", from: "MEDCHAL", to: "MADHAPURA", accountNo: "0312035592", ifsc: "KKBK0008406", paymentMade: "KKBK BANK", fright: 175000, date1: "", topay: "TOBILLED", tm: 0, advance1: 0, date2: "", advance2: 0, date3: "", advance3: 0, cod: 0, pm: 0, payDate: "", pmFinal: 0, pod: "19-10-2026", note: "" },
  { row: 11, slNo: "10", trspName: "SARITHA TRSP", date: "06-10-2026", lrNo: "212", truckNo: "TS15UE1122", from: "MEDCHAL", to: "MUZUFFARPUR", accountNo: "0312035592", ifsc: "KKBK0008406", paymentMade: "KKBK BANK", fright: 141000, date1: "", topay: "TOBILLED", tm: 0, advance1: 0, date2: "", advance2: 0, date3: "", advance3: 0, cod: 0, pm: 0, payDate: "", pmFinal: 0, pod: "19-10-2026", note: "" },
  { row: 12, slNo: "11", trspName: "ANTP SAINATH", date: "08-10-2026", lrNo: "213", truckNo: "AP39UD3564", from: "MEDCHAL", to: "BEGUSARAI", accountNo: "38216860303", ifsc: "SBIN0010659", paymentMade: "SBI BANK", fright: 136500, date1: "17-10-2026", topay: "TOBILLED", tm: 0, advance1: 126000, date2: "", advance2: 567, date3: "", advance3: 667, cod: 0, pm: 500, payDate: "", pmFinal: 266, pod: "19-10-2026", note: "" },
  { row: 13, slNo: "12", trspName: "MISHRA PIWARAN", date: "09-10-2026", lrNo: "214", truckNo: "JH02BM3030", from: "MEDCHAL", to: "PURNIA", accountNo: "279805000462", ifsc: "ICIC0002798", paymentMade: "ICICI BANK", fright: 154000, date1: "15-10-2026", topay: "TOBILLED", tm: 500, advance1: 143750, date2: "", advance2: 0, date3: "", advance3: 0, cod: 0, pm: 300, payDate: "", pmFinal: 0, pod: "", note: "" },
  { row: 14, slNo: "13", trspName: "MISHRA PIWARAN", date: "10-10-2026", lrNo: "215", truckNo: "BR44GB0148", from: "MEDCHAL", to: "MOTHIHARI", accountNo: "279805000462", ifsc: "ICIC0002798", paymentMade: "ICICI BANK", fright: 157500, date1: "15-10-2026", topay: "TOBILLED", tm: 300, advance1: 147200, date2: "", advance2: 0, date3: "", advance3: 0, cod: 0, pm: 300, payDate: "", pmFinal: 0, pod: "", note: "" },
  { row: 15, slNo: "14", trspName: "MISHRA PIWARAN", date: "13-10-2026", lrNo: "2106", truckNo: "HR56C4156", from: "MEDCHAL", to: "ARRARIYA", accountNo: "279805000462", ifsc: "ICIC0002798", paymentMade: "ICICI BANK", fright: 162750, date1: "17-10-2026", topay: "TOBILLED", tm: 300, advance1: 152450, date2: "", advance2: 0, date3: "", advance3: 0, cod: 0, pm: 300, payDate: "", pmFinal: 0, pod: "", note: "" },
  { row: 16, slNo: "15", trspName: "MISHRA PIWARAN", date: "14-10-2026", lrNo: "197/198", truckNo: "UP60BT2385", from: "MEDCHAL", to: "ARRARIYA/KALIGUNJ", accountNo: "279805000462", ifsc: "ICIC0002798", paymentMade: "ICICI BANK", fright: 171500, date1: "", topay: "TOBILLED", tm: 300, advance1: 0, date2: "", advance2: 0, date3: "", advance3: 0, cod: 0, pm: 0, payDate: "", pmFinal: 0, pod: "", note: "" },
  { row: 17, slNo: "16", trspName: "ANTP SAINATH", date: "17-10-2026", lrNo: "217/218", truckNo: "AP02TH2345", from: "MEDCHAL", to: "BHAGALPUR/PURNIA", accountNo: "38216860303", ifsc: "SBIN0010659", paymentMade: "SBI BANK", fright: 158000, date1: "", topay: "TOBILLED", tm: 0, advance1: 50000, date2: "", advance2: 0, date3: "", advance3: 0, cod: 108000, pm: 0, payDate: "", pmFinal: 0, pod: "", note: "" },
  { row: 18, slNo: "17", trspName: "MISHRA PIWARAN", date: "18-10-2026", lrNo: "219", truckNo: "UP61BT7437", from: "MEDCHAL", to: "COOCHBEHAR", accountNo: "279805000462", ifsc: "ICIC0002798", paymentMade: "ICICIBANK", fright: 200000, date1: "", topay: "A/TO-PAY", tm: 0, advance1: 0, date2: "", advance2: 0, date3: "", advance3: 0, cod: 0, pm: 0, payDate: "", pmFinal: 0, pod: "", note: "" },
  { row: 19, slNo: "18", trspName: "MISHRA PIWARAN", date: "19-10-2026", lrNo: "2106", truckNo: "HR56C4156", from: "MEDCHAL", to: "ARRARIYA", accountNo: "279805000462", ifsc: "ICIC0002798", paymentMade: "ICICI BANK", fright: 50000, date1: "", topay: "A/TO-PAY", tm: 200, advance1: 19800, date2: "", advance2: 0, date3: "", advance3: 0, cod: 30000, pm: 0, payDate: "", pmFinal: 0, pod: "", note: "" },
  { row: 20, slNo: "19", trspName: "MISHRA PIWARAN", date: "20-10-2026", lrNo: "2106", truckNo: "HR56C4156", from: "MEDCHAL", to: "ARRARIYA", accountNo: "279805000462", ifsc: "ICIC0002798", paymentMade: "ICICI BANK", fright: 60000, date1: "", topay: "A/TO-PAY", tm: 300, advance1: 29700, date2: "", advance2: 0, date3: "", advance3: 0, cod: 30000, pm: 0, payDate: "", pmFinal: 0, pod: "", note: "" }
];

const DataManager = {
  storageKey: 'broker_ledger_trips_v6',
  versionKey: 'broker_ledger_version_v6',

  getAll() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(t => {
            const s = String(t.topay || '').trim().toUpperCase();
            if (s.startsWith('F')) t.topay = 'F/TO-PAY';
            else if (s.startsWith('A')) t.topay = 'A/TO-PAY';
            else t.topay = 'TOBILLED';
            return t;
          });
        }
      }
    } catch (e) {}
    // Initialize with fresh verified records
    this.saveAll(INITIAL_TRIPS);
    return JSON.parse(JSON.stringify(INITIAL_TRIPS));
  },

  saveAll(list) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(list));
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
    // Auto-calculate balc & finalBalc to ensure persistent mathematical integrity
    if (typeof CalculationEngine !== 'undefined') {
      const calc = CalculationEngine.calculate(trip);
      trip.balc = calc.balc;
      trip.finalBalc = calc.finalBalc;
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
      alert('Access Denied: Only Administrator has permission to delete trips!');
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
