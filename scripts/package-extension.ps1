$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$distPath = Join-Path $projectRoot 'dist'
$archivePath = Join-Path $projectRoot 'byeco-ui-cloner.zip'

if (-not (Test-Path (Join-Path $distPath 'manifest.json'))) {
  throw "dist/manifest.json bulunamadi. Once npm run build calistirin."
}

if (Test-Path $archivePath) {
  Remove-Item -LiteralPath $archivePath -Force
}

Compress-Archive -Path (Join-Path $distPath '*') -DestinationPath $archivePath -CompressionLevel Optimal

Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead($archivePath)
try {
  $entries = @($archive.Entries | ForEach-Object { $_.FullName -replace '/', '\\' })
  if ('manifest.json' -notin $entries) {
    throw 'Paket kokunde manifest.json bulunamadi.'
  }

  $invalidEntries = @($entries | Where-Object {
    $_ -notmatch '^[^\\]+(?:\\.*)?$' -or $_ -match '^UICLONER\\'
  })
  if ($invalidEntries.Count -gt 0) {
    throw "Paket proje klasoruyle birlikte olusturulmus: $($invalidEntries -join ', ')"
  }
}
finally {
  $archive.Dispose()
}

Write-Host "Hazir: $archivePath"
Write-Host 'Chrome Web Store icin bu ZIP dosyasini yukleyin; proje klasorunu degil.'
