$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = [System.IO.File]::ReadAllText((Join-Path $root 'backend\PublicDemo.gs'), [System.Text.Encoding]::UTF8)
$client = [System.IO.File]::ReadAllText((Join-Path $root 'js\public-demo.js'), [System.Text.Encoding]::UTF8)
$page = [System.IO.File]::ReadAllText((Join-Path $root 'public-demo.html'), [System.Text.Encoding]::UTF8)
$productionBackend = [System.IO.File]::ReadAllText((Join-Path $root 'backend\Code.gs'), [System.Text.Encoding]::UTF8)

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

Assert-Test ($backend -match 'function\s+doGet\s*\(' -and $backend -match 'function\s+doPost\s*\(') 'Standalone demo backend defines its own web-app entry points'
Assert-Test ($backend -match "PUBLIC_DEMO_SPREADSHEET_ID" -and $backend -match "properties\.getProperty\('LIVE_SPREADSHEET_ID'\).*properties\.getProperty\('SPREADSHEET_ID'\)") 'Demo backend requires a separate demo spreadsheet and checks the live spreadsheet ID'
Assert-Test ($backend -match 'demoId\s*===\s*liveId') 'Demo backend rejects using the live spreadsheet as its demo'
Assert-Test ($backend -match "\['publicDemoGetAll',\s*'publicDemoSave',\s*'publicDemoDelete'\]") 'Public API allowlist contains only demo read/write actions'
Assert-Test ($backend -match 'PUBLIC_DEMO_ROW_LIMIT' -and $backend -match 'CAPACITY_REACHED') 'Public demo enforces its maximum row count'
Assert-Test ($backend -match 'FORMULA_TEXT' -and $backend.Contains('if (/^[=+\-@]/.test(values[field]))')) 'Public demo rejects formula-like user text before writing to Sheets'
Assert-Test ($backend -match 'PUBLIC_DEMO_INITIALIZED_FOR' -and $backend -match 'The PUBLIC_DEMO tab is not empty') 'Initialization preserves non-empty unmarked demo sheets'
Assert-Test ($client -match 'PASTE_PUBLIC_DEMO_WEB_APP_URL_HERE' -and $client -match 'publicDemoGetAll' -and $client -match 'publicDemoSave' -and $client -match 'publicDemoDelete') 'Demo client has an explicit endpoint placeholder and uses only demo actions'
Assert-Test ($client -match '\.textContent\s*=' -and $client -notmatch '\.innerHTML') 'Demo client renders record values as text, not executable markup'
Assert-Test ($page -match 'Do not enter real names' -and $page -match 'js/public-demo\.js' -and $page -notmatch 'js/(api|auth|data)\.js') 'Demo page warns against real data and does not load production modules'
Assert-Test ($productionBackend -notmatch 'publicDemoGetAll|publicDemoSave|publicDemoDelete') 'Production backend remains separate from public demo actions'

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  TEST RESULTS: Passed: $passed, Failed: $failed" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

if ($failed -gt 0) { exit 1 } else { exit 0 }
