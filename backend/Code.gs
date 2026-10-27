/**
 * TRANSPORT BROKERAGE LEDGER PVT LTD
 * SR Brokerage Ledger - Google Apps Script Backend (Upgrade 1.2 - Physical Worksheets)
 *
 * Physical Worksheets Architecture:
 * 1. TOBILLED  -> physical worksheet TOBILLED
 * 2. A/TO-PAY  -> physical worksheet A/TO-PAY (or A-TO-PAY)
 * 3. F/TO-PAY  -> physical worksheet F/TO-PAY (or F-TO-PAY)
 * Master Backup: final
 *
 * Database: 28 columns, A:AB
 * A:SL NO       B:TRSP NAME       C:DATE
 * D:LR NO       E:TRUCK NO        F:FROM
 * G:TO          H:ACCOUNT NO      I:IFSC CODE
 * J:PAYMENT MADE K:FRIGHT         L:DATE
 * M:ToPayStatus N:T/M             O:ADVANCE
 * P:DATE 2      Q:ADVANCE2        R:DATE3
 * S:ADVANCE3    T:POD RECD Date   U:COD
 * V:Pending ToBilled              W:Extra Amount
 * X:PM/PA Date  Y:P/M             Z:Pending Amount
 * AA:POD Amount Status            AB:REMARKS / NOTE
 */

'use strict';

var SHEET_NAME = 'final';
var BACKUP_FOLDER_NAME = 'Brokerage_Backups';
var SPREADSHEET_ID = '1wCu03TqXMhokFYarECDBCFDd_dMWx5LpLtiZL2iryiU';

var PHYSICAL_SHEET_CANDIDATES = {
  'TOBILLED': ['TOBILLED', 'TO-BILLED', 'TO_BILLED'],
  'A/TO-PAY': ['A/TO-PAY', 'A-TO-PAY', 'A_TO_PAY', 'ATO-PAY'],
  'F/TO-PAY': ['F/TO-PAY', 'F-TO-PAY', 'F_TO_PAY', 'FTO-PAY']
};

var HEADERS = [
  'SL NO',
  'TRSP NAME',
  'DATE',
  'LR NO',
  'TRUCK NO',
  'FROM',
  'TO',
  'ACCOUNT NO',
  'IFSC CODE',
  'PAYMENT MADE',
  'FRIGHT',
  'DATE',
  'ToPayStatus',
  'T/M',
  'ADVANCE',
  'DATE 2',
  'ADVANCE2',
  'DATE3',
  'ADVANCE3',
  'POD RECD Date',
  'Cash on Delivery (COD) :A/Topay&Ftopay',
  'Pending Amount: Tobilled',
  'Extra Amount',
  'PM/PA Date',
  'P/M',
  'Pending Amount',
  'POD Amount Status',
  'REMARKS / NOTE'
];

function cleanSpreadsheetId(value) {
  var str = String(value || '').trim();
  var match = str.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : str;
}

function getSpreadsheet(optId) {
  var cleanId = cleanSpreadsheetId(optId);
  if (cleanId) {
    try {
      return SpreadsheetApp.openById(cleanId);
    } catch (eClean) {
      Logger.log('Could not open optId ' + cleanId + ': ' + eClean);
    }
  }

  try {
    var activeSs = SpreadsheetApp.getActiveSpreadsheet();
    if (activeSs) return activeSs;
  } catch (eActive) {}

  var propId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  var id = cleanSpreadsheetId(SPREADSHEET_ID || propId);
  if (id) {
    var ss = SpreadsheetApp.openById(id);
    PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ss.getId());
    return ss;
  }

  throw new Error('Configure SPREADSHEET_ID before using the API.');
}

/**
 * Custom UI Menu for Google Sheets:
 * Allows user to trigger split, migration, and sheet cleanup directly from Google Sheets.
 */
function onOpen() {
  try {
    var ui = SpreadsheetApp.getUi();
    ui.createMenu('Transport Brokerage Ledger')
      .addItem('1. Seed Initial Data (TOBILLED, A-TO-PAY, F-TO-PAY)', 'seedInitialData')
      .addItem('2. Split & Migrate into 3 Physical Sheets', 'initializeAndMigrateAllWorksheets')
      .addItem('3. Delete Empty Sheet1', 'deleteEmptySheet1')
      .addItem('4. Format Headers & Set Styles', 'formatAllWorksheets')
      .addToUi();
  } catch (e) {
    Logger.log('onOpen menu note: ' + e);
  }
}

function deleteEmptySheet1() {
  var ss = getSpreadsheet();
  var sheet1 = ss.getSheetByName('Sheet1');
  if (sheet1) {
    if (sheet1.getLastRow() <= 1) {
      ss.deleteSheet(sheet1);
      return 'Deleted empty Sheet1 successfully.';
    } else {
      return 'Sheet1 contains data; kept for safety.';
    }
  }
  return 'Sheet1 does not exist.';
}

function formatAllWorksheets() {
  var ss = getSpreadsheet();
  var targetCategories = ['TOBILLED', 'A/TO-PAY', 'F/TO-PAY'];
  for (var c = 0; c < targetCategories.length; c++) {
    var ws = resolveWorksheet(ss, targetCategories[c]);
    if (ws) {
      ensureHeaders(ws);
      ws.setFrozenRows(1);
      try {
        ws.getRange(1, 1, 1, HEADERS.length)
          .setFontWeight('bold')
          .setBackground('#1e293b')
          .setFontColor('#ffffff');
      } catch (eStyle) {}
    }
  }
  return 'Formatted all physical worksheets.';
}

/**
 * Resolves the physical destination worksheet for a given business status.
 * Accepts 'TOBILLED', 'A/TO-PAY', or 'F/TO-PAY'.
 */
function resolveWorksheet(ss, status) {
  var norm = normalizeToPayStatus(status);
  var candidates = PHYSICAL_SHEET_CANDIDATES[norm] || ['TOBILLED'];

  for (var i = 0; i < candidates.length; i++) {
    var sh = ss.getSheetByName(candidates[i]);
    if (sh) {
      ensureHeaders(sh);
      return sh;
    }
  }

  // Not found: Create physical sheet with Google Sheets-compliant name (no slashes)
  var preferredName = (norm === 'A/TO-PAY') ? 'A-TO-PAY' : (norm === 'F/TO-PAY' ? 'F-TO-PAY' : 'TOBILLED');
  try {
    var newSheet = ss.insertSheet(preferredName);
    ensureHeaders(newSheet);
    return newSheet;
  } catch (e) {
    // Fallback if Google Sheets blocks slash character
    var safeName = preferredName.replace('/', '-');
    var existingSafe = ss.getSheetByName(safeName);
    if (existingSafe) {
      ensureHeaders(existingSafe);
      return existingSafe;
    }
    var fallbackSheet = ss.insertSheet(safeName);
    ensureHeaders(fallbackSheet);
    return fallbackSheet;
  }
}

function ensureHeaders(sheet) {
  if (sheet.getLastRow() < 1) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
    try {
      sheet.getRange(1, 1, 1, HEADERS.length)
        .setFontWeight('bold')
        .setBackground('#1e3a8a')
        .setFontColor('#ffffff');
    } catch (eStyle) {}
  }
  if (sheet.getMaxColumns() < HEADERS.length) {
    sheet.insertColumnsAfter(
      sheet.getMaxColumns(),
      HEADERS.length - sheet.getMaxColumns()
    );
  }

  // Remove unwanted/non-applicable column from display per physical worksheet
    var sName = String(sheet.getName() || '').toUpperCase();
  try {
    sheet.showColumns(1, HEADERS.length);
    if (sName.indexOf('TOBILLED') !== -1 || sName.indexOf('TO-BILLED') !== -1) {
      // Column U (21): COD is not used in TOBILLED
      sheet.hideColumns(21);
    } else if (sName.indexOf('A-TO-PAY') !== -1 || sName.indexOf('A/TO-PAY') !== -1 || sName.indexOf('ATO-PAY') !== -1) {
      // Column V (22): Pending ToBilled is not used in A/TO-PAY
      sheet.hideColumns(22);
    } else if (sName.indexOf('F-TO-PAY') !== -1 || sName.indexOf('F/TO-PAY') !== -1 || sName.indexOf('FTO-PAY') !== -1) {
      // Column V (22): Pending ToBilled is not used in F/TO-PAY
      sheet.hideColumns(22);
    }
  } catch (errHide) {
    Logger.log('Column visibility note: ' + errHide);
  }
}

function getOrCreateSheet(optId) {
  var ss = getSpreadsheet(optId);
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }

  ensureHeaders(sheet);
  return sheet;
}

/**
 * Migrate existing transactions from historical 'final' sheet
 * to the three physical worksheets without data loss or duplication.
 */
function migrateHistoricalFinalRecords(ss) {
  if (!ss) return 0;

  // Safely remove unwanted empty default 'Sheet1' created by Google Sheets
  try {
    var defaultSheet1 = ss.getSheetByName('Sheet1');
    if (defaultSheet1 && defaultSheet1.getLastRow() <= 1) {
      ss.deleteSheet(defaultSheet1);
    }
  } catch (eSheet1) {
    Logger.log('Sheet1 cleanup note: ' + eSheet1);
  }

  var finalSheet = ss.getSheetByName(SHEET_NAME);
  if (!finalSheet) return 0;

  var lastRow = finalSheet.getLastRow();
  if (lastRow < 2) return 0;

  var values = finalSheet.getRange(2, 1, lastRow - 1, 28).getValues();
  var count = 0;

  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    if (!row[0] && !row[1] && !row[3]) continue;

    var status = normalizeToPayStatus(row[12]);
    var targetSheet = resolveWorksheet(ss, status);
    var lr = String(row[3] || '').trim().toUpperCase();

    // Check if record already exists in destination
    var targetLastRow = targetSheet.getLastRow();
    var exists = false;
    if (targetLastRow >= 2 && lr) {
      var destValues = targetSheet.getRange(2, 4, targetLastRow - 1, 1).getValues();
      for (var d = 0; d < destValues.length; d++) {
        if (String(destValues[d][0] || '').trim().toUpperCase() === lr) {
          exists = true;
          break;
        }
      }
    }

        if (!exists) {
      targetSheet.appendRow(row);
      count++;
    }
  }

  // Safely delete empty Sheet1
  try {
    var defaultSheet1 = ss.getSheetByName('Sheet1');
    if (defaultSheet1 && ss.getSheets().length > 1) {
      ss.deleteSheet(defaultSheet1);
    }
  } catch (eSheet1) {
    Logger.log('Sheet1 cleanup note: ' + eSheet1);
  }

  // Safely remove legacy 'final' sheet so ONLY the 3 physical worksheets remain
  try {
    if (finalSheet && ss.getSheets().length > 1) {
      ss.deleteSheet(finalSheet);
      Logger.log('Legacy final sheet safely deleted after migration.');
    }
  } catch (eFinal) {
    Logger.log('final sheet cleanup note: ' + eFinal);
  }

  SpreadsheetApp.flush();
  Logger.log('Migrated ' + count + ' records from final to physical worksheets.');
  return count;
}

function runMigrateToPhysicalSheets() {
  var ss = getSpreadsheet();
  resolveWorksheet(ss, 'TOBILLED');
  resolveWorksheet(ss, 'A/TO-PAY');
  resolveWorksheet(ss, 'F/TO-PAY');
  var count = migrateHistoricalFinalRecords(ss);
  return 'Success: Migrated ' + count + ' records to physical worksheets without duplicates.';
}

function initializeAndMigrateAllWorksheets() {
  return runMigrateToPhysicalSheets();
}

function setupInitialSheet() {
  var ss = getSpreadsheet();
  resolveWorksheet(ss, 'TOBILLED');
  resolveWorksheet(ss, 'A/TO-PAY');
  resolveWorksheet(ss, 'F/TO-PAY');
  var count = migrateHistoricalFinalRecords(ss);
  if (count === 0) {
    seedInitialData();
  }
  Logger.log('Ledger URL: ' + ss.getUrl());
  return ss.getUrl();
}

var SEED_TRIPS = [
  {
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
    cod: "if Tobilled NA",
    pendingTobilled: 10000,
    extraAmount: 0,
    payDate: "28-08-2026",
    pm: 200,
    finalBalc: 9800,
    podAmountStatus: "DONE",
    note: ""
  },
  {
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
    cod: "if Tobilled NA",
    pendingTobilled: 10000,
    extraAmount: 5000,
    payDate: "29-08-2026",
    pm: 300,
    finalBalc: 14700,
    podAmountStatus: "DONE",
    note: "Halted"
  },
  {
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
    pendingTobilled: "if A/Topay&Ftopay Na",
    extraAmount: 0,
    payDate: "30-08-2026",
    pm: 0,
    finalBalc: 0,
    podAmountStatus: 0,
    note: "F/TO-PAY Shipment"
  },
  {
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
    pendingTobilled: "if A/Topay&Ftopay Na",
    extraAmount: 0,
    payDate: "31-08-2026",
    pm: 0,
    finalBalc: 0,
    podAmountStatus: "DONE",
    note: ""
  }
];

function seedInitialData(optId) {
  var ss = getSpreadsheet(optId);
  var inserted = 0;

  for (var i = 0; i < SEED_TRIPS.length; i++) {
    var t = SEED_TRIPS[i];
    var targetSheet = resolveWorksheet(ss, t.topay);
    var lr = String(t.lrNo).trim().toUpperCase();

    var lastRow = targetSheet.getLastRow();
    var exists = false;
    if (lastRow >= 2) {
      var vals = targetSheet.getRange(2, 4, lastRow - 1, 1).getValues();
      for (var j = 0; j < vals.length; j++) {
        if (String(vals[j][0] || '').trim().toUpperCase() === lr) {
          exists = true;
          break;
        }
      }
    }

    if (!exists) {
      var rowData = [
        t.slNo,
        t.trspName,
        t.date,
        t.lrNo,
        t.truckNo,
        t.from,
        t.to,
        t.accountNo,
        t.ifsc,
        t.paymentMade,
        t.fright,
        t.date1,
        t.topay,
        t.tm,
        t.advance1,
        t.date2,
        t.advance2,
        t.date3,
        t.advance3,
        t.pod,
        t.cod,
        t.pendingTobilled,
        t.extraAmount,
        t.payDate,
        t.pm,
        t.finalBalc,
        t.podAmountStatus,
        t.note
      ];
      targetSheet.appendRow(rowData);
      inserted++;
    }
  }

  SpreadsheetApp.flush();
  Logger.log('Seeded ' + inserted + ' initial records into physical worksheets.');
  return 'Seeded ' + inserted + ' initial records into physical worksheets.';
}

// =====================================================
// CALCULATION ENGINE
// =====================================================

function normalizeToPayStatus(value) {
  var s = String(value || '').trim().toUpperCase();
  if (s.indexOf('F') === 0 || s === 'FULL') return 'F/TO-PAY';
  if (s.indexOf('A') === 0 || s === 'ADV') return 'A/TO-PAY';
  return 'TOBILLED';
}

function amount(value) {
  if (value === '' || value === null || value === undefined) return 0;
  if (typeof value === 'string') {
    value = value.trim();
    if (/^(?:N\/?A|NA|NONE|NULL|-)$/i.test(value)) return 0;
    value = value.replace(/[\s,\u20B9]/g, '').replace(/^(?:INR|RS\.?)/i, '').replace(/\/-$/, '');
    if (value === '') return 0;
  }
  var n = Number(value);
  if (!Number.isFinite(n)) throw new Error('Invalid numeric amount: ' + value);
  return n;
}

function calculateLedgerAmounts(input) {
  var freight = amount(input.freight);
  var tm = amount(input.tm);
  var adv1 = amount(input.advance1);
  var adv2 = amount(input.advance2);
  var adv3 = amount(input.advance3);
  var extraAmount = amount(input.extraAmount);
  var pm = amount(input.pm);

  var status = normalizeToPayStatus(input.status);
  var totalAdvances = adv1 + adv2 + adv3;

  var cod = 0;
  var pendingTobilled = 0;
  var intermediateBalance = 0;
  var finalPending = 0;
  var finalBalc = 0;

  if (status === 'F/TO-PAY') {
    cod = input.codProvided ? amount(input.cod) : freight;
    intermediateBalance = 0;
    pendingTobilled = 0;
    finalPending = 0;
    finalBalc = 0;
  } else if (status === 'A/TO-PAY') {
    cod = input.codProvided ? amount(input.cod) : Math.max(0, freight - tm - totalAdvances);
    intermediateBalance = 0;
    pendingTobilled = 0;
    finalPending = Math.max(0, freight - tm - adv1 - cod);
    finalBalc = finalPending;
  } else {
    cod = 0;
    // Formula requirement: pendingTobilled = fright - tm - totalAdvances
    pendingTobilled = freight - tm - totalAdvances;
    intermediateBalance = pendingTobilled;
    finalPending = pendingTobilled + extraAmount - pm;
    // Formula requirement: finalBalc = pendingTobilled + extraAmount - pm
    finalBalc = pendingTobilled + extraAmount - pm;
  }

  // POD Amount Status resolution (Col AA)
  var rawPod = String(input.pod || '').trim();
  var hasValidPodDate = Boolean(rawPod && !/^(pending|na|empty|if date.*)$/i.test(rawPod));
  var podAmountStatus = 'PENDING';

  if (status === 'TOBILLED') {
    // TOBILLED requires both received POD document and settled balance
    if (hasValidPodDate && finalPending <= 0) {
      podAmountStatus = 'DONE';
    } else {
      podAmountStatus = 'PENDING';
    }
  } else {
    // A/TO-PAY and F/TO-PAY: Settled upon POD receipt at unloading
    if (hasValidPodDate) {
      podAmountStatus = 'DONE';
    } else {
      podAmountStatus = 'PENDING';
    }
  }

  return {
    status: status,
    totalAdvances: totalAdvances,
    cod: cod,
    pendingTobilled: pendingTobilled,
    intermediateBalance: intermediateBalance,
    extraAmount: extraAmount,
    pm: pm,
    finalPending: finalPending,
    finalBalc: finalBalc,
    podAmountStatus: podAmountStatus
  };
}

function calculateSheetRow(r) {
  return calculateLedgerAmounts({
    freight: r[10],
    status: r[12],
    tm: r[13],
    advance1: r[14],
    advance2: r[16],
    advance3: r[18],
    pod: r[19],
    cod: r[20],
    codProvided: r[20] !== '' && r[20] !== null && r[20] !== undefined && String(r[20]).toLowerCase() !== 'if tobilled na',
    extraAmount: r[22],
    payDate: r[23],
    pm: r[24],
    podAmountStatus: r[26]
  });
}

// =====================================================
// JSON API
// =====================================================

function jsonOutput(data, callback) {
  var json = JSON.stringify(data);
  if (callback) {
    if (!/^[a-zA-Z_$][0-9a-zA-Z_$.]*$/.test(callback)) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Invalid JSONP callback.' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var params = (e && e.parameter) || {};
  var action = params.action || 'getAll';
  var callback = params.callback || null;
  var result;

  try {
    if (action === 'getAll') {
      result = handleGetAll(params.sheetId);
    } else if (action === 'getVersion') {
      result = { status: 'success', version: getVersion() };
    } else if (action === 'migrate') {
      result = { status: 'success', message: runMigrateToPhysicalSheets() };
    } else if (action === 'seed') {
      result = { status: 'success', message: seedInitialData(params.sheetId) };
    } else {
      result = { status: 'error', message: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { status: 'error', message: String(err.message || err) };
  }

  return jsonOutput(result, callback);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  var acquired = false;
  var result;

  try {
    lock.waitLock(15000);
    acquired = true;

    var data = {};
    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    var action = data.action || 'saveTrip';
    var sheetId = data.sheetId || ((e && e.parameter && e.parameter.sheetId) || null);
    var adminActions = ['deleteTrip', 'restoreDatabase', 'backupDatabase'];

    if (adminActions.indexOf(action) !== -1) {
      var props = PropertiesService.getScriptProperties();
      var expectedToken = props.getProperty('ADMIN_TOKEN');
      var suppliedToken = String(data.token || data.authHash || '');
      var role = String(data.role || (data.user && data.user.role) || '').toLowerCase();

      if (!expectedToken || role !== 'admin' || suppliedToken !== expectedToken) {
        return jsonOutput({
          status: 'error',
          code: 'UNAUTHORIZED',
          message: 'Administrator authorization required.'
        });
      }
    }

    if (action === 'saveTrip') {
      result = handleSaveTrip(data.trip || data, sheetId);
    } else if (action === 'deleteTrip') {
      result = handleDeleteTrip(data.rowNum, sheetId, data.sheetName || (data.trip && data.trip.sheetName), data.lrNo);
    } else if (action === 'restoreDatabase') {
      result = { status: 'error', message: 'Destructive restore disabled. Use backups manually.' };
    } else if (action === 'backupDatabase') {
      result = handleBackupDatabase(sheetId);
    } else {
      result = { status: 'error', message: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { status: 'error', message: String(err.message || err) };
  } finally {
    if (acquired) lock.releaseLock();
  }

  return jsonOutput(result);
}

// =====================================================
// READ ALL RECORDS ACROSS THE THREE PHYSICAL WORKSHEETS
// =====================================================

function handleGetAll(optId) {
  var ss = getSpreadsheet(optId);

  var targetCategories = ['TOBILLED', 'A/TO-PAY', 'F/TO-PAY'];
  var sheetsToRead = [];

  for (var c = 0; c < targetCategories.length; c++) {
    var ws = resolveWorksheet(ss, targetCategories[c]);
    if (ws) sheetsToRead.push(ws);
  }

  // Check if physical sheets are empty but 'final' has historical data
  var totalRowsInPhysical = 0;
  for (var s = 0; s < sheetsToRead.length; s++) {
    if (sheetsToRead[s].getLastRow() >= 2) {
      totalRowsInPhysical += (sheetsToRead[s].getLastRow() - 1);
    }
  }

  if (totalRowsInPhysical === 0) {
    // 1. Perform safe automatic migration from 'final' if it exists
    migrateHistoricalFinalRecords(ss);
    // Do not seed example rows during reads; an empty worksheet remains an empty dataset.
  }

  var trips = [];
  var totalFreight = 0;
  var totalAdvances = 0;
  var totalBalance = 0;
  var pendingPod = 0;

  for (var s = 0; s < sheetsToRead.length; s++) {
    var sheet = sheetsToRead[s];
    var sheetName = sheet.getName();
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) continue;

    var values = sheet.getRange(2, 1, lastRow - 1, 28).getValues();

    for (var i = 0; i < values.length; i++) {
      var r = values[i];
      if (!r[0] && !r[1] && !r[3]) continue;

      var calc = calculateSheetRow(r);
      var freight = amount(r[10]);
      var advances = amount(r[14]) + amount(r[16]) + amount(r[18]);
      var pendingTobilled = calc.pendingTobilled;
      var finalBalc = calc.finalBalc;

      var podText = String(r[19] || '').trim();
      var missingPod = !podText || /^(pending|na|n\/a)$/i.test(podText) || /if date|if empty/i.test(podText);
      if (missingPod) pendingPod++;

      totalFreight += freight;
      totalAdvances += advances;
      totalBalance += calc.finalPending;

      var actualRow = i + 2;
      var stableId = sheetName + '_' + (r[3] ? String(r[3]).trim() : actualRow);

      trips.push({
        id: stableId,
        sheetName: sheetName,
        row: actualRow,
        slNo: String(r[0] || ''),
        trspName: String(r[1] || ''),
        date: formatDate(r[2]),
        lrNo: String(r[3] || ''),
        truckNo: String(r[4] || ''),
        from: String(r[5] || ''),
        to: String(r[6] || ''),
        accountNo: String(r[7] || ''),
        ifsc: String(r[8] || ''),
        paymentMade: String(r[9] || ''),
        fright: freight,
        date1: formatDate(r[11]),
        topay: calc.status,
        tm: amount(r[13]),
        advance1: amount(r[14]),
        date2: formatDate(r[15]),
        advance2: amount(r[16]),
        date3: formatDate(r[17]),
        advance3: amount(r[18]),
        pod: missingPod ? '' : formatDate(r[19]),
        cod: calc.cod,
        pendingTobilled: pendingTobilled,
        balc: finalBalc,
        extraAmount: amount(r[22]),
        payDate: formatDate(r[23]),
        pm: amount(r[24]),
        finalBalc: finalBalc,
        podAmountStatus: calc.podAmountStatus,
        note: String(r[27] || '')
      });
    }
  }

  return {
    status: 'success',
    source: 'cloud',
    version: getVersion(),
    summary: {
      totalTrips: trips.length,
      totalFreight: totalFreight,
      totalAdvances: totalAdvances,
      finalBalance: totalBalance,
      pendingPod: pendingPod
    },
    trips: trips
  };
}

// =====================================================
// SAVE TRIP TO EXACT PHYSICAL WORKSHEET & SAFE MOVE
// =====================================================

function handleSaveTrip(t, optId) {
  if (!t || typeof t !== 'object') throw new Error('Trip data is required.');

  var ss = getSpreadsheet(optId);
  var lr = String(t.lrNo || '').trim().toUpperCase();

  var codProvided = t.cod !== undefined && t.cod !== null && t.cod !== '' && String(t.cod).toLowerCase() !== 'if tobilled na';
  var pmValue = t.pm !== undefined && t.pm !== null && t.pm !== '' ? t.pm : t.pmFinal;

  var record = {
    freight: t.fright,
    status: t.topay,
    tm: t.tm,
    advance1: t.advance1,
    advance2: t.advance2,
    advance3: t.advance3,
    pod: t.pod,
    cod: t.cod,
    codProvided: codProvided,
    extraAmount: t.extraAmount,
    payDate: t.payDate,
    pm: pmValue,
    podAmountStatus: t.podAmountStatus
  };

  var calc = calculateLedgerAmounts(record);

  // Authoritative physical worksheet destination derived from status
  var targetSheet = resolveWorksheet(ss, calc.status);
  var targetSheetName = targetSheet.getName();

  var sourceSheetName = t.sourceSheet ? String(t.sourceSheet).trim() : null;
  var rowNum = parseInt(t.row, 10);
  var isAdd = t.isAdd === true || String(t.isAdd).toLowerCase() === 'true';

  if (!isAdd) {
    var sourceSheet = sourceSheetName ? ss.getSheetByName(sourceSheetName) : null;
    if (!sourceSheetName || !sourceSheet || !Number.isInteger(rowNum) || rowNum < 2 || rowNum > sourceSheet.getLastRow()) {
      return { status: 'error', code: 'INVALID_SOURCE_ROW', message: 'Cannot edit: source worksheet or row is invalid. Refresh the ledger and try again.' };
    }
    var actualLrNo = String(sourceSheet.getRange(rowNum, 4).getValue() || '').trim().toUpperCase();
    if (actualLrNo !== String(t.originalLrNo || '').trim().toUpperCase()) {
      return { status: 'error', code: 'ROW_MISMATCH', message: 'The worksheet row no longer matches this trip. Refresh the ledger before saving.' };
    }
  }

  // Global Duplicate LR NO Validation across all physical worksheets
  if (lr) {
    var checkCategories = ['TOBILLED', 'A/TO-PAY', 'F/TO-PAY'];
    for (var c = 0; c < checkCategories.length; c++) {
      var chSheet = resolveWorksheet(ss, checkCategories[c]);
      var chLast = chSheet.getLastRow();
      if (chLast >= 2) {
        var chVals = chSheet.getRange(2, 4, chLast - 1, 1).getValues();
        for (var j = 0; j < chVals.length; j++) {
          var existLr = String(chVals[j][0] || '').trim().toUpperCase();
          var actualRow = j + 2;
          var isSameRecord = (sourceSheetName === chSheet.getName() && actualRow === rowNum);
          // Exclude current record when checking duplicate LR across sheets: actualRow !== rowNum on same sheet
          if (existLr === lr && !isSameRecord) {
            return {
              status: 'error',
              code: 'DUPLICATE_LR',
              message: 'LR NO already exists in ' + chSheet.getName() + ' (row ' + actualRow + ')'
            };
          }
        }
      }
    }
  }

  var rowData = [
    t.slNo || '',
    t.trspName || '',
    t.date || '',
    t.lrNo || '',
    t.truckNo || '',
    t.from || '',
    t.to || '',
    t.accountNo || '',
    t.ifsc || '',
    t.paymentMade || '',
    amount(t.fright),
    t.date1 || '',
    calc.status,
    amount(t.tm),
    amount(t.advance1),
    t.date2 || '',
    amount(t.advance2),
    t.date3 || '',
    amount(t.advance3),
    t.pod || '',
    calc.status === 'TOBILLED' ? 'if Tobilled NA' : calc.cod,
    calc.status === 'TOBILLED' ? calc.pendingTobilled : 'if A/Topay&Ftopay Na',
    calc.extraAmount,
    t.payDate || '',
    calc.pm,
    calc.finalPending,
    calc.podAmountStatus,
    t.note || ''
  ];

  if (rowData.length !== 28) throw new Error('Internal error: expected 28 columns.');

  var isStatusChangeMove = Boolean(!isAdd && sourceSheetName !== targetSheetName);

  if (isStatusChangeMove) {
    // 1. Write to target physical worksheet
    targetSheet.appendRow(rowData);
    var newRowNum = targetSheet.getLastRow();
    SpreadsheetApp.flush();

    // 2. Delete from original source worksheet
    var srcSheet = ss.getSheetByName(sourceSheetName);
    if (srcSheet && rowNum >= 2 && rowNum <= srcSheet.getLastRow()) {
      srcSheet.deleteRow(rowNum);
      SpreadsheetApp.flush();
    }

    rowNum = newRowNum;
  } else if (!isAdd) {
    // Update existing record in same physical worksheet (isAdd must be false for update)
    targetSheet.getRange(rowNum, 1, 1, 28).setValues([rowData]);
    SpreadsheetApp.flush();
  } else {
    // New shipment appended to physical worksheet (isAdd=true always appends, or fallback for unknown row)
    targetSheet.appendRow(rowData);
    rowNum = targetSheet.getLastRow();
    SpreadsheetApp.flush();
  }

  return {
    status: 'success',
    sheetName: targetSheetName,
    rowNum: rowNum,
    version: incrementVersion(),
    calculated: {
      cod: calc.cod,
      pendingTobilled: calc.pendingTobilled,
      finalPending: calc.finalPending,
      podAmountStatus: calc.podAmountStatus
    }
  };
}

// =====================================================
// DELETE TRIP FROM SPECIFIC PHYSICAL WORKSHEET
// =====================================================

function handleDeleteTrip(rowNum, optId, optSheetName, optLrNo) {
  var ss = getSpreadsheet(optId);
  var r = parseInt(rowNum, 10);

  var targetSheet = optSheetName ? ss.getSheetByName(optSheetName) : null;

  if (!optSheetName) {
    // Fallback: search across all physical sheets
    var checkCats = ['TOBILLED', 'A/TO-PAY', 'F/TO-PAY'];
    for (var c = 0; c < checkCats.length; c++) {
      var sh = resolveWorksheet(ss, checkCats[c]);
      if (sh && r >= 2 && r <= sh.getLastRow()) {
        targetSheet = sh;
        break;
      }
    }
  }

  if (!targetSheet || !Number.isInteger(r) || r < 2 || r > targetSheet.getLastRow()) {
    return { status: 'error', message: 'Invalid sheet or row number for deletion.' };
  }

  if (optLrNo) {
    var actualLrNo = String(targetSheet.getRange(r, 4).getValue() || '').trim().toUpperCase();
    if (actualLrNo !== String(optLrNo).trim().toUpperCase()) {
      return { status: 'error', code: 'ROW_MISMATCH', message: 'The worksheet row no longer matches this trip. Refresh the ledger before deleting.' };
    }
  }

  targetSheet.deleteRow(r);
  SpreadsheetApp.flush();

  return {
    status: 'success',
    sheetName: targetSheet.getName(),
    version: incrementVersion(),
    message: 'Trip deleted from ' + targetSheet.getName() + '.'
  };
}

// =====================================================
// BACKUP
// =====================================================

function handleBackupDatabase(optId) {
  var ss = getSpreadsheet(optId);
  var folders = DriveApp.getFoldersByName(BACKUP_FOLDER_NAME);
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(BACKUP_FOLDER_NAME);

  var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HH-mm-ss');
  var name = 'Brokerage_Ledger_Backup_' + timestamp;
  var file = DriveApp.getFileById(ss.getId()).makeCopy(name, folder);

  return { status: 'success', backupName: name, url: file.getUrl() };
}

// =====================================================
// HELPERS
// =====================================================

function formatDate(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'dd-MM-yyyy');
  }
  return String(value);
}

function getVersion() {
  return PropertiesService.getScriptProperties().getProperty('DATA_VERSION') || '1';
}

function incrementVersion() {
  var current = parseInt(getVersion(), 10);
  if (!Number.isFinite(current)) current = 1;
  var next = String(current + 1);
  PropertiesService.getScriptProperties().setProperty('DATA_VERSION', next);
  return next;
}
