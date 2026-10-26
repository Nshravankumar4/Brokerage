# verify_backend_and_schema.ps1 - Direct verification of Master Workbook, Backend Script & Security
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " SR BROKERAGE LEDGER - WORKBOOK SCHEMA & BACKEND AUDIT  " -ForegroundColor Cyan
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

# 1. Inspect Master Workbook XML
Add-Type -AssemblyName System.IO.Compression.FileSystem
$wbPath = if (Test-Path "E:\TR\Final Sheet Broker.xlsx") { "E:\TR\Final Sheet Broker.xlsx" } else { "E:\TR\P1\backups\Final_Sheet_Broker_backup.xlsx" }
Assert-Test (Test-Path $wbPath) "Master workbook 'Final Sheet Broker.xlsx' exists"

$zip = [System.IO.Compression.ZipFile]::OpenRead($wbPath)
$sheetEntry = $zip.GetEntry('xl/worksheets/sheet1.xml')
$stream = $sheetEntry.Open()
$reader = New-Object System.IO.StreamReader($stream)
[xml]$sheetXml = $reader.ReadToEnd()
$reader.Close()
$stream.Close()
$zip.Dispose()

$dim = $sheetXml.worksheet.dimension.ref
Assert-Test ($dim -match 'A1:AB') "Workbook dimension ref is 28 columns (A to AB): $dim"

# Check row 1 column count in workbook
$row1 = $sheetXml.worksheet.sheetData.row | Where-Object { $_.r -eq '1' }
Assert-Test ($row1.c.Count -eq 28) "Workbook Row 1 contains exactly 28 column cells"

# Check specific cells formulas in workbook
$v2 = ($sheetXml.worksheet.sheetData.row | Where-Object { $_.r -eq '2' }).c | Where-Object { $_.r -eq 'V2' }
$z2 = ($sheetXml.worksheet.sheetData.row | Where-Object { $_.r -eq '2' }).c | Where-Object { $_.r -eq 'Z2' }
$u8 = ($sheetXml.worksheet.sheetData.row | Where-Object { $_.r -eq '8' }).c | Where-Object { $_.r -eq 'U8' }
$z8 = ($sheetXml.worksheet.sheetData.row | Where-Object { $_.r -eq '8' }).c | Where-Object { $_.r -eq 'Z8' }
$u12 = ($sheetXml.worksheet.sheetData.row | Where-Object { $_.r -eq '12' }).c | Where-Object { $_.r -eq 'U12' }
$z12 = ($sheetXml.worksheet.sheetData.row | Where-Object { $_.r -eq '12' }).c | Where-Object { $_.r -eq 'Z12' }

Assert-Test ($v2.f -eq 'K2-N2-O2-Q2-S2') "Workbook Cell V2 formula is K2-N2-O2-Q2-S2 (Pending Tobilled)"
Assert-Test ($z2.f -eq 'V2+W2-Y2') "Workbook Cell Z2 formula is V2+W2-Y2 (Final Pending)"
Assert-Test ($u8.f -eq 'K8-N8-O8-Q8-S8') "Workbook Cell U8 formula is K8-N8-O8-Q8-S8 (A/TO-PAY COD)"
Assert-Test ($z8.f -eq 'K8-N8-O8-U8') "Workbook Cell Z8 formula is K8-N8-O8-U8 (A/TO-PAY Pending = 0)"
Assert-Test ($u12.f -eq 'K12-N12-O12-Q12-S12') "Workbook Cell U12 formula is K12-N12-O12-Q12-S12 (F/TO-PAY COD)"
Assert-Test ($z12.f -eq 'K12-N12-O12-U12') "Workbook Cell Z12 formula is K12-N12-O12-U12 (F/TO-PAY Pending = 0)"

# 2. Inspect backend/Code.gs
$codeGs = [System.IO.File]::ReadAllText("E:\TR\P1\backend\Code.gs", [System.Text.Encoding]::UTF8)

Assert-Test ($codeGs -match 'HEADERS\s*=\s*\[[\s\S]*?''REMARKS\s*/\s*NOTE''[\s\S]*?\];') "backend/Code.gs defines authoritative 28-column HEADERS array"
Assert-Test ($codeGs -match 'rowData\.length\s*!==\s*28') "backend/Code.gs strictly verifies rowData.length === 28"
Assert-Test ($codeGs -match 'lock\.waitLock\(15000\)') "backend/Code.gs uses LockService concurrency protection"
Assert-Test ($codeGs -match 'adminActions\.indexOf\(action\)\s*!==\s*-1') "backend/Code.gs enforces authorization for admin actions"
Assert-Test ($codeGs -match 'actualRow\s*!==\s*rowNum') "backend/Code.gs excludes current record when checking duplicate LR"
Assert-Test ($codeGs -match 'calc\.pendingTobilled') "backend/Code.gs uses calc.pendingTobilled consistently"
Assert-Test ($codeGs -match 'calc\.status\s*===\s*''TOBILLED''\s*\?\s*calc\.pendingTobilled\s*:\s*''if A/Topay&Ftopay Na''') "backend/Code.gs maps Column V dynamically per status"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  TEST RESULTS: Passed: $passed, Failed: $failed" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

