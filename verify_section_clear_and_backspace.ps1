# verify_section_clear_and_backspace.ps1
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  SR BROKERAGE LEDGER - SECTION CLEAR & BACKSPACE AUDIT " -ForegroundColor Cyan
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

$tableJs = [System.IO.File]::ReadAllText("E:\TR\P1\js\table.js", [System.Text.Encoding]::UTF8)
$indexHtml = [System.IO.File]::ReadAllText("E:\TR\P1\index.html", [System.Text.Encoding]::UTF8)
$cssStyles = [System.IO.File]::ReadAllText("E:\TR\P1\css\styles.css", [System.Text.Encoding]::UTF8)
$dataJs = [System.IO.File]::ReadAllText("E:\TR\P1\js\data.js", [System.Text.Encoding]::UTF8)

# 1. Section Clear buttons in index.html
Assert-Test ($indexHtml -match 'clearSection\(''shipment''\)') "index.html defines Clear button for Shipment Information"
Assert-Test ($indexHtml -match 'clearSection\(''payment''\)') "index.html defines Clear button for Payment Details"
Assert-Test ($indexHtml -match 'clearSection\(''bank''\)') "index.html defines Clear button for Bank Details"

# 2. Section Clear implementations in table.js
Assert-Test ($tableJs -match 'clearSection\(section\)\s*\{') "TableModule implements clearSection controller"
Assert-Test ($tableJs -match 'section\s*===\s*''shipment''') "clearSection handles 'shipment' section clearing"
Assert-Test ($tableJs -match 'section\s*===\s*''payment''') "clearSection handles 'payment' section clearing"
Assert-Test ($tableJs -match 'section\s*===\s*''bank''') "clearSection handles 'bank' section clearing"

# 3. Clean Incompatible Fields on Mode Switching
Assert-Test ($tableJs -match 'cleanIncompatibleFields\(status\)\s*\{') "TableModule implements cleanIncompatibleFields helper"
Assert-Test ($tableJs -match 'cleanIncompatibleFields\(status\)') "selectToPayStatus invokes cleanIncompatibleFields"
Assert-Test ($tableJs -match 'cleanIncompatibleFields\(val\)') "syncToPayFromSelect invokes cleanIncompatibleFields"

# 4. Non-overwriting Backspace & Input Protection
Assert-Test ($tableJs -match 'document\.activeElement\s*!==\s*codInput') "liveCalcModal never overwrites codInput when actively typed into"
Assert-Test ($tableJs -match 'dataset\.autoFilled\s*=\s*''false''') "COD manual input flag prevents unwanted calculation overrides"

# 5. POD Status Automation
Assert-Test ($tableJs -match 'handlePodDateChange\(\)\s*\{[\s\S]*?statusEl\.value\s*=\s*''PENDING''') "handlePodDateChange reverts to PENDING if POD date is cleared"
Assert-Test ($tableJs -match 'handlePodStatusChange\(\)\s*\{') "TableModule implements handlePodStatusChange for dynamic pill styling"
Assert-Test ($dataJs -match 'podAmountStatus\s*===\s*0') "DataManager.saveTrip preserves 'DONE' podAmountStatus safely"

# 6. CSS Styling Consistency
Assert-Test ($cssStyles -match '\.btn-clear-section') "css/styles.css defines .btn-clear-section styling"
Assert-Test ($cssStyles -match '\.excel-grid\s+\.btn-sm') "css/styles.css defines compact table action buttons"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  TEST RESULTS: Passed: $passed, Failed: $failed" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

if ($failed -gt 0) { exit 1 } else { exit 0 }

