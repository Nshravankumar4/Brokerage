/**
 * TRANSPORT BROKERAGE LEDGER PVT LTD
 * SR Brokerage Ledger — Google Apps Script Backend
 *
 * Sheet: final
 * Database: 28 columns, A:AB
 *
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
 *
 * IMPORTANT:
 * - Setup does not delete or reset existing data.
 * - Saving writes exactly 28 columns.
 * - COD and pending amounts use a single calculation engine.
 * - Configure ADMIN_TOKEN in Script Properties before deployment.
 */

'use strict';

var SHEET_NAME = 'final';
var BACKUP_FOLDER_NAME = 'Brokerage_Backups';
var SPREADSHEET_ID = '1pp9s62Oi41XW6N3cz_qxPTaG1JCjqK4iUqxxcIc3ZPA';

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

/**
 * Do not automatically insert sample transactions into a live database.
 * Existing data is preserved. A new sheet receives headers only.
 */

function cleanSpreadsheetId(value) {
  var str = String(value || '').trim();
  var match = str.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : str;
}

function getSpreadsheet(optId) {
  var id = cleanSpreadsheetId(
    optId ||
    PropertiesService.getScriptProperties()
      .getProperty('SPREADSHEET_ID') ||
    SPREADSHEET_ID
  );

  if (!id) {
    throw new Error('Configure SPREADSHEET_ID before using the API.');
  }

  // Fail safely. Never create another spreadsheet as a silent fallback.
  var ss = SpreadsheetApp.openById(id);

  PropertiesService.getScriptProperties()
    .setProperty('SPREADSHEET_ID', ss.getId());

  return ss;
}

function getOrCreateSheet(optId) {
  var ss = getSpreadsheet(optId);
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.getRange(1, 1, 1, HEADERS.length)
      .setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }

  if (sheet.getMaxColumns() < HEADERS.length) {
    sheet.insertColumnsAfter(
      sheet.getMaxColumns(),
      HEADERS.length - sheet.getMaxColumns()
    );
  }

  // Do not overwrite existing headers or records automatically.
  return sheet;
}

function setupInitialSheet() {
  var sheet = getOrCreateSheet();
  Logger.log('Ledger URL: ' + sheet.getParent().getUrl());
  return sheet.getParent().getUrl();
}

// =====================================================
// CALCULATION ENGINE
// =====================================================

function normalizeToPayStatus(value) {
  var s = String(value || '').trim().toUpperCase();

  if (s.indexOf('F') === 0 || s === 'FULL') {
    return 'F/TO-PAY';
  }

  if (s.indexOf('A') === 0 || s === 'ADV') {
    return 'A/TO-PAY';
  }

  return 'TOBILLED';
}

function amount(value) {
  if (value === '' || value === null || value === undefined) {
    return 0;
  }

  if (typeof value === 'string') {
    value = value.replace(/,/g, '').trim();
    if (value === '' || value.toUpperCase() === 'NA') return 0;
  }

  var n = Number(value);

  if (!Number.isFinite(n)) {
    throw new Error('Invalid numeric amount: ' + value);
  }

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

  // Formula requirement: pendingTobilled = fright - tm - totalAdvances
  if (status === 'F/TO-PAY') {
    // Full freight is collected at destination unless COD is provided.
    cod = input.codProvided
      ? amount(input.cod)
      : freight;

    intermediateBalance = 0;
    pendingTobilled = 0;
    finalPending = 0;
    finalBalc = 0;

  } else if (status === 'A/TO-PAY') {
    // Formula: COD = Freight - T/M - all advances.
    cod = input.codProvided
      ? amount(input.cod)
      : Math.max(0, freight - tm - totalAdvances);

    // Formula specified for A/TO-PAY intermediate balance.
    intermediateBalance = freight - tm - adv1 - cod;

    pendingTobilled = 0;

    // Include later advances, extra charges and P/M in final balance.
    finalPending = Math.max(
      0,
      intermediateBalance - adv2 - adv3 + extraAmount - pm
    );
    finalBalc = pendingTobilled + extraAmount - pm;

  } else {
    // TOBILLED: Freight - T/M - all advances.
    cod = 0;
    pendingTobilled = freight - tm - totalAdvances;
    intermediateBalance = pendingTobilled;
    finalPending = pendingTobilled + extraAmount - pm;
    // Formula requirement: finalBalc = pendingTobilled + extraAmount - pm
    finalBalc = pendingTobilled + extraAmount - pm;
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
    finalBalc: finalBalc
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
    cod: r[20],
    // Preserve explicit zero as a supplied COD value.
    codProvided: r[20] !== '' &&
      r[20] !== null &&
      r[20] !== undefined &&
      String(r[20]).toLowerCase() !== 'if tobilled na',
    extraAmount: r[22],
    pm: r[24]
  });
}

// =====================================================
// JSON API
// =====================================================

function jsonOutput(data, callback) {
  var json = JSON.stringify(data);

  if (callback) {
    // Restrict JSONP callback syntax to avoid script injection.
    if (!/^[a-zA-Z_$][0-9a-zA-Z_$.]*$/.test(callback)) {
      return ContentService.createTextOutput(
        JSON.stringify({
          status: 'error',
          message: 'Invalid JSONP callback.'
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(
      callback + '(' + json + ');'
    ).setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
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
      result = {
        status: 'success',
        version: getVersion()
      };
    } else {
      result = {
        status: 'error',
        message: 'Unknown action: ' + action
      };
    }
  } catch (err) {
    result = {
      status: 'error',
      message: String(err.message || err)
    };
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
    var sheetId = data.sheetId ||
      ((e && e.parameter && e.parameter.sheetId) || null);

    var adminActions = [
      'deleteTrip',
      'restoreDatabase',
      'backupDatabase'
    ];

    if (adminActions.indexOf(action) !== -1) {
      var props = PropertiesService.getScriptProperties();
      var expectedToken = props.getProperty('ADMIN_TOKEN');
      var suppliedToken = String(data.token || data.authHash || '');
      var role = String(
        data.role || (data.user && data.user.role) || ''
      ).toLowerCase();

      if (
        !expectedToken ||
        role !== 'admin' ||
        suppliedToken !== expectedToken
      ) {
        result = {
          status: 'error',
          code: 'UNAUTHORIZED',
          message: 'Administrator authorization required.'
        };

        return jsonOutput(result);
      }
    }

    if (action === 'saveTrip') {
      result = handleSaveTrip(data.trip || data, sheetId);
    } else if (action === 'deleteTrip') {
      result = handleDeleteTrip(data.rowNum, sheetId);
    } else if (action === 'restoreDatabase') {
      // Safe restore does not delete or reseed the live sheet.
      result = {
        status: 'error',
        message:
          'Destructive restore is disabled. Restore from a verified backup manually.'
      };
    } else if (action === 'backupDatabase') {
      result = handleBackupDatabase(sheetId);
    } else {
      result = {
        status: 'error',
        message: 'Unknown action: ' + action
      };
    }

  } catch (err) {
    result = {
      status: 'error',
      message: String(err.message || err)
    };
  } finally {
    if (acquired) {
      lock.releaseLock();
    }
  }

  return jsonOutput(result);
}

// =====================================================
// READ ALL RECORDS
// =====================================================

function handleGetAll(optId) {
  var sheet = getOrCreateSheet(optId);
  var lastRow = sheet.getLastRow();

  var values = lastRow >= 2
    ? sheet.getRange(2, 1, lastRow - 1, 28).getValues()
    : [];

  var trips = [];
  var totalFreight = 0;
  var totalAdvances = 0;
  var totalBalance = 0;
  var pendingPod = 0;

  for (var i = 0; i < values.length; i++) {
    var r = values[i];

    if (!r[0] && !r[1] && !r[3]) continue;

    var calc = calculateSheetRow(r);
    var freight = amount(r[10]);
    var advances = amount(r[14]) +
      amount(r[16]) +
      amount(r[18]);
    var pendingTobilled = freight - amount(r[13]) - advances;
    var finalBalc = pendingTobilled + amount(r[22]) - amount(r[24]);

    var podText = String(r[19] || '').trim();
    var missingPod = !podText ||
      /^(pending|na|n\/a)$/i.test(podText) ||
      /if date|if empty/i.test(podText);

    if (missingPod) pendingPod++;

    totalFreight += freight;
    totalAdvances += advances;
    totalBalance += calc.finalPending;

    trips.push({
      row: i + 2,
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
      podAmountStatus: r[26],
      note: String(r[27] || '')
    });
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
// SAVE TRIP
// =====================================================

function handleSaveTrip(t, optId) {
  if (!t || typeof t !== 'object') {
    throw new Error('Trip data is required.');
  }

  var sheet = getOrCreateSheet(optId);
  var rowNum = parseInt(t.row, 10);
  var lastRow = sheet.getLastRow();

  if (
    rowNum &&
    (rowNum < 2 || rowNum > lastRow)
  ) {
    throw new Error('Invalid row number for update.');
  }

  var lr = String(t.lrNo || '').trim().toUpperCase();

  if (lr) {
    var existing = lastRow >= 2
      ? sheet.getRange(2, 1, lastRow - 1, 28).getValues()
      : [];

    for (var i = 0; i < existing.length; i++) {
      var existingLR = String(existing[i][3] || '')
        .trim().toUpperCase();

      var actualRow = i + 2;

      if (
        existingLR &&
        existingLR === lr &&
        actualRow !== rowNum
      ) {
        return {
          status: 'error',
          code: 'DUPLICATE_LR',
          message: 'LR NO already exists in row ' + actualRow
        };
      }
    }
  }

  var codProvided =
    t.cod !== undefined &&
    t.cod !== null &&
    t.cod !== '' &&
    String(t.cod).toLowerCase() !== 'if tobilled na';

  var pmValue =
    t.pm !== undefined && t.pm !== null && t.pm !== ''
      ? t.pm
      : t.pmFinal;

  var record = {
    freight: t.fright,
    status: t.topay,
    tm: t.tm,
    advance1: t.advance1,
    advance2: t.advance2,
    advance3: t.advance3,
    cod: t.cod,
    codProvided: codProvided,
    extraAmount: t.extraAmount,
    pm: pmValue
  };

  var calc = calculateLedgerAmounts(record);

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
    calc.status === 'TOBILLED' ? calc.pendingToBilled : 'if A/Topay&Ftopay Na',
    calc.extraAmount,
    t.payDate || '',
    calc.pm,
    calc.finalPending,
    t.podAmountStatus === undefined ? 0 : t.podAmountStatus,
    t.note || ''
  ];

  if (rowData.length !== 28) {
    throw new Error('Internal error: expected 28 columns.');
  }

  if (rowNum) {
    sheet.getRange(rowNum, 1, 1, 28).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
    rowNum = sheet.getLastRow();
  }

  SpreadsheetApp.flush();

  return {
    status: 'success',
    rowNum: rowNum,
    version: incrementVersion(),
    calculated: {
      cod: calc.cod,
      pendingTobilled: calc.pendingToBilled,
      finalPending: calc.finalPending
    }
  };
}

// =====================================================
// DELETE TRIP
// =====================================================

function handleDeleteTrip(rowNum, optId) {
  var sheet = getOrCreateSheet(optId);
  var r = parseInt(rowNum, 10);

  if (!Number.isInteger(r) || r < 2 || r > sheet.getLastRow()) {
    return {
      status: 'error',
      message: 'Invalid sheet row number.'
    };
  }

  sheet.deleteRow(r);

  return {
    status: 'success',
    version: incrementVersion(),
    message: 'Trip deleted.'
  };
}

// =====================================================
// BACKUP
// =====================================================

function handleBackupDatabase(optId) {
  var ss = getSpreadsheet(optId);
  var folders = DriveApp.getFoldersByName(BACKUP_FOLDER_NAME);
  var folder = folders.hasNext()
    ? folders.next()
    : DriveApp.createFolder(BACKUP_FOLDER_NAME);

  var timestamp = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    'yyyy-MM-dd_HH-mm-ss'
  );

  var name = 'Brokerage_Ledger_Backup_' + timestamp;
  var file = DriveApp.getFileById(ss.getId()).makeCopy(name, folder);

  return {
    status: 'success',
    backupName: name,
    url: file.getUrl()
  };
}

// =====================================================
// HELPERS
// =====================================================

function formatDate(value) {
  if (!value) return '';

  if (
    Object.prototype.toString.call(value) === '[object Date]' &&
    !isNaN(value.getTime())
  ) {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      'dd-MM-yyyy'
    );
  }

  return String(value);
}

function getVersion() {
  return PropertiesService.getScriptProperties()
    .getProperty('DATA_VERSION') || '1';
}

function incrementVersion() {
  var current = parseInt(getVersion(), 10);

  if (!Number.isFinite(current)) current = 1;

  var next = String(current + 1);

  PropertiesService.getScriptProperties()
    .setProperty('DATA_VERSION', next);

  return next;
}
