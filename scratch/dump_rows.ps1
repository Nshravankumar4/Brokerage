Add-Type -AssemblyName System.IO.Compression.FileSystem

$zip = [System.IO.Compression.ZipFile]::OpenRead('E:\TR\P1\Final Sheet Broker.xlsx')
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

$sheetEntry = $zip.GetEntry('xl/worksheets/sheet1.xml')
$stream = $sheetEntry.Open()
$reader = New-Object System.IO.StreamReader($stream)
[xml]$sheetXml = $reader.ReadToEnd()
$reader.Close()
$stream.Close()

$rows = $sheetXml.worksheet.sheetData.row
foreach ($r in $rows) {
    $line = "Row $($r.r): "
    foreach ($c in $r.c) {
        $val = $c.v
        if ($c.t -eq 's' -and $val -ne $null) {
            $val = $sst[[int]$val]
        }
        $f = if ($c.f) { " [=$($c.f)]" } else { "" }
        $line += "$($c.r)=$val$f | "
    }
    Write-Host $line
}
$zip.Dispose()

