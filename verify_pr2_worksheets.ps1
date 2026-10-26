# verify_pr2_worksheets.ps1 - Audit & Verification for PR #2 Physical Worksheet Routing & POD Features
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  SR BROKERAGE LEDGER - PR #2 PHYSICAL WORKSHEETS AUDIT " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$passed = 0
$failed = 0

function Assert-Test($condition, $description) {
    if ($condition) {
        Write-Host " [PASS] $description" -ForegroundColor Green
        $script:passed++
    } else {
        Write-Host " [FAIL] $description" -ForegroundColor Red
        $script:failed++
    }
}

$codeGs = [System.IO.File]::ReadAllText("E:\TR\P1\backend\Code.gs", [System.Text.Encoding]::UTF8)
$apiJs = [System.IO.File]::ReadAllText("E:\TR\P1\js\api.js", [System.Text.Encoding]::UTF8)
$tableJs = [System.IO.File]::ReadAllText("E:\TR\P1\js\table.js", [System.Text.Encoding]::UTF8)
$indexHtml = [System.IO.File]::ReadAllText("E:\TR\P1\index.html", [System.Text.Encoding]::UTF8)

# 1. Physical Worksheet Routing Architecture in Code.gs
Assert-Test ($codeGs -match 'PHYSICAL_SHEET_CANDIDATES\s*=\s*\{') "backend/Code.gs defines PHYSICAL_SHEET_CANDIDATES mapping"
Assert-Test ($codeGs -match 'function\s+resolveWorksheet\s*\(') "backend/Code.gs implements centralized resolveWorksheet()"
Assert-Test ($codeGs -match 'function\s+migrateHistoricalFinalRecords\s*\(') "backend/Code.gs implements safe migration from historical 'final' sheet"
Assert-Test ($codeGs -match 'function\s+runMigrateToPhysicalSheets\s*\(') "backend/Code.gs implements manual runMigrateToPhysicalSheets() runner"

# 2. Reading from Three Physical Worksheets
Assert-Test ($codeGs -match 'targetCategories\s*=\s*\[\s*''TOBILLED'',\s*''A/TO-PAY'',\s*''F/TO-PAY''\s*\]') "handleGetAll targets TOBILLED, A/TO-PAY, and F/TO-PAY physical sheets"
Assert-Test ($codeGs -match 'sheetName:\s*sheetName') "handleGetAll includes physical sheetName in trip metadata"
Assert-Test ($codeGs -match 'id:\s*stableId') "handleGetAll assigns stable unique record identifier"

# 3. Inter-Sheet Movement & Status Changes
Assert-Test ($codeGs -match 'isStatusChangeMove\s*=\s*Boolean\(sourceSheetName\s*&&\s*sourceSheetName\s*!==\s*targetSheetName\s*&&\s*rowNum\)') "handleSaveTrip detects status-change inter-sheet movement"
Assert-Test ($codeGs -match 'srcSheet\.deleteRow\(rowNum\)') "handleSaveTrip safely removes record from source sheet after confirmed write"
Assert-Test ($codeGs -match 'handleDeleteTrip\(rowNum,\s*optId,\s*optSheetName\)') "handleDeleteTrip targets the record's specific physical worksheet"

# 4. Active API Endpoint
Assert-Test ($apiJs -match 'AKfycbxLW4Vi4HTRDR_gz-LbDE5gj5XNLyKQU9YjsZYrMgCJOM6ncZ_lV8yCgDpxEDSQZKm8') "js/api.js connects to active Version 2 Google Apps Script deployment URL"
Assert-Test ($apiJs -match 'sourceSheet:\s*trip\.sourceSheet') "js/api.js transmits sourceSheet in saveTrip payload"
Assert-Test ($apiJs -match 'deleteTrip\(rowNum,\s*sheetName\s*=\s*''''\)') "js/api.js deleteTrip transmits target physical sheetName"

# 5. POD Status & Done Automation
Assert-Test ($indexHtml -match 'id="m_podAmountStatus"') "index.html defines m_podAmountStatus selector in shipment modal"
Assert-Test ($tableJs -match 'handlePodDateChange\(\)\s*\{[\s\S]*?statusEl\.value\s*=\s*''DONE''') "TableModule.handlePodDateChange automatically toggles status to DONE on POD date entry"
Assert-Test ($tableJs -match 'badge-pod-done') "TableModule.renderExcelView renders DONE badge for settled POD status"
Assert-Test ($tableJs -match 'sourceSheet:\s*sourceSheet') "TableModule.handleSaveModal preserves physical sourceSheet"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  TEST RESULTS: Passed: $passed, Failed: $failed" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

if ($failed -gt 0) { exit 1 } else { exit 0 }

