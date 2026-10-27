'use strict';

var PUBLIC_DEMO_TAB = 'PUBLIC_DEMO';
var PUBLIC_DEMO_HEADERS = ['ID', 'DATE', 'TRANSPORTER', 'LR NO', 'TRUCK NO', 'FROM', 'TO', 'STATUS', 'FREIGHT', 'ADVANCE', 'NOTE'];
var PUBLIC_DEMO_ROW_LIMIT = 500;

function publicDemoSpreadsheet_() {
  var properties = PropertiesService.getScriptProperties();
  var demoId = publicDemoCleanId_(properties.getProperty('PUBLIC_DEMO_SPREADSHEET_ID'));
  var liveId = publicDemoCleanId_(properties.getProperty('LIVE_SPREADSHEET_ID') || properties.getProperty('SPREADSHEET_ID'));
  if (!demoId || !liveId) throw new Error('Configure the demo spreadsheet ID and a live spreadsheet ID guard before enabling the demo.');
  if (demoId === liveId) throw new Error('The public demo must use a different spreadsheet from the live ledger.');
  return SpreadsheetApp.openById(demoId);
}

function publicDemoCleanId_(value) {
  var text = String(value || '').trim();
  var match = text.match(/\/d\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : text;
}

function setupPublicDemo() {
  var spreadsheet = publicDemoSpreadsheet_();
  var sheet = spreadsheet.getSheetByName(PUBLIC_DEMO_TAB);
  var properties = PropertiesService.getScriptProperties();
  if (properties.getProperty('PUBLIC_DEMO_INITIALIZED_FOR') === spreadsheet.getId()) {
    if (!sheet || JSON.stringify(sheet.getRange(1, 1, 1, PUBLIC_DEMO_HEADERS.length).getValues()[0]) !== JSON.stringify(PUBLIC_DEMO_HEADERS)) {
      throw new Error('The initialized demo tab is missing or has an invalid schema.');
    }
    return 'Public demo is already initialized. Existing demo rows were preserved.';
  }
  if (sheet && sheet.getLastRow() > 0) {
    throw new Error('The PUBLIC_DEMO tab is not empty. No data was changed; configure a new blank demo spreadsheet.');
  }
  if (!sheet) sheet = spreadsheet.insertSheet(PUBLIC_DEMO_TAB);

  var sampleRows = [
    ['DEMO-SHIPMENT-001', '2026-10-01', 'Sample North Transport', 'DEMO-LR-001', 'DEMO-TRUCK-01', 'Sample City A', 'Sample City B', 'TOBILLED', 45000, 12000, 'Synthetic demonstration record'],
    ['DEMO-SHIPMENT-002', '2026-10-02', 'Example Road Carriers', 'DEMO-LR-002', 'DEMO-TRUCK-02', 'Sample City C', 'Sample City D', 'A/TO-PAY', 32000, 8000, 'Synthetic demonstration record'],
    ['DEMO-SHIPMENT-003', '2026-10-03', 'Demo Freight Services', 'DEMO-LR-003', 'DEMO-TRUCK-03', 'Sample City E', 'Sample City F', 'F/TO-PAY', 28000, 0, 'Synthetic demonstration record']
  ];
  sheet.getRange(1, 1, 1, PUBLIC_DEMO_HEADERS.length).setValues([PUBLIC_DEMO_HEADERS]);
  sheet.getRange(2, 1, sampleRows.length, PUBLIC_DEMO_HEADERS.length).setValues(sampleRows);
  sheet.setFrozenRows(1);
  properties.setProperty('PUBLIC_DEMO_INITIALIZED_FOR', spreadsheet.getId());
  return 'Initialized the separate public demo spreadsheet with synthetic sample rows.';
}

function publicDemoJson_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return publicDemoJson_({ status: 'success', demo: true, message: 'Public synthetic-data demo API.' });
}

function doPost(event) {
  var lock = LockService.getScriptLock();
  var locked = false;
  try {
    if (!event || !event.postData || !event.postData.contents) {
      return publicDemoJson_({ status: 'error', code: 'INVALID_REQUEST', message: 'A JSON POST body is required.' });
    }
    var request = JSON.parse(event.postData.contents);
    if (!request || typeof request !== 'object' || Array.isArray(request)) {
      return publicDemoJson_({ status: 'error', code: 'INVALID_REQUEST', message: 'The request must be a JSON object.' });
    }
    var action = String(request.action || '');
    if (['publicDemoGetAll', 'publicDemoSave', 'publicDemoDelete'].indexOf(action) === -1) {
      return publicDemoJson_({ status: 'error', code: 'INVALID_ACTION', message: 'Only public demo actions are available from this deployment.' });
    }
    if (action !== 'publicDemoGetAll') {
      lock.waitLock(10000);
      locked = true;
    }
    if (action === 'publicDemoGetAll') return publicDemoJson_(publicDemoGetAll_());
    if (action === 'publicDemoSave') return publicDemoJson_(publicDemoSave_(request.trip));
    return publicDemoJson_(publicDemoDelete_(request.id));
  } catch (error) {
    console.error('Public demo request failed: ' + String(error && error.message || 'unknown error'));
    return publicDemoJson_({ status: 'error', code: 'DEMO_REQUEST_FAILED', message: 'The public demo request could not be completed.' });
  } finally {
    if (locked) lock.releaseLock();
  }
}

function publicDemoSheet_() {
  var spreadsheet = publicDemoSpreadsheet_();
  if (PropertiesService.getScriptProperties().getProperty('PUBLIC_DEMO_INITIALIZED_FOR') !== spreadsheet.getId()) {
    throw new Error('The isolated public demo is not initialized.');
  }
  var sheet = spreadsheet.getSheetByName(PUBLIC_DEMO_TAB);
  if (!sheet || sheet.getLastRow() < 1 ||
      JSON.stringify(sheet.getRange(1, 1, 1, PUBLIC_DEMO_HEADERS.length).getValues()[0]) !== JSON.stringify(PUBLIC_DEMO_HEADERS)) {
    throw new Error('The isolated public demo tab is not initialized.');
  }
  return sheet;
}

function publicDemoGetAll_() {
  var sheet = publicDemoSheet_();
  var lastRow = sheet.getLastRow();
  var rows = lastRow < 2 ? [] : sheet.getRange(2, 1, lastRow - 1, PUBLIC_DEMO_HEADERS.length).getValues();
  return {
    status: 'success',
    demo: true,
    trips: rows.filter(function (row) { return String(row[0] || '').trim(); }).map(function (row) {
      return {
        id: String(row[0]),
        date: String(row[1] || ''),
        transporter: String(row[2] || ''),
        lrNo: String(row[3] || ''),
        truckNo: String(row[4] || ''),
        from: String(row[5] || ''),
        to: String(row[6] || ''),
        status: String(row[7] || ''),
        freight: Number(row[8]) || 0,
        advance: Number(row[9]) || 0,
        note: String(row[10] || '')
      };
    })
  };
}

function publicDemoSave_(trip) {
  if (!trip || typeof trip !== 'object' || Array.isArray(trip)) {
    return { status: 'error', code: 'INVALID_TRIP', message: 'A demo shipment is required.' };
  }
  var status = String(trip.status || '').trim().toUpperCase();
  if (['TOBILLED', 'A/TO-PAY', 'F/TO-PAY'].indexOf(status) === -1) {
    return { status: 'error', code: 'INVALID_STATUS', message: 'Choose a supported shipment status.' };
  }

  var textFields = ['date', 'transporter', 'lrNo', 'truckNo', 'from', 'to', 'note'];
  var values = {};
  for (var i = 0; i < textFields.length; i++) {
    var field = textFields[i];
    values[field] = String(trip[field] || '').trim();
    if (values[field].length > 120) {
      return { status: 'error', code: 'FIELD_TOO_LONG', message: 'Text fields must be 120 characters or fewer.' };
    }
    if (/^[=+\-@]/.test(values[field])) {
      return { status: 'error', code: 'FORMULA_TEXT', message: 'Formula-like text is not allowed in demo fields.' };
    }
  }
  if (!values.transporter || !values.lrNo) {
    return { status: 'error', code: 'REQUIRED_FIELDS', message: 'Transporter and LR number are required.' };
  }
  var freight = Number(trip.freight);
  var advance = Number(trip.advance);
  if (!Number.isFinite(freight) || !Number.isFinite(advance) ||
      freight < 0 || advance < 0 || freight > 1000000000 || advance > 1000000000) {
    return { status: 'error', code: 'INVALID_AMOUNT', message: 'Amounts must be between 0 and 1,000,000,000.' };
  }

  var sheet = publicDemoSheet_();
  var id = String(trip.id || '').trim();
  var lastRow = sheet.getLastRow();
  var targetRow = 0;
  if (id) {
    if (!/^DEMO-[A-Za-z0-9_-]{1,80}$/.test(id)) {
      return { status: 'error', code: 'INVALID_ID', message: 'Invalid demo shipment ID.' };
    }
    var ids = lastRow < 2 ? [] : sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var j = 0; j < ids.length; j++) {
      if (String(ids[j][0] || '') === id) {
        if (targetRow) return { status: 'error', code: 'DUPLICATE_ID', message: 'Duplicate demo ID; no changes were made.' };
        targetRow = j + 2;
      }
    }
    if (!targetRow) return { status: 'error', code: 'NOT_FOUND', message: 'Demo shipment not found. Reload and retry.' };
  } else {
    if (lastRow >= PUBLIC_DEMO_ROW_LIMIT + 1) {
      return { status: 'error', code: 'CAPACITY_REACHED', message: 'The public demo has reached its row limit.' };
    }
    id = 'DEMO-' + Utilities.getUuid();
    targetRow = lastRow + 1;
  }
  sheet.getRange(targetRow, 1, 1, PUBLIC_DEMO_HEADERS.length).setValues([[
    id, values.date, values.transporter, values.lrNo, values.truckNo, values.from,
    values.to, status, freight, advance, values.note
  ]]);
  return { status: 'success', demo: true, id: id };
}

function publicDemoDelete_(id) {
  var shipmentId = String(id || '').trim();
  if (!/^DEMO-[A-Za-z0-9_-]{1,80}$/.test(shipmentId)) {
    return { status: 'error', code: 'INVALID_ID', message: 'Invalid demo shipment ID.' };
  }
  var sheet = publicDemoSheet_();
  var lastRow = sheet.getLastRow();
  var ids = lastRow < 2 ? [] : sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  var targetRow = 0;
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0] || '') === shipmentId) {
      if (targetRow) return { status: 'error', code: 'DUPLICATE_ID', message: 'Duplicate demo ID; no rows were deleted.' };
      targetRow = i + 2;
    }
  }
  if (!targetRow) return { status: 'error', code: 'NOT_FOUND', message: 'Demo shipment not found.' };
  sheet.deleteRow(targetRow);
  return { status: 'success', demo: true, id: shipmentId };
}
