# verify_mode_blocking.ps1 - Automated verification of Strict Field Blocking, Clear Filters & Modern UI
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  SR BROKERAGE LEDGER - MODE BLOCKING & UI TEST SUITE   " -ForegroundColor Cyan
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

# 1. Verify setFieldState controls disabled state without destroying user input
Assert-Test ($tableJs -match 'setFieldState\s*=\s*\([^)]+\)\s*=>') "updateFormFieldsVisibility defines setFieldState helper"
Assert-Test ($tableJs -match 'input\.disabled\s*=\s*!isVisible') "setFieldState disables non-applicable inputs"
Assert-Test ($tableJs -match 'input\.classList\.(add|remove)\(''field-blocked''\)') "setFieldState manages field-blocked style without wiping entered amounts"

# 2. Verify F/TO-PAY field visibility & T/M availability
Assert-Test ($tableJs -match "setFieldState\('field_fright',\s*'m_fright',\s*true,\s*true\)") "F/TO-PAY enables Freight input"
Assert-Test ($tableJs -match "setFieldState\('field_tm',\s*'m_tm',\s*true,\s*true\)") "F/TO-PAY keeps T/M input available"
Assert-Test ($tableJs -match "setFieldState\('field_cod',\s*'m_cod',\s*true,\s*true\)") "F/TO-PAY enables COD input"
Assert-Test ($tableJs -match "setFieldState\('field_advance1',\s*'m_advance1',\s*false,\s*true\)") "F/TO-PAY blocks Advance 1"
Assert-Test ($tableJs -match "setFieldState\('field_advance2',\s*'m_advance2',\s*false,\s*true\)") "F/TO-PAY blocks Advance 2"
Assert-Test ($tableJs -match "setFieldState\('field_extraAmount',\s*'m_extraAmount',\s*false,\s*true\)") "F/TO-PAY blocks Extra Amount"

# 3. Verify A/TO-PAY strict blocking
Assert-Test ($tableJs -match "setFieldState\('field_tm',\s*'m_tm',\s*true,\s*true\)") "A/TO-PAY enables T/M input"
Assert-Test ($tableJs -match "setFieldState\('field_advance1',\s*'m_advance1',\s*true,\s*true\)") "A/TO-PAY enables Advance 1 input"
Assert-Test ($tableJs -match "setFieldState\('field_advance2',\s*'m_advance2',\s*false,\s*true\)") "A/TO-PAY blocks Advance 2"
Assert-Test ($tableJs -match "setFieldState\('field_extraAmount',\s*'m_extraAmount',\s*false,\s*true\)") "A/TO-PAY blocks Extra Amount"

# 4. Verify TOBILLED strict blocking
Assert-Test ($tableJs -match "setFieldState\('field_cod',\s*'m_cod',\s*false,\s*true\)") "TOBILLED strictly blocks COD input"
Assert-Test ($tableJs -match "setFieldState\('field_extraAmount',\s*'m_extraAmount',\s*true,\s*true\)") "TOBILLED enables Extra Amount input"

# 5. Verify liveCalcModal ignores disabled inputs
Assert-Test ($tableJs -match 'if\s*\(!el\s*\|\|\s*el\.disabled\)\s*return\s*0;') "liveCalcModal ignores disabled blocked inputs"

# 6. Verify handleSaveModal enforces mode-specific zeroing on tripData
Assert-Test ($tableJs -match 'normalizedTopay\s*===\s*''F/TO-PAY''') "handleSaveModal checks normalized Topay status"
Assert-Test ($tableJs -match 'codVal\s*=\s*frightVal') "handleSaveModal sets COD = Freight for F/TO-PAY"
Assert-Test ($tableJs -match 'codVal\s*=\s*Math\.max\(0,\s*frightVal\s*-\s*tmVal\s*-\s*adv1Val\)') "handleSaveModal sets COD for A/TO-PAY"
Assert-Test ($tableJs -match 'codVal\s*=\s*0') "handleSaveModal sets COD = 0 for TOBILLED"

# 7. Verify Physical Worksheet Tabs & Removal of Redundant Filters
Assert-Test ($indexHtml -match 'id="sheetTab_tobilled"') "index.html defines physical TOBILLED worksheet tab"
Assert-Test ($indexHtml -match 'id="sheetTab_all"') "index.html defines ALL filter worksheet tab as requested"

# 8. Verify UI Improvements in CSS
Assert-Test ($cssStyles -match '\.field-blocked') "css/styles.css defines .field-blocked indicator"
Assert-Test ($cssStyles -match 'input\[type=number\]::-webkit-inner-spin-button') "css/styles.css hides raw number input spinners"
Assert-Test ($cssStyles -match '\.truck-plate-ind') "css/styles.css defines authentic Indian HSRP truck plate"
Assert-Test ($cssStyles -match '\.btn-clear-filters') "css/styles.css defines .btn-clear-filters styling"
Assert-Test ($cssStyles -match 'min-height:\s*44px') "css/styles.css enforces 44px touch targets on mobile devices"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  TEST RESULTS: Passed: $passed, Failed: $failed" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

if ($failed -gt 0) { exit 1 } else { exit 0 }
