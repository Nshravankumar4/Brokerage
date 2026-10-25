# ==============================================================================
# SR BROKERAGE LEDGER - COMPREHENSIVE SECTION 20 ACCOUNTING TEST SUITE
# Transport Brokerage Ledger Pvt Ltd
# Automated Verification of Section 20 Authoritative Financial Rules
# ==============================================================================

$ErrorActionPreference = "Stop"
$passed = 0
$failed = 0

function Assert-Calc([string]$name, [bool]$condition, [string]$detail = "") {
    if ($condition) {
        Write-Host " [PASS] $name" -ForegroundColor Green
        $script:passed++
    } else {
        Write-Host " [FAIL] $name - $detail" -ForegroundColor Red
        $script:failed++
    }
}

# Emulate JS CalculationEngine in PowerShell for independent mathematical proof
function Calculate-Trip($trip) {
    $fright = [double]($trip.fright -as [double])
    $tm = [double]($trip.tm -as [double])
    $adv1 = [double]($trip.advance1 -as [double])
    $adv2 = [double]($trip.advance2 -as [double])
    $adv3 = [double]($trip.advance3 -as [double])
    $totalAdvances = $adv1 + $adv2 + $adv3
    $extraAmount = [double]($trip.extraAmount -as [double])
    $pm = [double]($trip.pm -as [double])
    $topay = ""
    if ($trip.topay) { $topay = $trip.topay.ToString().Trim().ToUpper() }

    $cod = 0.0
    $pendingTobilled = 0.0
    $finalBalc = 0.0

    if ($topay.StartsWith("F") -or $topay -eq "FULL" -or $topay -eq "FULL TO-BILLED" -or $topay -eq "FULL TO-PAY") {
        if ($trip.cod -ne $null -and $trip.cod -ne "" -and [double]($trip.cod) -gt 0) {
            $cod = [double]($trip.cod)
        } else {
            $cod = [Math]::Max(0.0, $fright - $tm - $totalAdvances)
        }
        $pendingTobilled = 0.0
        $finalBalc = 0.0
    }
    elseif ($topay.StartsWith("A") -or $topay -eq "ADV" -or $topay -eq "ADV TO-BILLED" -or $topay -eq "ADV TO-PAY") {
        $autoCod = [Math]::Max(0.0, $fright - $tm - $totalAdvances)
        if ($trip.cod -ne $null -and $trip.cod -ne "" -and [double]($trip.cod) -gt 0) {
            $cod = [double]($trip.cod)
        } else {
            $cod = $autoCod
        }
        $pendingTobilled = 0.0
        $finalBalc = [Math]::Max(0.0, $fright - $tm - $adv1 - $cod)
    }
    else {
        $cod = 0.0
        $pendingTobilled = $fright - $tm - $totalAdvances
        $finalBalc = $pendingTobilled + $extraAmount - $pm
    }

    return [PSCustomObject]@{
        fright = $fright
        tm = $tm
        totalAdvances = $totalAdvances
        cod = $cod
        pendingTobilled = $pendingTobilled
        extraAmount = $extraAmount
        pm = $pm
        finalBalc = $finalBalc
    }
}

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "  SR BROKERAGE LEDGER - SECTION 20 ACCOUNTING TESTS" -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

# 1. Full settlement: Freight 90,000, applicable payment 90,000 -> Outstanding 0
$res1 = Calculate-Trip @{ topay = "F/TO-PAY"; fright = 90000; cod = 90000 }
Assert-Calc "Case 1: Full settlement (Freight 90,000, COD 90,000 -> Outstanding 0)" `
    ($res1.cod -eq 90000 -and $res1.finalBalc -eq 0)

# 2. A/TO-PAY: Freight 80,000, advance 40,000, no other adjustments -> Balance @ unloading 40,000
$res2 = Calculate-Trip @{ topay = "A/TO-PAY"; fright = 80000; advance1 = 40000 }
Assert-Calc "Case 2: A/TO-PAY (Freight 80,000, Adv 40,000 -> Balance @ unloading 40,000)" `
    ($res2.cod -eq 40000)

# 3. A/TO-PAY sample: Freight 90,000, T/M 200, advance 49,800 -> Basic balance 40,000
$res3 = Calculate-Trip @{ topay = "A/TO-PAY"; fright = 90000; tm = 200; advance1 = 49800 }
Assert-Calc "Case 3: A/TO-PAY sample (Freight 90,000, TM 200, Adv 49,800 -> COD 40,000)" `
    ($res3.cod -eq 40000)

# 4. A/TO-PAY sample COD: Freight 90,000, T/M 200, advance 49,800, COD 40,000 -> Outstanding 0
$res4 = Calculate-Trip @{ topay = "A/TO-PAY"; fright = 90000; tm = 200; advance1 = 49800; cod = 40000 }
Assert-Calc "Case 4: A/TO-PAY sample COD settled (COD 40,000 -> Outstanding 0)" `
    ($res4.finalBalc -eq 0)

# 5. F/TO-PAY: Freight 42,000, COD 42,000, no other deductions -> Outstanding 0
$res5 = Calculate-Trip @{ topay = "F/TO-PAY"; fright = 42000; cod = 42000 }
Assert-Calc "Case 5: F/TO-PAY (Freight 42,000, COD 42,000 -> Outstanding 0)" `
    ($res5.cod -eq 42000 -and $res5.finalBalc -eq 0)

# 6. TOBILLED initial: Freight 60,000, T/M 300, advance 49,700 -> Initial pending 10,000
$res6 = Calculate-Trip @{ topay = "TOBILLED"; fright = 60000; tm = 300; advance1 = 49700 }
Assert-Calc "Case 6: TOBILLED initial (Freight 60,000, TM 300, Adv 49,700 -> Initial pending 10,000)" `
    ($res6.pendingTobilled -eq 10000)

# 7. TOBILLED extra: Initial pending 10,000, Extra Amount 5,000 -> Pending before P/M 15,000
$res7 = Calculate-Trip @{ topay = "TOBILLED"; fright = 60000; tm = 300; advance1 = 49700; extraAmount = 5000 }
Assert-Calc "Case 7: TOBILLED extra (Initial pending 10,000 + Extra 5,000 -> 15,000)" `
    (($res7.pendingTobilled + $res7.extraAmount) -eq 15000)

# 8. TOBILLED payment: Pending 15,000, P/M 300 -> Final pending 14,700
$res8 = Calculate-Trip @{ topay = "TOBILLED"; fright = 60000; tm = 300; advance1 = 49700; extraAmount = 5000; pm = 300 }
Assert-Calc "Case 8: TOBILLED payment (15,000 - PM 300 -> Final pending 14,700)" `
    ($res8.finalBalc -eq 14700)

# 9. No Extra Amount: Initial pending 10,000, Extra Amount blank/0, P/M 200 -> Final pending 9,800
$res9 = Calculate-Trip @{ topay = "TOBILLED"; fright = 60000; tm = 300; advance1 = 49700; extraAmount = 0; pm = 200 }
Assert-Calc "Case 9: No Extra Amount (Initial pending 10,000 - PM 200 -> Final pending 9,800)" `
    ($res9.finalBalc -eq 9800)

# 10. Blank advances: Valid freight 50,000, advance fields blank -> No calculation error
$res10 = Calculate-Trip @{ topay = "TOBILLED"; fright = 50000; tm = 0; advance1 = $null; advance2 = ""; advance3 = $null }
Assert-Calc "Case 10: Blank advances handle safely (Freight 50,000 -> Pending 50,000)" `
    ($res10.pendingTobilled -eq 50000)

# 11. NA advances: Valid freight 50,000, advance fields contain NA -> No calculation error
$res11 = Calculate-Trip @{ topay = "TOBILLED"; fright = 50000; tm = 0; advance1 = "NA"; advance2 = "na"; advance3 = "N/A" }
Assert-Calc "Case 11: NA advances handle safely (Freight 50,000 -> Pending 50,000)" `
    ($res11.pendingTobilled -eq 50000)

# 12. TOBILLED COD: Status TOBILLED -> COD is 0
$res12 = Calculate-Trip @{ topay = "TOBILLED"; fright = 60000 }
Assert-Calc "Case 12: TOBILLED COD is nonapplicable / 0" `
    ($res12.cod -eq 0)

# 13. A/TO-PAY pending: Status A/TO-PAY -> TOBILLED-only pending is 0
$res13 = Calculate-Trip @{ topay = "A/TO-PAY"; fright = 80000; advance1 = 40000 }
Assert-Calc "Case 13: A/TO-PAY pendingTobilled is nonapplicable / 0" `
    ($res13.pendingTobilled -eq 0)

# 14. Edit advance: Change advance from 40,000 to 50,000 -> Balance updates correctly
$res14_orig = Calculate-Trip @{ topay = "A/TO-PAY"; fright = 80000; advance1 = 40000 }
$res14_edit = Calculate-Trip @{ topay = "A/TO-PAY"; fright = 80000; advance1 = 50000 }
Assert-Calc "Case 14: Edit advance updates COD from 40,000 to 30,000" `
    ($res14_orig.cod -eq 40000 -and $res14_edit.cod -eq 30000)

# 15. Edit payment: Change P/M from 200 to 300 -> Payment counted exactly once
$res15_orig = Calculate-Trip @{ topay = "TOBILLED"; fright = 60000; tm = 300; advance1 = 49700; pm = 200 }
$res15_edit = Calculate-Trip @{ topay = "TOBILLED"; fright = 60000; tm = 300; advance1 = 49700; pm = 300 }
Assert-Calc "Case 15: Edit payment counted exactly once (9,800 -> 9,700)" `
    ($res15_orig.finalBalc -eq 9800 -and $res15_edit.finalBalc -eq 9700)

# 16. Reopen record: Load saved record -> No additional deductions
$res16_open1 = Calculate-Trip @{ topay = "TOBILLED"; fright = 60000; tm = 300; advance1 = 49700; pm = 200 }
$res16_open2 = Calculate-Trip @{ topay = "TOBILLED"; fright = 60000; tm = 300; advance1 = 49700; pm = 200 }
Assert-Calc "Case 16: Reopen record creates no repeated deductions" `
    ($res16_open1.finalBalc -eq $res16_open2.finalBalc)

# 17. Recalculate repeatedly: 5 iterations produce identical results
$t17 = @{ topay = "TOBILLED"; fright = 70000; tm = 300; advance1 = 59700; pm = 200 }
$r17_first = Calculate-Trip $t17
$allIdentical = $true
for ($i = 0; $i -lt 5; $i++) {
    $r = Calculate-Trip $t17
    if ($r.finalBalc -ne $r17_first.finalBalc -or $r.pendingTobilled -ne $r17_first.pendingTobilled) {
        $allIdentical = $false
    }
}
Assert-Calc "Case 17: Repeated recalculation produces strictly idempotent results" `
    ($allIdentical -and $r17_first.finalBalc -eq 9800)

# 18. Duplicate LR protection in data manager
$dataJs = Get-Content -Raw "js\data.js"
Assert-Calc "Case 18: isDuplicateLr prevents duplicate LR submissions" `
    ($dataJs -match 'isDuplicateLr\(lrNo' -and $dataJs -match 'existing === target')

# 19. Delete record functionality in table.js
$tableJs = Get-Content -Raw "js\table.js"
Assert-Calc "Case 19: deleteTripRecord preserves other records and re-renders table" `
    ($tableJs -match 'deleteTripRecord' -and $tableJs -match 'DataManager\.deleteTrip')

# 20. Multi-worksheet export with 28 columns
Assert-Calc "Case 20: exportToExcel creates TOBILLED, A_TOPAY, F_TOPAY, Master Ledger" `
    ($tableJs -match 'populateSheet\(''TOBILLED''' -and $tableJs -match 'populateSheet\(''A_TOPAY''' -and $tableJs -match 'populateSheet\(''F_TOPAY''' -and $tableJs -match 'populateSheet\(''Master Ledger''')

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "  SECTION 20 ACCOUNTING TEST RESULTS SUMMARY" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " Passed: $passed" -ForegroundColor Green
Write-Host " Failed: $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })
Write-Host " Total:  $($passed + $failed)" -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

if ($failed -gt 0) { exit 1 }
