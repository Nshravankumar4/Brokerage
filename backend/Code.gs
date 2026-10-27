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
var SPREADSHEET_ID = '';

var PHYSICAL_SHEET_CANDIDATES = {
  'TOBILLED': ['TOBILLED', 'TO-BILLED', 'TO_BILLED'],
  'A/TO-PAY': ['A/TO-PAY', 'A-TO-PAY', 'A_TO_PAY', 'ATO-PAY'],
  'F/TO-PAY': ['F/TO-PAY', 'F-TO-PAY', 'F_TO_PAY', 'FTO-PAY']
};
var STATUS_TO_PHYSICAL_SHEET = {
  'TOBILLED': 'TOBILLED',
  'A/TO-PAY': 'A-TO-PAY',
  'F/TO-PAY': 'F-TO-PAY'
};
var SHIPMENT_ID_HEADER = 'SHIPMENT ID';
var AUTH_SESSION_TTL_SECONDS = 3600;
var AUTH_PASSWORD_HASH_ITERATIONS = 100000;

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
var STORAGE_HEADERS = HEADERS.concat([SHIPMENT_ID_HEADER]);

function cleanSpreadsheetId(value) {
  var str = String(value || '').trim();
  var match = str.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : str;
}

function isValidShipmentId(value) {
  return /^[a-zA-Z0-9_-]{20,80}$/.test(String(value || '').trim());
}

function getSpreadsheet(optId) {
  var configuredId = cleanSpreadsheetId(
    PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || SPREADSHEET_ID
  );
  if (!configuredId) throw new Error('Configure SPREADSHEET_ID in Script Properties before using the API.');
  var requestedId = cleanSpreadsheetId(optId);
  if (requestedId && requestedId !== configuredId) {
    throw new Error('The requested spreadsheet is not authorized.');
  }
  return SpreadsheetApp.openById(configuredId);
}

/**
 * Custom UI Menu for Google Sheets:
 * Allows user to trigger split, migration, and sheet cleanup directly from Google Sheets.
 */
function onOpen() {
  try {
    var ui = SpreadsheetApp.getUi();
    ui.createMenu('Transport Brokerage Ledger')
      .addItem('Configure Sign-In Credentials', 'configureSignInCredentials')
      .addItem('Assign Shipment IDs (Reviewed Migration)', 'migrateShipmentIdsWithConfirmation')
      .addItem('Migrate Existing Worksheets (Reviewed)', 'migrateWorksheetsWithConfirmation')
      .addItem('3. Delete Empty Sheet1', 'deleteEmptySheet1')
      .addItem('4. Format Headers & Set Styles', 'formatAllWorksheets')
      .addToUi();
  } catch (e) {
    Logger.log('Could not create the ledger menu: ' + e.message);
  }
}

function configureSignInCredentials() {
  var ui = SpreadsheetApp.getUi();
  var adminPrompt = ui.prompt('Configure Admin Password', 'Enter a new password of at least 12 characters.', ui.ButtonSet.OK_CANCEL);
  if (adminPrompt.getSelectedButton() !== ui.Button.OK) return;
  var employeePrompt = ui.prompt('Configure Employee Password', 'Enter a new password of at least 12 characters.', ui.ButtonSet.OK_CANCEL);
  if (employeePrompt.getSelectedButton() !== ui.Button.OK) return;

  var adminPassword = adminPrompt.getResponseText();
  var employeePassword = employeePrompt.getResponseText();
  if (adminPassword.length < 12 || employeePassword.length < 12 ||
      adminPassword.length > 256 || employeePassword.length > 256) {
    ui.alert('Both passwords must contain 12 to 256 characters. No credentials were changed.');
    return;
  }

  var props = PropertiesService.getScriptProperties();
  storePasswordCredential(props, 'ADMIN', adminPassword);
  storePasswordCredential(props, 'EMPLOYEE', employeePassword);
  props.deleteProperty('ADMIN_TOKEN');
  ui.alert('Sign-in credentials were updated. Existing sessions are invalidated.');
}

function storePasswordCredential(props, account, password) {
  var salt = Utilities.getUuid() + Utilities.getUuid();
  props.setProperty(account + '_PASSWORD_SALT', salt);
  props.setProperty(account + '_PASSWORD_HASH', derivePasswordHash(password, salt));
  var versionKey = account + '_AUTH_VERSION';
  var currentVersion = parseInt(props.getProperty(versionKey) || '0', 10);
  props.setProperty(versionKey, String((Number.isFinite(currentVersion) ? currentVersion : 0) + 1));
}

function derivePasswordHash(password, salt) {
  var saltBytes = Utilities.newBlob(String(salt)).getBytes().concat([0, 0, 0, 1]);
  var block = Utilities.computeHmacSha256Signature(saltBytes, String(password), Utilities.Charset.UTF_8);
  var result = block.slice();
  for (var i = 1; i < AUTH_PASSWORD_HASH_ITERATIONS; i++) {
    block = Utilities.computeHmacSha256Signature(block, String(password), Utilities.Charset.UTF_8);
    for (var j = 0; j < result.length; j++) result[j] ^= block[j];
  }
  return result.map(function (byte) {
    return ('0' + (byte & 255).toString(16)).slice(-2);
  }).join('');
}

function constantTimeEquals(left, right) {
  var a = String(left || '');
  var b = String(right || '');
  var difference = a.length ^ b.length;
  var length = Math.max(a.length, b.length);
  for (var i = 0; i < length; i++) {
    difference |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return difference === 0;
}

function authenticateCredentials(username, password) {
  var user = String(username || '').trim().toLowerCase();
  var account = user === 'admin' ? 'ADMIN' : (user === 'rudra' ? 'EMPLOYEE' : '');
  if (!account || typeof password !== 'string' || password.length < 1 || password.length > 256) return null;

  var props = PropertiesService.getScriptProperties();
  var salt = props.getProperty(account + '_PASSWORD_SALT');
  var expectedHash = props.getProperty(account + '_PASSWORD_HASH');
  if (!salt || !expectedHash) return { configurationError: true };

  var actualHash = derivePasswordHash(password, salt);
  return constantTimeEquals(actualHash, expectedHash) ? account : null;
}

function issueSessionToken(account) {
  var props = PropertiesService.getScriptProperties();
  var token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  var role = account === 'ADMIN' ? 'admin' : 'employee';
  var version = props.getProperty(account + '_AUTH_VERSION') || '0';
  var session = JSON.stringify({ role: role, version: version });
  CacheService.getScriptCache().put('ledger-session:' + token, session, AUTH_SESSION_TTL_SECONDS);
  return token;
}

function resolveSessionRole(token) {
  var value = String(token || '');
  if (!/^[a-f0-9]{64}$/i.test(value)) return null;
  var cached = CacheService.getScriptCache().get('ledger-session:' + value);
  if (!cached) return null;

  var session;
  try {
    session = JSON.parse(cached);
  } catch (e) {
    return null;
  }
  var account = session.role === 'admin' ? 'ADMIN' : (session.role === 'employee' ? 'EMPLOYEE' : '');
  if (!account || session.version !== (PropertiesService.getScriptProperties().getProperty(account + '_AUTH_VERSION') || '0')) {
    return null;
  }
  return session.role;
}

function migrateWorksheetsWithConfirmation() {
  var ui = SpreadsheetApp.getUi();
  var choice = ui.alert('Migrate Worksheets', 'This migrates existing records between worksheets. Confirm that you have a backup and have reviewed the target spreadsheet.', ui.ButtonSet.YES_NO);
  if (choice !== ui.Button.YES) return 'Migration cancelled.';
  return initializeAndMigrateAllWorksheets();
}

function migrateShipmentIdsWithConfirmation() {
  var ui = SpreadsheetApp.getUi();
  var choice = ui.alert('Assign Shipment IDs', 'This adds a persistent ID to each existing shipment without changing shipment values. Continue only after reviewing a backup.', ui.ButtonSet.YES_NO);
  if (choice !== ui.Button.YES) return 'ID migration cancelled.';
  return backfillShipmentIds();
}

function backfillShipmentIds() {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var ss = getSpreadsheet();
    var categories = ['TOBILLED', 'A/TO-PAY', 'F/TO-PAY'];
    var records = [];
    var seen = Object.create(null);

    for (var c = 0; c < categories.length; c++) {
      var sheet = resolveWorksheet(ss, categories[c], true, true);
      if (!sheet) continue;
      ensureHeaders(sheet);
      var lastRow = sheet.getLastRow();
      for (var row = 2; row <= lastRow; row++) {
        var trip = sheet.getRange(row, 1, 1, HEADERS.length).getValues()[0];
        if (!trip[0] && !trip[1] && !trip[3]) continue;
        var id = String(sheet.getRange(row, STORAGE_HEADERS.length).getValue() || '').trim();
        if (id && !isValidShipmentId(id)) throw new Error('An invalid shipment ID was found. No IDs were changed.');
        if (id && seen[id]) throw new Error('Duplicate shipment IDs were detected. No IDs were changed.');
        if (id) seen[id] = true;
        records.push({ sheet: sheet, row: row, id: id });
      }
    }

    var assigned = 0;
    for (var i = 0; i < records.length; i++) {
      if (records[i].id) continue;
      var newId;
      do {
        newId = Utilities.getUuid();
      } while (seen[newId]);
      seen[newId] = true;
      records[i].sheet.getRange(records[i].row, STORAGE_HEADERS.length).setValue(newId);
      assigned++;
    }
    SpreadsheetApp.flush();
    return 'Assigned IDs to ' + assigned + ' existing shipments.';
  } finally {
    lock.releaseLock();
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
function resolveWorksheet(ss, status, skipEnsureHeaders, doNotCreate) {
  var norm = normalizeToPayStatus(status);
  var candidates = PHYSICAL_SHEET_CANDIDATES[norm];
  if (!candidates || !STATUS_TO_PHYSICAL_SHEET[norm]) {
    throw new Error('Unsupported shipment status.');
  }

  for (var i = 0; i < candidates.length; i++) {
    var sh = ss.getSheetByName(candidates[i]);
    if (sh) {
      if (!skipEnsureHeaders) ensureHeaders(sh);
      return sh;
    }
  }

  if (doNotCreate) return null;
  var newSheet = ss.insertSheet(STATUS_TO_PHYSICAL_SHEET[norm]);
  if (!skipEnsureHeaders) ensureHeaders(newSheet);
  return newSheet;
}

function ensureHeaders(sheet) {
  if (sheet.getLastRow() < 1) {
    sheet.getRange(1, 1, 1, STORAGE_HEADERS.length).setValues([STORAGE_HEADERS]);
    sheet.setFrozenRows(1);
    try {
      sheet.getRange(1, 1, 1, HEADERS.length)
        .setFontWeight('bold')
        .setBackground('#1e3a8a')
        .setFontColor('#ffffff');
    } catch (eStyle) {}
  }
  if (sheet.getMaxColumns() < STORAGE_HEADERS.length) {
    sheet.insertColumnsAfter(
      sheet.getMaxColumns(),
      STORAGE_HEADERS.length - sheet.getMaxColumns()
    );
  }
  var idHeader = String(sheet.getRange(1, STORAGE_HEADERS.length).getValue() || '').trim();
  if (!idHeader) {
    sheet.getRange(1, STORAGE_HEADERS.length).setValue(SHIPMENT_ID_HEADER);
  } else if (idHeader !== SHIPMENT_ID_HEADER) {
    throw new Error('The reserved shipment ID column already contains a different header.');
  }

  // Remove unwanted/non-applicable column from display per physical worksheet
    var sName = String(sheet.getName() || '').toUpperCase();
  try {
    sheet.showColumns(1, HEADERS.length);
    sheet.hideColumns(STORAGE_HEADERS.length);
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
 * Copy historical transactions to their status worksheets.
 * The legacy sheet is kept as a recovery source; reruns use shipment IDs.
 */
function migrateHistoricalFinalRecords(ss) {
  if (!ss) return 0;

  var finalSheet = ss.getSheetByName(SHEET_NAME);
  if (!finalSheet) return 0;

  ensureHeaders(finalSheet);
  var lastRow = finalSheet.getLastRow();
  if (lastRow < 2) return 0;

  var sourceValues = finalSheet.getRange(2, 1, lastRow - 1, STORAGE_HEADERS.length).getValues();
  var categories = ['TOBILLED', 'A/TO-PAY', 'F/TO-PAY'];
  var targetById = Object.create(null);
  var targetByLr = Object.create(null);
  var sourceIds = Object.create(null);
  var sourceByLr = Object.create(null);
  var sourceRows = [];
  var actions = [];

  for (var c = 0; c < categories.length; c++) {
    var existingSheet = resolveWorksheet(ss, categories[c], true, true);
    if (!existingSheet) continue;
    ensureHeaders(existingSheet);
    var existingLastRow = existingSheet.getLastRow();
    if (existingLastRow < 2) continue;
    var existingValues = existingSheet.getRange(2, 1, existingLastRow - 1, STORAGE_HEADERS.length).getValues();
    for (var e = 0; e < existingValues.length; e++) {
      var existingRow = existingValues[e];
      if (!existingRow[0] && !existingRow[1] && !existingRow[3]) continue;
      var existingId = String(existingRow[28] || '').trim();
      var existingLr = String(existingRow[3] || '').trim().toUpperCase();
      var existingStatus = normalizeToPayStatus(existingSheet.getName());
      if (existingId) {
        if (!isValidShipmentId(existingId)) throw new Error('An invalid shipment ID exists in a destination worksheet. No migration was performed.');
        if (targetById[existingId]) throw new Error('Duplicate shipment IDs exist in destination worksheets. No migration was performed.');
        targetById[existingId] = { sheet: existingSheet, row: e + 2, values: existingRow, status: existingStatus };
      }
      if (existingLr) {
        if (targetByLr[existingLr]) throw new Error('Duplicate LR numbers exist in destination worksheets. No migration was performed.');
        targetByLr[existingLr] = { sheet: existingSheet, row: e + 2, values: existingRow, status: existingStatus };
      }
    }
  }

  for (var i = 0; i < sourceValues.length; i++) {
    var sourceRow = sourceValues[i];
    if (!sourceRow[0] && !sourceRow[1] && !sourceRow[3]) continue;

    var status = normalizeToPayStatus(sourceRow[12]);
    var targetSheet = resolveWorksheet(ss, status);
    var id = String(sourceRow[28] || '').trim();
    if (id && !isValidShipmentId(id)) throw new Error('An invalid shipment ID exists in the legacy worksheet. No migration was performed.');
    if (!id) id = Utilities.getUuid();
    if (sourceIds[id]) throw new Error('Duplicate shipment IDs exist in the legacy worksheet. No migration was performed.');
    sourceIds[id] = true;

    var rowWithId = sourceRow.slice(0, HEADERS.length).concat([id]);
    var lr = String(sourceRow[3] || '').trim().toUpperCase();
    if (lr && sourceByLr[lr]) throw new Error('Duplicate LR numbers exist in the legacy worksheet. No migration was performed.');
    if (lr) sourceByLr[lr] = true;
    var existingById = targetById[id];
    if (existingById) {
      if (existingById.status !== status || !migrationRowsEqual(existingById.values, rowWithId)) {
        throw new Error('A shipment ID conflicts with different destination data. No migration was performed.');
      }
      actions.push({ type: 'skip', sourceRow: i + 2, id: id });
    } else {
      var existingByLr = lr ? targetByLr[lr] : null;
      if (existingByLr) {
        if (String(existingByLr.values[28] || '').trim()) {
          throw new Error('An LR number is already assigned to a different shipment ID. No migration was performed.');
        }
        if (existingByLr.status !== status || !migrationRowsEqual(existingByLr.values, rowWithId, true)) {
          throw new Error('An LR number conflicts with different destination data. No migration was performed.');
        }
        actions.push({ type: 'link', sourceRow: i + 2, id: id, sheet: existingByLr.sheet, row: existingByLr.row });
        targetById[id] = { sheet: existingByLr.sheet, row: existingByLr.row, values: rowWithId, status: status };
      } else {
        actions.push({ type: 'append', sourceRow: i + 2, id: id, sheet: targetSheet, values: rowWithId });
        if (lr) targetByLr[lr] = { sheet: targetSheet, values: rowWithId, status: status };
        targetById[id] = { sheet: targetSheet, values: rowWithId, status: status };
      }
    }
    sourceRows.push({ row: i + 2, id: id, originalId: String(sourceRow[28] || '').trim() });
  }

  for (var s = 0; s < sourceRows.length; s++) {
    if (!sourceRows[s].originalId) {
      finalSheet.getRange(sourceRows[s].row, STORAGE_HEADERS.length).setValue(sourceRows[s].id);
    }
  }

  var count = 0;
  for (var a = 0; a < actions.length; a++) {
    var action = actions[a];
    if (action.type === 'append') {
      action.sheet.appendRow(action.values);
      count++;
    } else if (action.type === 'link') {
      action.sheet.getRange(action.row, STORAGE_HEADERS.length).setValue(action.id);
    }
  }
  SpreadsheetApp.flush();
  Logger.log('Copied ' + count + ' records from final; the legacy worksheet was preserved.');
  return count;
}

function migrationRowsEqual(left, right, ignoreShipmentId) {
  var length = ignoreShipmentId ? HEADERS.length : STORAGE_HEADERS.length;
  for (var i = 0; i < length; i++) {
    var a = left[i];
    var b = right[i];
    if (Object.prototype.toString.call(a) === '[object Date]' || Object.prototype.toString.call(b) === '[object Date]') {
      if (Object.prototype.toString.call(a) !== '[object Date]' ||
          Object.prototype.toString.call(b) !== '[object Date]' ||
          a.getTime() !== b.getTime()) return false;
    } else if (String(a === null || a === undefined ? '' : a) !== String(b === null || b === undefined ? '' : b)) {
      return false;
    }
  }
  return true;
}

function runMigrateToPhysicalSheets() {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var ss = getSpreadsheet();
    resolveWorksheet(ss, 'TOBILLED');
    resolveWorksheet(ss, 'A/TO-PAY');
    resolveWorksheet(ss, 'F/TO-PAY');
    var count = migrateHistoricalFinalRecords(ss);
    return 'Copied ' + count + ' records to physical worksheets. The legacy final worksheet was preserved.';
  } finally {
    lock.releaseLock();
  }
}

function initializeAndMigrateAllWorksheets() {
  return runMigrateToPhysicalSheets();
}

function setupInitialSheet() {
  var ss = getSpreadsheet();
  resolveWorksheet(ss, 'TOBILLED');
  resolveWorksheet(ss, 'A/TO-PAY');
  resolveWorksheet(ss, 'F/TO-PAY');
  Logger.log('Ledger URL: ' + ss.getUrl());
  return ss.getUrl();
}

function seedInitialData() {
  throw new Error('Production seeding is disabled. Use synthetic fixtures only in an isolated test spreadsheet.');
}

// =====================================================
// CALCULATION ENGINE
// =====================================================

function normalizeToPayStatus(value) {
  var s = String(value || '').trim().toUpperCase();
  if (s === 'F/TO-PAY' || s === 'F-TO-PAY' || s === 'F/TO-BILLED' || s === 'FULL') return 'F/TO-PAY';
  if (s === 'A/TO-PAY' || s === 'A-TO-PAY' || s === 'A/TO-BILLED' || s === 'ADV') return 'A/TO-PAY';
  if (s === 'TOBILLED' || s === 'TO-BILLED' || s === 'TO BILLED') return 'TOBILLED';
  throw new Error('Unsupported shipment status.');
}

function amount(value) {
  if (value === '' || value === null || value === undefined) return 0;
  if (typeof value === 'string') {
    value = value.replace(/,/g, '').trim();
    if (value === '' || value.toUpperCase() === 'NA') return 0;
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
  return jsonOutput({
    status: 'error',
    code: 'METHOD_NOT_ALLOWED',
    message: 'Use an authenticated POST request.'
  });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  var acquired = false;
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonOutput({ status: 'error', code: 'INVALID_REQUEST', message: 'A JSON POST body is required.' });
    }

    var data = JSON.parse(e.postData.contents);
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return jsonOutput({ status: 'error', code: 'INVALID_REQUEST', message: 'The request body must be a JSON object.' });
    }

    var action = String(data.action || '');
    var allowedActions = ['login', 'logout', 'getAll', 'getVersion', 'saveTrip', 'deleteTrip', 'backupDatabase', 'restoreDatabase', 'changePassword'];
    if (allowedActions.indexOf(action) === -1) {
      return jsonOutput({ status: 'error', code: 'INVALID_ACTION', message: 'The requested action is not supported.' });
    }

    if (action === 'login') {
      var authenticatedAccount = authenticateCredentials(data.username, data.password);
      if (authenticatedAccount && authenticatedAccount.configurationError) {
        return jsonOutput({
          status: 'error',
          code: 'AUTH_NOT_CONFIGURED',
          message: 'Sign-in is not configured. Configure both account passwords from the spreadsheet menu.'
        });
      }
      if (!authenticatedAccount) {
        return jsonOutput({ status: 'error', code: 'UNAUTHORIZED', message: 'Invalid username or password.' });
      }
      return jsonOutput({
        status: 'success',
        role: authenticatedAccount === 'ADMIN' ? 'admin' : 'employee',
        displayName: authenticatedAccount === 'ADMIN' ? 'Shravan (Admin)' : 'Rudra (Employee)',
        sessionToken: issueSessionToken(authenticatedAccount),
        expiresIn: AUTH_SESSION_TTL_SECONDS
      });
    }

    var sessionToken = String(data.sessionToken || '');
    var sessionRole = resolveSessionRole(sessionToken);
    if (!sessionRole) {
      return jsonOutput({ status: 'error', code: 'UNAUTHORIZED', message: 'Your session is invalid or expired. Sign in again.' });
    }

    var adminActions = ['deleteTrip', 'backupDatabase', 'restoreDatabase'];
    if (adminActions.indexOf(action) !== -1 && sessionRole !== 'admin') {
      return jsonOutput({ status: 'error', code: 'FORBIDDEN', message: 'Administrator authorization is required.' });
    }

    if (action === 'logout') {
      CacheService.getScriptCache().remove('ledger-session:' + sessionToken);
      return jsonOutput({ status: 'success' });
    }

    if (action === 'changePassword') {
      var newPassword = String(data.newPassword || '');
      if (newPassword.length < 12 || newPassword.length > 256) {
        return jsonOutput({ status: 'error', code: 'INVALID_PASSWORD', message: 'Passwords must contain 12 to 256 characters.' });
      }
      var accountToUpdate = sessionRole === 'admin' ? 'ADMIN' : 'EMPLOYEE';
      storePasswordCredential(PropertiesService.getScriptProperties(), accountToUpdate, newPassword);
      return jsonOutput({
        status: 'success',
        sessionToken: issueSessionToken(accountToUpdate),
        message: 'Password updated.'
      });
    }

    if (action === 'saveTrip' || action === 'deleteTrip' || action === 'backupDatabase') {
      lock.waitLock(15000);
      acquired = true;
    }

    if (action === 'getAll') {
      return jsonOutput(handleGetAll());
    }
    if (action === 'getVersion') {
      return jsonOutput({ status: 'success', version: getVersion() });
    }
    if (action === 'saveTrip') {
      return jsonOutput(handleSaveTrip(data.trip || data));
    }
    if (action === 'deleteTrip') {
      return jsonOutput(handleDeleteTrip(data.id, null, data.sheetName, data.lrNo));
    }
    if (action === 'restoreDatabase') {
      return jsonOutput({ status: 'error', code: 'RESTORE_DISABLED', message: 'Database restore is disabled. Use the reviewed manual recovery procedure.' });
    }
    if (action === 'backupDatabase') {
      return jsonOutput(handleBackupDatabase());
    }
  } catch (err) {
    Logger.log('Request failed: ' + String(err && err.message || 'unknown error'));
    return jsonOutput({ status: 'error', code: 'REQUEST_FAILED', message: 'The request could not be completed.' });
  } finally {
    if (acquired) lock.releaseLock();
  }
  return jsonOutput({ status: 'error', code: 'INVALID_ACTION', message: 'The requested action is not supported.' });
}

// =====================================================
// READ ALL RECORDS ACROSS THE THREE PHYSICAL WORKSHEETS
// =====================================================

function handleGetAll(optId) {
  var ss = getSpreadsheet(optId);

  var targetCategories = ['TOBILLED', 'A/TO-PAY', 'F/TO-PAY'];
  var sheetsToRead = [];

  for (var c = 0; c < targetCategories.length; c++) {
    var ws = resolveWorksheet(ss, targetCategories[c], true, true);
    if (ws) sheetsToRead.push(ws);
  }

  var trips = [];
  var totalFreight = 0;
  var totalAdvances = 0;
  var totalBalance = 0;
  var pendingPod = 0;
  var missingIds = 0;
  var shipmentIds = Object.create(null);

  for (var s = 0; s < sheetsToRead.length; s++) {
    var sheet = sheetsToRead[s];
    var sheetName = sheet.getName();
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) continue;

    var hasIdColumn = sheet.getMaxColumns() >= STORAGE_HEADERS.length &&
      String(sheet.getRange(1, STORAGE_HEADERS.length).getValue() || '').trim() === SHIPMENT_ID_HEADER;
    var values = sheet.getRange(2, 1, lastRow - 1, hasIdColumn ? STORAGE_HEADERS.length : HEADERS.length).getValues();

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
      var stableId = hasIdColumn ? String(r[28] || '').trim() : '';
      if (stableId) {
        if (!isValidShipmentId(stableId)) throw new Error('An invalid shipment ID was detected. No ambiguous records were returned.');
        if (shipmentIds[stableId]) throw new Error('Duplicate shipment IDs were detected. No ambiguous records were returned.');
        shipmentIds[stableId] = true;
      } else {
        missingIds++;
      }

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
    trips: trips,
    identityWarnings: { missingShipmentIds: missingIds }
  };
}

// =====================================================
// SAVE TRIP TO EXACT PHYSICAL WORKSHEET & SAFE MOVE
// =====================================================

function handleSaveTrip(t, optId) {
  if (!t || typeof t !== 'object') throw new Error('Trip data is required.');

  var ss = getSpreadsheet(optId);
  var lr = String(t.lrNo || '').trim().toUpperCase();
  var isAdd = Boolean(t.isAdd) || Number(t.row) < 2;
  var shipmentId = String(t.id || '').trim();
  if (!isAdd && !shipmentId) {
    return { status: 'error', code: 'MIGRATION_REQUIRED', message: 'Run the reviewed shipment ID migration before editing existing records.' };
  }
  if (isAdd && !shipmentId) shipmentId = Utilities.getUuid();
  if (!isValidShipmentId(shipmentId)) {
    return { status: 'error', code: 'INVALID_SHIPMENT_ID', message: 'A valid shipment ID is required.' };
  }

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
  var idMatches = findShipmentIdLocations(ss, shipmentId);
  if (idMatches.length > 1) {
    return { status: 'error', code: 'DUPLICATE_SHIPMENT_ID', message: 'Duplicate shipment IDs were detected. No record was changed.' };
  }

  if (isAdd && idMatches.length === 1) {
    var existingAdd = idMatches[0];
    if (String(existingAdd.values[3] || '').trim().toUpperCase() === lr &&
        normalizeToPayStatus(existingAdd.sheet.getName()) === calc.status) {
      return {
        status: 'success',
        id: shipmentId,
        sheetName: existingAdd.sheet.getName(),
        rowNum: existingAdd.row,
        version: getVersion(),
        message: 'Shipment was already saved.'
      };
    }
    return { status: 'error', code: 'SHIPMENT_ID_CONFLICT', message: 'The shipment ID is already assigned to another record.' };
  }

  var sourceSheetName = null;
  var rowNum = 0;
  if (!isAdd) {
    if (idMatches.length !== 1) {
      return { status: 'error', code: 'SHIPMENT_NOT_FOUND', message: 'The shipment ID was not found. Refresh the ledger and retry.' };
    }
    var existingRecord = idMatches[0];
    sourceSheetName = existingRecord.sheet.getName();
    rowNum = existingRecord.row;
    if (t.sourceSheet && normalizeToPayStatus(t.sourceSheet) !== normalizeToPayStatus(sourceSheetName)) {
      return { status: 'error', code: 'SHEET_MISMATCH', message: 'The shipment is no longer in the expected worksheet. Refresh and retry.' };
    }
    if (String(existingRecord.values[3] || '').trim().toUpperCase() !== lr) {
      return { status: 'error', code: 'SHIPMENT_MISMATCH', message: 'The shipment number does not match the selected shipment ID.' };
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
        var idVals = chSheet.getRange(2, STORAGE_HEADERS.length, chLast - 1, 1).getValues();
        for (var j = 0; j < chVals.length; j++) {
          var existLr = String(chVals[j][0] || '').trim().toUpperCase();
          var actualRow = j + 2;
          var isSameRecord = String(idVals[j][0] || '').trim() === shipmentId;
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
    t.note || '',
    shipmentId
  ];

  if (rowData.length !== STORAGE_HEADERS.length) throw new Error('Internal error: invalid shipment storage schema.');

  var isStatusChangeMove = Boolean(!isAdd && sourceSheetName !== targetSheetName);

  if (isStatusChangeMove) {
    targetSheet.appendRow(rowData);
    SpreadsheetApp.flush();
    var appendedLocations = findShipmentIdLocations(ss, shipmentId);
    var appendedTargetRecords = appendedLocations.filter(function (record) {
      return record.sheet.getName() === targetSheetName;
    });
    var appendedSourceRecords = appendedLocations.filter(function (record) {
      return record.sheet.getName() === sourceSheetName;
    });
    if (appendedLocations.length !== 2 || appendedTargetRecords.length !== 1 || appendedSourceRecords.length !== 1) {
      return { status: 'error', code: 'MOVE_REQUIRES_REVIEW', message: 'The new shipment row could not be verified. Keep the source record and review both worksheets.' };
    }
    var newRowNum = appendedTargetRecords[0].row;

    var srcSheet = ss.getSheetByName(sourceSheetName);
    if (!srcSheet || rowNum < 2 || rowNum > srcSheet.getLastRow() ||
        String(srcSheet.getRange(rowNum, STORAGE_HEADERS.length).getValue() || '').trim() !== shipmentId) {
      try {
        var changedSourceLocations = findShipmentIdLocations(ss, shipmentId);
        if (changedSourceLocations.length !== 2) throw new Error('Shipment identity changed before rollback.');
        var appendedAfterSourceChange = changedSourceLocations.filter(function (record) {
          return record.sheet.getName() === targetSheetName;
        })[0];
        if (!appendedAfterSourceChange) throw new Error('Appended shipment row was not found.');
        targetSheet.deleteRow(appendedAfterSourceChange.row);
        SpreadsheetApp.flush();
      } catch (rollbackChangedSourceError) {
        return { status: 'error', code: 'MOVE_REQUIRES_REVIEW', message: 'The source changed and the new row could not be rolled back. Review both worksheets before retrying.' };
      }
      return { status: 'error', code: 'SOURCE_CHANGED', message: 'The source shipment changed during the status update. Review both worksheets before retrying.' };
    }
    try {
      srcSheet.deleteRow(rowNum);
      SpreadsheetApp.flush();
    } catch (moveError) {
      var sourceStillExists = findShipmentIdLocations(ss, shipmentId).some(function (record) {
        return record.sheet.getName() === sourceSheetName;
      });
      if (sourceStillExists) {
        try {
          var rollbackLocations = findShipmentIdLocations(ss, shipmentId);
          if (rollbackLocations.length !== 2) throw new Error('Shipment identity changed during rollback.');
          var appendedRecord = rollbackLocations.filter(function (record) {
            return record.sheet.getName() === targetSheetName;
          })[0];
          if (!appendedRecord) throw new Error('Appended shipment row was not found during rollback.');
          targetSheet.deleteRow(appendedRecord.row);
          SpreadsheetApp.flush();
        } catch (rollbackError) {
          return { status: 'error', code: 'MOVE_REQUIRES_REVIEW', message: 'Status change was incomplete. The shipment ID needs manual review before retrying.' };
        }
        return { status: 'error', code: 'MOVE_ROLLED_BACK', message: 'Status change failed; the original shipment was preserved.' };
      }
    }

    var finalMoveLocations = findShipmentIdLocations(ss, shipmentId);
    if (finalMoveLocations.length !== 1 || finalMoveLocations[0].sheet.getName() !== targetSheetName) {
      return { status: 'error', code: 'MOVE_REQUIRES_REVIEW', message: 'The shipment move could not be verified after source removal. Review both worksheets before retrying.' };
    }
    newRowNum = finalMoveLocations[0].row;
    rowNum = newRowNum;
  } else if (!isAdd) {
    targetSheet.getRange(rowNum, 1, 1, STORAGE_HEADERS.length).setValues([rowData]);
    SpreadsheetApp.flush();
  } else {
    targetSheet.appendRow(rowData);
    rowNum = targetSheet.getLastRow();
    SpreadsheetApp.flush();
  }

  return {
    status: 'success',
    id: shipmentId,
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

function findShipmentIdLocations(ss, shipmentId) {
  var categories = ['TOBILLED', 'A/TO-PAY', 'F/TO-PAY'];
  var matches = [];
  for (var c = 0; c < categories.length; c++) {
    var sheet = resolveWorksheet(ss, categories[c], true, true);
    if (!sheet || sheet.getMaxColumns() < STORAGE_HEADERS.length ||
        String(sheet.getRange(1, STORAGE_HEADERS.length).getValue() || '').trim() !== SHIPMENT_ID_HEADER) continue;
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) continue;
    var values = sheet.getRange(2, 1, lastRow - 1, STORAGE_HEADERS.length).getValues();
    for (var i = 0; i < values.length; i++) {
      if (String(values[i][28] || '').trim() === shipmentId) {
        matches.push({ sheet: sheet, row: i + 2, values: values[i] });
      }
    }
  }
  return matches;
}

// =====================================================
// DELETE TRIP FROM SPECIFIC PHYSICAL WORKSHEET
// =====================================================

function handleDeleteTrip(shipmentId, optId, expectedSheet, expectedLrNo) {
  var id = String(shipmentId || '').trim();
  if (!isValidShipmentId(id)) {
    return { status: 'error', code: 'INVALID_SHIPMENT_ID', message: 'A valid shipment ID is required.' };
  }
  if (!expectedSheet) {
    return { status: 'error', code: 'SHEET_REQUIRED', message: 'The expected worksheet is required.' };
  }
  var status = normalizeToPayStatus(expectedSheet);
  var ss = getSpreadsheet(optId);
  var locations = findShipmentIdLocations(ss, id);
  if (locations.length !== 1) {
    return {
      status: 'error',
      code: locations.length ? 'DUPLICATE_SHIPMENT_ID' : 'SHIPMENT_NOT_FOUND',
      message: locations.length ? 'Duplicate shipment IDs were detected. No record was deleted.' : 'Shipment ID was not found. No record was deleted.'
    };
  }

  var target = locations[0];
  if (normalizeToPayStatus(target.sheet.getName()) !== status) {
    return { status: 'error', code: 'SHEET_MISMATCH', message: 'The shipment is not in the expected worksheet. No record was deleted.' };
  }
  var expectedLr = String(expectedLrNo || '').trim().toUpperCase();
  var actualLr = String(target.values[3] || '').trim().toUpperCase();
  if (!expectedLr || actualLr !== expectedLr) {
    return { status: 'error', code: 'SHIPMENT_MISMATCH', message: 'The shipment number does not match the selected ID. No record was deleted.' };
  }

  target.sheet.deleteRow(target.row);
  SpreadsheetApp.flush();

  return {
    status: 'success',
    id: id,
    sheetName: target.sheet.getName(),
    version: incrementVersion(),
    message: 'Trip deleted from ' + target.sheet.getName() + '.'
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
