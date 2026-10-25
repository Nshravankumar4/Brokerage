/**
 * 🚛 TRANSPORT BROKERAGE LEDGER PVT LTD - GOOGLE APPS SCRIPT BACKEND
 * Authoritative Cloud Database & Google Sheets Integration
 * Target Sheet: final (28 Columns A to AB)
 * Master Workbook: BROKER DETAILS ADVANCE BALC DETAILS.xlsx
 * Developed by Shravan Kumar for Transport Brokerage Ledger Pvt Ltd
 * 
 * Capabilities:
 *  1. Google Sheets live 28-column database (A to AB).
 *  2. Concurrency guard using LockService.getScriptLock().
 *  3. Dynamic calculation engine for COD (Col U), Pending ToBilled (Col V), and Pending Amount (Col Z).
 *  4. Automated point-in-time backup snapshots in Google Drive folder "Brokerage_Backups".
 *  5. Role-based security for ADMIN and RUDRA (Employee).
 *  6. JSON API endpoints via doGet and doPost.
 */

var SHEET_NAME = 'final';
var BACKUP_FOLDER_NAME = 'Brokerage_Backups';

/**
 * Target Google Spreadsheet ID
 */
var SPREADSHEET_ID = '1pp9s62Oi41XW6N3cz_qxPTaG1JCjqK4iUqxxcIc3ZPA';

var HEADERS = [
  'SL NO',                                   // Col A (0)
  'TRSP NAME',                               // Col B (1)
  'DATE',                                    // Col C (2)
  'LR NO',                                   // Col D (3)
  'TRUCK NO',                                // Col E (4)
  'FROM',                                    // Col F (5)
  'TO',                                      // Col G (6)
  'ACCOUNT NO',                              // Col H (7)
  'IFSC CODE',                               // Col I (8)
  'PAYMENT MADE',                            // Col J (9)
  'FRIGHT',                                  // Col K (10)
  'DATE',                                    // Col L (11) (Adv 1 Date)
  'ToPayStatus',                             // Col M (12)
  'T/M',                                     // Col N (13)
  'ADVANCE',                                 // Col O (14)
  'DATE 2',                                  // Col P (15)
  'ADVANCE2',                                // Col Q (16)
  'DATE3',                                   // Col R (17)
  'ADVANCE3',                                // Col S (18)
  'POD RECD Date',                           // Col T (19)
  'Cash on Delivery (COD) :A/Topay&Ftopay',  // Col U (20)
  'Pending Amount: Tobilled',                 // Col V (21)
  'Extra Amount',                            // Col W (22)
  'PM/PA Date',                              // Col X (23)
  'P/M',                                     // Col Y (24)
  'Pending Amount',                          // Col Z (25)
  'POD Amount Status',                       // Col AA (26)
  'REMARKS / NOTE'                           // Col AB (27)
];

var INITIAL_DATA = [
  [1, "ANTP SAINATH", "20-08-2026", "207", "AP39UD3564", "LUCKNOW", "MEDCHAL", "38216860303", "SBIN0010659", "SBI BANK", 65000, "02-09-2026", "TOBILLED", 0, 65000, "", 0, "", 0, "29-08-2026", 0, 0, 0, "", 0, 0, 0, ""],
  [2, "SARITHA TRSP", "03-09-2026", "208", "TG15T6666", "RAIPUR", "MEDCHAL", "0312035592", "KKBK0008406", "KKBK BANK", 110250, "15-10-2026", "TOBILLED", 0, 110250, "", 0, "", 0, "07-09-2026", 0, 0, 5000, "", 0, 5000, 0, ""],
  [3, "SARITHA TRSP", "10-09-2026", "190", "TG15T6666", "MEDCHAL", "COOCHBEHAR", "0312035592", "KKBK0008406", "KKBK BANK", 231000, "", "F/TO-PAY", 0, 0, "", 0, "", 0, "25-09-2026", 231000, 0, 0, "", 0, 0, 0, ""],
  [4, "MISHRA PIWARAN", "12-09-2026", "191/192", "RJ14GN7169", "MEDCHAL", "RAIGUNJ&DALKOLA", "279805000462", "ICIC0002798", "ICICI BANK", 135000, "16-09-2026", "A/TO-PAY", 200, 124800, "", 0, "", 0, "05-10-2026", 10000, 0, 0, "", 200, 0, 0, ""],
  [5, "ANDHRA GORKARPUR", "16-09-2026", "193/194", "UP38T6479", "MEDCHAL", "SABDHAN/KALIACHAK", "52641131001394", "PUNB0219910", "PNB BANK", 130000, "18-09-2026", "TOBILLED", 0, 100000, "21-09-2026", 20000, "", 0, "10-10-2026", 0, 10000, 0, "", 0, 10000, 0, ""],
  [6, "ABHISHEK TRSP", "19-09-2026", "209", "TS05UF1719", "MEDCHAL", "MURISIRABAD", "23405500018", "ICIC0002384", "ICICI BANK", 134750, "21-09-2026", "TOBILLED", 0, 100000, "", 0, "", 0, "", 0, 34750, 0, "", 0, 34750, 0, "41BAGS WET CONDITION"],
  [7, "SARITHA TRSP", "24-09-2026", "210/211", "TS15UE1122", "MEDCHAL", "ARRARIYA/PURNIA", "0312035592", "KKBK0008406", "KKBK BANK", 155000, "", "TOBILLED", 0, 0, "", 0, "", 0, "05-10-2026", 0, 155000, 0, "", 0, 155000, 0, ""],
  [8, "CG RANCHI R/WAYS", "29-09-2026", "195", "CG08AZ4714", "MEDCHAL", "PANKANJUR", "29122900001083", "DCBL0000291", "DCB BANK", 42000, "01-10-2026", "F/TO-PAY", 0, 0, "", 0, "", 0, "", 42000, 0, 0, "", 0, 0, 0, "F/TO-PAY Shipment"],
  [9, "SARITHA TRSP", "01-10-2026", "196", "TG15T6666", "MEDCHAL", "MADHAPURA", "0312035592", "KKBK0008406", "KKBK BANK", 175000, "", "TOBILLED", 0, 0, "", 0, "", 0, "19-10-2026", 0, 175000, 0, "", 0, 175000, 0, ""],
  [10, "SARITHA TRSP", "06-10-2026", "212", "TS15UE1122", "MEDCHAL", "MUZUFFARPUR", "0312035592", "KKBK0008406", "KKBK BANK", 141000, "", "TOBILLED", 0, 0, "", 0, "", 0, "19-10-2026", 0, 141000, 0, "", 0, 141000, 0, ""],
  [11, "ANTP SAINATH", "08-10-2026", "213", "AP39UD3564", "MEDCHAL", "BEGUSARAI", "38216860303", "SBIN0010659", "SBI BANK", 136500, "17-10-2026", "TOBILLED", 0, 126000, "", 567, "", 667, "19-10-2026", 0, 9266, 0, "", 500, 8766, 0, ""],
  [12, "MISHRA PIWARAN", "09-10-2026", "214", "JH02BM3030", "MEDCHAL", "PURNIA", "279805000462", "ICIC0002798", "ICICI BANK", 154000, "15-10-2026", "TOBILLED", 500, 143750, "", 0, "", 0, "", 0, 9750, 0, "", 300, 9450, 0, ""],
  [13, "MISHRA PIWARAN", "10-10-2026", "215", "BR44GB0148", "MEDCHAL", "MOTHIHARI", "279805000462", "ICIC0002798", "ICICI BANK", 157500, "15-10-2026", "TOBILLED", 300, 147200, "", 0, "", 0, "", 0, 10000, 0, "", 300, 9700, 0, ""],
  [14, "MISHRA PIWARAN", "13-10-2026", "2106", "HR56C4156", "MEDCHAL", "ARRARIYA", "279805000462", "ICIC0002798", "ICICI BANK", 162750, "17-10-2026", "TOBILLED", 300, 152450, "", 0, "", 0, "", 0, 10000, 0, "", 300, 9700, 0, ""],
  [15, "MISHRA PIWARAN", "14-10-2026", "197/198", "UP60BT2385", "MEDCHAL", "ARRARIYA/KALIGUNJ", "279805000462", "ICIC0002798", "ICICI BANK", 171500, "", "TOBILLED", 300, 0, "", 0, "", 0, "", 0, 171200, 0, "", 0, 171200, 0, ""],
  [16, "ANTP SAINATH", "17-10-2026", "217/218", "AP02TH2345", "MEDCHAL", "BHAGALPUR/PURNIA", "38216860303", "SBIN0010659", "SBI BANK", 158000, "", "TOBILLED", 0, 50000, "", 0, "", 0, "", 0, 108000, 0, "", 0, 108000, 0, ""],
  [17, "MISHRA PIWARAN", "18-10-2026", "219", "UP61BT7437", "MEDCHAL", "COOCHBEHAR", "279805000462", "ICIC0002798", "ICICIBANK", 200000, "", "A/TO-PAY", 0, 0, "", 0, "", 0, "", 200000, 0, 0, "", 0, 0, 0, ""],
  [18, "MISHRA PIWARAN", "19-10-2026", "2106", "HR56C4156", "MEDCHAL", "ARRARIYA", "279805000462", "ICIC0002798", "ICICI BANK", 50000, "", "A/TO-PAY", 200, 19800, "", 0, "", 0, "", 30000, 0, 0, "", 0, 0, 0, ""],
  [19, "MISHRA PIWARAN", "20-10-2026", "2106", "HR56C4156", "MEDCHAL", "ARRARIYA", "279805000462", "ICIC0002798", "ICICI BANK", 60000, "", "A/TO-PAY", 300, 29700, "", 0, "", 0, "", 30000, 0, 0, "", 0, 0, 0, ""]
];

function cleanSpreadsheetId(idOrUrl) {
  if (!idOrUrl) return '';
  var str = String(idOrUrl).trim();
  var match = str.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return str;
}

function getSpreadsheet(optId) {
  var cleanOptId = cleanSpreadsheetId(optId);

  // 1. Parameter sheetId if explicitly passed
  if (cleanOptId) {
    try {
      var passedSs = SpreadsheetApp.openById(cleanOptId);
      if (passedSs) {
        PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', passedSs.getId());
        return passedSs;
      }
    } catch (e) {}
  }

  // 2. Container-bound active spreadsheet
  try {
    var activeSs = SpreadsheetApp.getActiveSpreadsheet();
    if (activeSs) {
      PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', activeSs.getId());
      return activeSs;
    }
  } catch (e) {}

  // 3. Configured SPREADSHEET_ID variable at top of Code.gs
  if (typeof SPREADSHEET_ID !== 'undefined' && SPREADSHEET_ID && SPREADSHEET_ID.trim()) {
    try {
      var hardcodedId = cleanSpreadsheetId(SPREADSHEET_ID);
      var hardcodedSs = SpreadsheetApp.openById(hardcodedId);
      if (hardcodedSs) {
        PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', hardcodedSs.getId());
        return hardcodedSs;
      }
    } catch (e) {}
  }

  // 4. Persistent Script Properties
  try {
    var propId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (propId && propId.trim()) {
      var propSs = SpreadsheetApp.openById(propId.trim());
      if (propSs) return propSs;
    }
  } catch (e) {}

  // 5. Auto-discover existing sheet in user's Google Drive by common filenames
  try {
    var candidateNames = [
      'BROKER DETAILS ADVANCE BALC DETAILS',
      'SR Brokerage Ledger',
      'Transport Brokerage Ledger',
      'BROKER DETAILS'
    ];
    for (var i = 0; i < candidateNames.length; i++) {
      var files = DriveApp.getFilesByName(candidateNames[i]);
      if (files.hasNext()) {
        var file = files.next();
        var discoveredSs = SpreadsheetApp.openById(file.getId());
        PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', file.getId());
        return discoveredSs;
      }
    }
  } catch (e) {}

  // 6. Auto-create a new Google Spreadsheet in Google Drive fallback
  try {
    var createdSs = SpreadsheetApp.create('SR Brokerage Ledger');
    PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', createdSs.getId());
    return createdSs;
  } catch (e) {}

  throw new Error("Spreadsheet not found. Please bind this script to your sheet, set SPREADSHEET_ID in Code.gs, or pass ?sheetId=YOUR_ID.");
}

function getOrCreateSheet(optId) {
  var ss = getSpreadsheet(optId);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    // Write authoritative 28 headers
    sheet.appendRow(HEADERS);
    // Write initial verified 19 records
    for (var i = 0; i < INITIAL_DATA.length; i++) {
      sheet.appendRow(INITIAL_DATA[i]);
    }
  }
  return sheet;
}

// Helper to run manually in Apps Script Editor to set up sheet immediately
function setupInitialSheet() {
  var sheet = getOrCreateSheet();
  Logger.log("Sheet verified & ready at: " + sheet.getParent().getUrl());
  return sheet.getParent().getUrl();
}

// ================= API DISPATCHERS =================

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'getAll';
  var callback = (e && e.parameter && e.parameter.callback) ? e.parameter.callback : null;
  var sheetId = (e && e.parameter && e.parameter.sheetId) ? e.parameter.sheetId : null;

  var result = {};
  try {
    if (action === 'getAll') {
      result = handleGetAll(sheetId);
    } else if (action === 'getVersion') {
      result = { status: 'success', version: getVersion() };
    } else {
      result = { status: 'error', message: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { status: 'error', message: err.toString() };
  }

  var jsonString = JSON.stringify(result);
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + jsonString + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(jsonString)
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var result = {};
  var lock = LockService.getScriptLock();

  try {
    lock.waitLock(15000); // Wait up to 15 seconds for atomic lock
    
    var data = {};
    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    var action = data.action || 'saveTrip';
    var sheetId = data.sheetId || (e && e.parameter && e.parameter.sheetId) || null;

    // Strict Server-Side RBAC Enforcement: Administrative actions require authenticated Admin token
    var adminActions = ['deleteTrip', 'restoreDatabase', 'backupDatabase'];
    if (adminActions.indexOf(action) !== -1) {
      var role = String(data.role || (data.user && data.user.role) || '').toLowerCase();
      var authHash = String(data.authHash || data.token || '');
      var ADMIN_HASH = 'ded12726612993e58a7f6f1b0428300adcf13f6cabb7515436c5888b3de21c0b';
      if (role !== 'admin' || authHash !== ADMIN_HASH) {
        return ContentService.createTextOutput(JSON.stringify({
          status: 'error',
          code: 'UNAUTHORIZED',
          message: 'Server Access Denied: Administrator role is strictly required to perform ' + action
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    if (action === 'saveTrip') {
      result = handleSaveTrip(data.trip || data, sheetId);
    } else if (action === 'deleteTrip') {
      result = handleDeleteTrip(data.rowNum || data.slNo, sheetId);
    } else if (action === 'restoreDatabase') {
      result = handleRestoreDatabase(sheetId);
    } else if (action === 'backupDatabase') {
      result = handleBackupDatabase(sheetId);
    } else {
      result = { status: 'error', message: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { status: 'error', message: err.toString() };
  } finally {
    lock.releaseLock();
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ================= HANDLERS =================

function handleGetAll(optId) {
  var sheet = getOrCreateSheet(optId);
  var values = sheet.getDataRange().getValues();

  var trips = [];
  var totFreight = 0;
  var totAdvances = 0;
  var totBalance = 0;
  var pendingPodCount = 0;

  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    if (!r[0] && !r[1] && !r[3]) continue; // Skip blank rows

    var fright = Number(r[10]) || 0;
    var rawStatus = String(r[12] || '').trim().toUpperCase();
    var topay = 'TOBILLED';
    if (rawStatus.indexOf('F') === 0 || rawStatus === 'FULL') {
      topay = 'F/TO-PAY';
    } else if (rawStatus.indexOf('A') === 0 || rawStatus === 'ADV') {
      topay = 'A/TO-PAY';
    }

    var tm = Number(r[13]) || 0;
    var adv1 = Number(r[14]) || 0;
    var adv2 = Number(r[16]) || 0;
    var adv3 = Number(r[18]) || 0;
    var totalAdvances = adv1 + adv2 + adv3;

    var podStr = String(r[19] || '').trim();
    var isPodMissing = (!podStr || podStr.toLowerCase().indexOf('if date') !== -1 || podStr.toLowerCase().indexOf('empty') !== -1);
    if (isPodMissing) pendingPodCount++;

    var cod = 0;
    var pendingTobilled = 0;
    var extraAmount = Number(r[22]) || 0;
    var pm = Number(r[24]) || 0;
    var finalBalc = 0;
    var podAmountStatus = 0;

    if (topay === 'F/TO-PAY') {
      cod = (r[20] !== undefined && r[20] !== '' && Number(r[20]) > 0)
        ? Number(r[20])
        : Math.max(0, fright - tm - totalAdvances);
      pendingTobilled = 0;
      finalBalc = 0;
      podAmountStatus = 0;
    } else if (topay === 'A/TO-PAY') {
      cod = (r[20] !== undefined && r[20] !== '' && Number(r[20]) > 0)
        ? Number(r[20])
        : Math.max(0, fright - tm - totalAdvances);
      pendingTobilled = 0;
      finalBalc = Math.max(0, fright - tm - adv1 - cod);
      podAmountStatus = 0;
    } else {
      cod = 0;
      pendingTobilled = fright - tm - totalAdvances;
      finalBalc = pendingTobilled + extraAmount - pm;
      podAmountStatus = pendingTobilled + extraAmount - pm - finalBalc;
    }

    totFreight += fright;
    totAdvances += totalAdvances;
    totBalance += finalBalc;

    trips.push({
      row: i + 1,
      slNo: String(r[0]),
      trspName: String(r[1] || ''),
      date: formatDate(r[2]),
      lrNo: String(r[3] || ''),
      truckNo: String(r[4] || ''),
      from: String(r[5] || ''),
      to: String(r[6] || ''),
      accountNo: String(r[7] || ''),
      ifsc: String(r[8] || ''),
      paymentMade: String(r[9] || ''),
      fright: fright,
      date1: formatDate(r[11]),
      topay: topay,
      tm: tm,
      advance1: adv1,
      date2: formatDate(r[15]),
      advance2: adv2,
      date3: formatDate(r[17]),
      advance3: adv3,
      pod: isPodMissing ? '' : formatDate(r[19]),
      cod: cod,
      pendingTobilled: pendingTobilled,
      balc: pendingTobilled,
      extraAmount: extraAmount,
      payDate: formatDate(r[23]),
      pm: pm,
      finalBalc: finalBalc,
      podAmountStatus: podAmountStatus,
      note: String(r[27] || ''),
      pocDate: r[28] ? formatDate(r[28]) : '',
      pocAmount: Number(r[29]) || 0,
      pocNotes: String(r[30] || '')
    });
  }

  return {
    status: 'success',
    source: 'cloud',
    version: getVersion(),
    summary: {
      totalTrips: trips.length,
      totalFreight: totFreight,
      totalAdvances: totAdvances,
      finalBalance: totBalance,
      pendingPod: pendingPodCount
    },
    trips: trips
  };
}

function handleSaveTrip(t, optId) {
  var sheet = getOrCreateSheet(optId);
  var rowNum = parseInt(t.row, 10);

  // Validate Unique LR NO: LR NO must not be duplicate across active trips
  var targetLr = String(t.lrNo || '').trim().toUpperCase();
  if (targetLr) {
    var dataVals = sheet.getDataRange().getValues();
    // Col D is index 3 (0-based)
    for (var i = 1; i < dataVals.length; i++) {
      var sheetRowIndex = i + 1; // 1-based row in sheet
      var existingLr = String(dataVals[i][3] || '').trim().toUpperCase();
      if (existingLr && existingLr === targetLr && (!rowNum || rowNum !== sheetRowIndex)) {
        return {
          status: 'error',
          code: 'DUPLICATE_LR',
          message: 'Duplicate LR NO Error: LR NO "' + t.lrNo + '" already exists in row ' + sheetRowIndex + ' (Trip #' + (dataVals[i][0] || i) + '). Duplicate LR NO is not allowed.'
        };
      }
    }
  }

  var fright = Number(t.fright) || 0;
  var tm = Number(t.tm) || 0;
  var adv1 = Number(t.advance1) || 0;
  var adv2 = Number(t.advance2) || 0;
  var adv3 = Number(t.advance3) || 0;
  var totalAdvances = adv1 + adv2 + adv3;
  var extraAmount = Number(t.extraAmount) || 0;
  var pm = (t.pm !== undefined && t.pm !== null && t.pm !== '') ? Number(t.pm) : (Number(t.pmFinal) || 0);

  var rawStatus = String(t.topay || '').trim().toUpperCase();
  var topay = 'TOBILLED';
  if (rawStatus.indexOf('F') === 0 || rawStatus === 'FULL') {
    topay = 'F/TO-PAY';
  } else if (rawStatus.indexOf('A') === 0 || rawStatus === 'ADV') {
    topay = 'A/TO-PAY';
  }

  var cod = 0;
  var pendingTobilled = 0;
  var finalBalc = 0;
  var podAmountStatus = 0;

  if (topay === 'F/TO-PAY') {
    cod = (t.cod !== undefined && t.cod !== null && t.cod !== '' && Number(t.cod) > 0)
      ? Number(t.cod)
      : Math.max(0, fright - tm - totalAdvances);
    pendingTobilled = 0;
    finalBalc = 0;
    podAmountStatus = 0;
  } else if (topay === 'A/TO-PAY') {
    cod = (t.cod !== undefined && t.cod !== null && t.cod !== '' && Number(t.cod) > 0)
      ? Number(t.cod)
      : Math.max(0, fright - tm - totalAdvances);
    pendingTobilled = 0;
    finalBalc = Math.max(0, fright - tm - adv1 - cod);
    podAmountStatus = 0;
  } else {
    cod = 0;
    pendingTobilled = fright - tm - totalAdvances;
    finalBalc = pendingTobilled + extraAmount - pm;
    podAmountStatus = pendingTobilled + extraAmount - pm - finalBalc;
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
    fright,
    t.date1 || '',
    topay,
    tm,
    adv1,
    t.date2 || '',
    adv2,
    t.date3 || '',
    adv3,
    t.pod || '',
    cod,
    pendingTobilled,
    extraAmount,
    t.payDate || '',
    pm,
    finalBalc,
    podAmountStatus,
    t.note || ''
  ];

  // Optional extended To-Billed POC metadata
  if (t.pocDate || t.pocAmount || t.pocNotes) {
    rowData.push(t.pocDate || '');
    rowData.push(Number(t.pocAmount) || 0);
    rowData.push(t.pocNotes || '');
  }

  if (rowNum && rowNum >= 2 && rowNum <= sheet.getLastRow()) {
    sheet.getRange(rowNum, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
    rowNum = sheet.getLastRow();
  }

  var currentVer = incrementVersion();
  return { status: 'success', rowNum: rowNum, version: currentVer, trip: t };
}

function handleDeleteTrip(rowNum, optId) {
  var sheet = getOrCreateSheet(optId);
  var r = parseInt(rowNum, 10);
  if (r >= 2 && r <= sheet.getLastRow()) {
    sheet.deleteRow(r);
    var currentVer = incrementVersion();
    return { status: 'success', version: currentVer, message: 'Trip deleted' };
  }
  return { status: 'error', message: 'Invalid row number: ' + rowNum };
}

function handleRestoreDatabase(optId) {
  var ss = getSpreadsheet(optId);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (sheet) {
    ss.deleteSheet(sheet);
  }
  getOrCreateSheet(optId);
  incrementVersion();
  return { status: 'success', message: 'Database restored to original verified records.' };
}

function handleBackupDatabase(optId) {
  var ss = getSpreadsheet(optId);
  var folderIterator = DriveApp.getFoldersByName(BACKUP_FOLDER_NAME);
  var folder = folderIterator.hasNext() ? folderIterator.next() : DriveApp.createFolder(BACKUP_FOLDER_NAME);

  var timeStamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HH-mm-ss');
  var backupName = 'Brokerage_Ledger_Backup_' + timeStamp;
  var file = DriveApp.getFileById(ss.getId()).makeCopy(backupName, folder);

  return {
    status: 'success',
    backupName: backupName,
    url: file.getUrl()
  };
}

// ================= HELPERS =================

function formatDate(val) {
  if (!val) return '';
  if (Object.prototype.toString.call(val) === '[object Date]' && !isNaN(val.getTime())) {
    var d = ('0' + val.getDate()).slice(-2);
    var m = ('0' + (val.getMonth() + 1)).slice(-2);
    var y = val.getFullYear();
    return d + '-' + m + '-' + y;
  }
  return String(val);
}

function getVersion() {
  return PropertiesService.getScriptProperties().getProperty('DATA_VERSION') || '1';
}

function incrementVersion() {
  var v = parseInt(getVersion(), 10) + 1;
  PropertiesService.getScriptProperties().setProperty('DATA_VERSION', String(v));
  return String(v);
}
