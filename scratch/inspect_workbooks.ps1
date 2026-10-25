Add-Type -AssemblyName System.IO.Compression.FileSystem

function Inspect-Xlsx($path) {
    Write-Host "========================================================" -ForegroundColor Yellow
    Write-Host " Inspecting: $path" -ForegroundColor Yellow
    Write-Host "========================================================" -ForegroundColor Yellow
    if (-not (Test-Path $path)) {
        Write-Host "File not found: $path" -ForegroundColor Red
        return
    }

    $zip = [System.IO.Compression.ZipFile]::OpenRead($path)
    
    # Read shared strings
    $sstEntry = $zip.GetEntry('xl/sharedStrings.xml')
    $sst = @()
    if ($sstEntry) {
        $stream = $sstEntry.Open()
        $reader = New-Object System.IO.StreamReader($stream)
        [xml]$sstXml = $reader.ReadToEnd()
        $reader.Close()
        $stream.Close()
        $sst = $sstXml.sst.si | ForEach-Object {
            if ($_.t) { $_.t }
            elseif ($_.r) { ($_.r | ForEach-Object { $_.t }) -join '' }
            else { "" }
        }
    }

    # Read workbook.xml for sheets
    $wbEntry = $zip.GetEntry('xl/workbook.xml')
    $stream = $wbEntry.Open()
    $reader = New-Object System.IO.StreamReader($stream)
    [xml]$wbXml = $reader.ReadToEnd()
    $reader.Close()
    $stream.Close()

    $sheets = $wbXml.workbook.sheets.sheet
    foreach ($s in $sheets) {
        Write-Host "Sheet Name: $($s.name) | Id: $($s.sheetId)" -ForegroundColor Cyan
    }

    # Inspect each sheet
    $sheetIdx = 1
    foreach ($s in $sheets) {
        $sheetEntry = $zip.GetEntry("xl/worksheets/sheet$sheetIdx.xml")
        if ($sheetEntry) {
            Write-Host "--- Sheet: $($s.name) ---" -ForegroundColor Green
            $stream = $sheetEntry.Open()
            $reader = New-Object System.IO.StreamReader($stream)
            [xml]$sheetXml = $reader.ReadToEnd()
            $reader.Close()
            $stream.Close()

            $dimension = $sheetXml.worksheet.dimension.ref
            Write-Host "Dimension: $dimension" -ForegroundColor Gray

            # Row 1 headers
            $row1 = $sheetXml.worksheet.sheetData.row | Where-Object { $_.r -eq '1' }
            if ($row1) {
                Write-Host "Row 1 Columns:" -ForegroundColor White
                foreach ($c in $row1.c) {
                    $val = $c.v
                    if ($c.t -eq 's' -and $val -ne $null) {
                        $val = $sst[[int]$val]
                    }
                    Write-Host "  $($c.r) = $val"
                }
            }

            # Formulas in first 10 rows
            Write-Host "Formulas in Sheet '$($s.name)':" -ForegroundColor White
            $rows = $sheetXml.worksheet.sheetData.row | Select-Object -First 10
            foreach ($r in $rows) {
                foreach ($c in $r.c) {
                    if ($c.f) {
                        Write-Host "  Cell $($c.r): Formula = '$($c.f)' | Value = '$($c.v)'"
                    }
                }
            }
        }
        $sheetIdx++
    }
    $zip.Dispose()
}

Inspect-Xlsx "E:\TR\P1\Final Sheet Broker.xlsx"
Inspect-Xlsx "E:\TR\BROKER DETAILS ADVANCE BALC DETAILS.xlsx"

