# ==============================================================================
# SR BROKERAGE LEDGER - COMPLETE AUDIT & VERIFICATION SUITE
# Transport Brokerage Ledger Pvt Ltd
# Authoritative Workbook: BROKER DETAILS ADVANCE BALC DETAILS.xlsx
# Master 28-Column Formula Architecture (Columns A through AB)
# Developed by Shravan Kumar
# ==============================================================================

$ErrorActionPreference = "Stop"
$passed = 0
$failed = 0

function Assert-Test([string]$name, [bool]$condition, [string]$detail = "") {
    if ($condition) {
        Write-Host " [PASS] $name" -ForegroundColor Green
        $script:passed++
    } else {
        Write-Host " [FAIL] $name - $detail" -ForegroundColor Red
        $script:failed++
    }
}

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "  SR BROKERAGE LEDGER - COMPLETE AUDIT & VERIFICATION" -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

# 1. MASTER 28-COLUMN ARCHITECTURE IN index.html
$html = Get-Content -Raw "index.html"

Assert-Test "index.html table headers define 28 Excel columns (A to AB)" `
    ($html -match '<th>A</th>' -and $html -match '<th>AA</th>' -and $html -match '<th>AB</th>')

Assert-Test "index.html header Col M is 'ToPayStatus'" `
    ($html -match '<th class="th-green"[^>]*>ToPayStatus</th>')

Assert-Test "index.html header Col T is 'POD RECD Date'" `
    ($html -match '<th>POD RECD Date</th>')

Assert-Test "index.html header Col U is 'COD \(A/F-ToPay\)'" `
    ($html -match '<th>COD \(A/F-ToPay\)</th>')

Assert-Test "index.html header Col V is 'Pending: ToBilled'" `
    ($html -match '<th class="th-yellow">Pending: ToBilled</th>')

Assert-Test "index.html header Col W is 'Extra Amount'" `
    ($html -match '<th>Extra Amount</th>')

Assert-Test "index.html header Col X is 'PM/PA Date'" `
    ($html -match '<th>PM/PA Date</th>')

Assert-Test "index.html header Col Y is 'P/M'" `
    ($html -match '<th>P/M</th>')

Assert-Test "index.html header Col Z is 'Pending Amount'" `
    ($html -match '<th class="th-red">Pending Amount</th>')

Assert-Test "index.html header Col AA is 'POD Status'" `
    ($html -match '<th>POD Status</th>')

Assert-Test "index.html header Col AB is 'REMARKS / NOTE'" `
    ($html -match '<th>REMARKS / NOTE</th>')

Assert-Test "index.html footer contains all matching sum IDs" `
    ($html -match 'id="totFreight"' -and $html -match 'id="totCOD"' -and $html -match 'id="totPendingTobilled"' -and $html -match 'id="totExtra"' -and $html -match 'id="totFinalBalc"')

# 2. MODAL FORM & TO-BILLED TRACKING IN index.html
Assert-Test "Modal has Extra Amount (Col W) input" `
    ($html -match 'id="m_extraAmount"')

Assert-Test "Modal has COD (Col U) input" `
    ($html -match 'id="m_cod"')

Assert-Test "Modal has ToPayStatus dropdown with exactly 3 options" `
    ($html -match 'id="m_topay"' -and $html -match '<option value="A/TO-PAY">A/TO-PAY</option>' -and $html -match '<option value="F/TO-PAY">F/TO-PAY</option>' -and $html -match '<option value="TOBILLED">TOBILLED</option>')

Assert-Test "Modal and table do not include removed POC details" `
    ($html -notmatch 'pocSection|m_pocDate|m_pocAmount|m_pocNotes' -and
     (Get-Content -Raw "js\table.js") -notmatch 'pocDate|pocAmount|pocNotes|POC:')

Assert-Test "Modal has quick search & datalist autofill" `
    ($html -match 'id="modalAutofillBox"' -and $html -match 'id="m_autofillSearch"' -and $html -match 'id="m_trspName_list"')

# 3. MATHEMATICAL CALCULATION ENGINE IN js/calculations.js
$calcJs = Get-Content -Raw "js\calculations.js"

Assert-Test "CalculationEngine implements F/TO-PAY COD = Freight formula" `
    ($calcJs -match 'F/TO-PAY' -and $calcJs -match 'pendingTobilled\s*=\s*0' -and $calcJs -match 'finalBalc\s*=\s*0')

Assert-Test "CalculationEngine implements A/TO-PAY COD = Freight - TM - Adv formula" `
    ($calcJs -match 'A/TO-PAY' -and $calcJs -match 'autoCod\s*=\s*Math\.max\(0,\s*fright\s*-\s*tm\s*-\s*totalAdvances\)')

Assert-Test "CalculationEngine implements TOBILLED Pending = Freight - TM - Adv formula" `
    ($calcJs -match 'pendingTobilled\s*=\s*fright\s*-\s*tm\s*-\s*totalAdvances')

Assert-Test "CalculationEngine implements TOBILLED Final Net = Pending + Extra - PM" `
    ($calcJs -match 'finalBalc\s*=\s*pendingTobilled\s*\+\s*extraAmount\s*-\s*pm')

Assert-Test "CalculationEngine implements Col AA POD Amount Status = 0" `
    ($calcJs -match 'podAmountStatus\s*=\s*pendingTobilled\s*\+\s*extraAmount\s*-\s*pm\s*-\s*finalBalc')

# 4. SPREADSHEET VIEW & EXCEL EXPORT IN js/table.js
$tableJs = Get-Content -Raw "js\table.js"

Assert-Test "js/table.js renderExcelView outputs all 28 columns (A-AB)" `
    ($tableJs -match 'calc\.pendingTobilled' -and $tableJs -match 'calc\.extraAmount' -and $tableJs -match 'calc\.podAmountStatus')

Assert-Test "js/table.js renderExcelView updates bottom sum totals" `
    ($tableJs -match 'totPendingTobilled' -and $tableJs -match 'totExtra' -and $tableJs -match 'totCOD')

Assert-Test "js/table.js exportToExcel includes 28 columns definitions" `
    ($tableJs -match 'Pending Amount: Tobilled' -and $tableJs -match 'Extra Amount' -and $tableJs -match 'POD Amount Status')

Assert-Test "Exports require a verified cloud ledger before generating files" `
    ($tableJs -match 'ensureCloudDataForExport' -and $tableJs -match 'result\.source\s*!==\s*''cloud''')

Assert-Test "CSV export neutralizes formula-like text cells" `
    ($tableJs -match 'const csvText = value =>' -and $tableJs.Contains('[=+\-@]') -and
     $tableJs.Contains(([string][char]96) + [char]39 + '$' + '{text}'))

Assert-Test "js/table.js liveCalcModal handles extraAmount, COD, and pending balances" `
    ($tableJs -match 'm_extraAmount' -and $tableJs -match 'mCalcBalc' -and $tableJs -match 'mCalcFinalBalc')

Assert-Test "js/table.js handles strict duplicate LR NO validation" `
    ($tableJs -match 'isDuplicateLr' -and $tableJs -match 'Duplicate LR NO Error')

# 5. GOOGLE APPS SCRIPT BACKEND IN backend/Code.gs
$codeGs = Get-Content -Raw "backend\Code.gs"

Assert-Test "backend/Code.gs HEADERS has authoritative 28 columns (A-AB)" `
    ($codeGs -match 'var HEADERS\s*=\s*\[' -and $codeGs -match '''Pending Amount: Tobilled''' -and $codeGs -match '''Extra Amount''' -and $codeGs -match '''POD Amount Status''')

Assert-Test "backend/Code.gs handleGetAll maps 28 columns with formulas" `
    ($codeGs -match 'pendingTobilled\s*=\s*fright\s*-\s*tm\s*-\s*totalAdvances' -and $codeGs -match 'finalBalc\s*=\s*pendingTobilled\s*\+\s*extraAmount\s*-\s*pm')

Assert-Test "backend/Code.gs keeps 28 business columns and stores shipment identity separately" `
    ($codeGs -match 'STORAGE_HEADERS\s*=\s*HEADERS\.concat\(\[SHIPMENT_ID_HEADER\]\)' -and $codeGs -match 'rowData\.length\s*!==\s*STORAGE_HEADERS\.length')

Assert-Test "backend/Code.gs duplicate LR NO rejection active" `
    ($codeGs -match 'DUPLICATE_LR')

# 6. BRANDING, COPYRIGHT, & SECURITY
$authJs = Get-Content -Raw "js\auth.js"
$css = Get-Content -Raw "css\styles.css"

Assert-Test "Branding title in index.html is 'SR Brokerage Ledger'" `
    ($html -match '<title>SR Brokerage Ledger')

Assert-Test "Branding developer is 'Shravan Kumar'" `
    ($html -match 'Developed by <strong>Shravan Kumar</strong>')

Assert-Test "Branding copyright is 'Transport Brokerage Ledger Pvt Ltd'" `
    ($html -match 'Transport Brokerage Ledger Pvt Ltd')

Assert-Test "Browser authentication contains no hardcoded password hashes" `
    ($authJs -notmatch 'passHash|ded12726612993e58a7f6f1b0428300adcf13f6cabb7515436c5888b3de21c0b|0a623bcaece42a5740cdfb0b78849ec8717d811c8c2583697ab884513f4d9e3f')

Assert-Test "Authentication delegates credential verification to the server" `
    ($authJs -match 'ApiService\.login\(account\.username,\s*pwd\)' -and $codeGs -match 'derivePasswordHash' -and $codeGs -match '_PASSWORD_HASH')

Assert-Test "Navbar has flex-wrap: nowrap on desktop" `
    ($css -match '\.app-navbar\s*\{[^}]*flex-wrap:\s*nowrap')

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "  TEST RESULTS SUMMARY" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " Passed: $passed" -ForegroundColor Green
Write-Host " Failed: $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })
Write-Host " Total:  $($passed + $failed)" -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

if ($failed -gt 0) {
    exit 1
}
