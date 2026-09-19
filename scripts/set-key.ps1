$ErrorActionPreference = 'Stop'

# BYECO UI Cloner — Groq API anahtarini DPAPI (bu Windows hesabi) ile sifreler.
# Sadece bu kullanici hesabinda cozulebilir; dosya calinsa bile baska
# makinede/hesapta ise yaramaz. Duz metin .env'deki anahtari da temizler.

$projectRoot = Split-Path -Parent $PSScriptRoot
$encPath = Join-Path $projectRoot '.groqkey.enc'
$envPath = Join-Path $projectRoot '.env'

Write-Host 'Groq API anahtarinizi yapistirip Enter''a basin (ekranda gorunmez):'
$secure = Read-Host -AsSecureString
if ($secure.Length -eq 0) {
  throw 'Bos anahtar girildi, islem iptal.'
}

$encrypted = $secure | ConvertFrom-SecureString
Set-Content -LiteralPath $encPath -Value $encrypted -NoNewline -Encoding Ascii

# Sadece bu kullanici okuyabilsin (miras izinleri kaldir)
$grant = "$env:USERNAME:R"
icacls $encPath /inheritance:r | Out-Null
icacls $encPath /grant:r $grant | Out-Null

# .env'deki duz metin anahtari placeholder ile degistir
if (Test-Path -LiteralPath $envPath) {
  $lines = Get-Content -LiteralPath $envPath | ForEach-Object {
    if ($_ -match '^\s*GROQ_API_KEY\s*=') { 'GROQ_API_KEY=put_your_shared_key_here' } else { $_ }
  }
  Set-Content -LiteralPath $envPath -Value $lines -Encoding Ascii
  $grant = "$env:USERNAME:R"
  icacls $envPath /inheritance:r | Out-Null
  icacls $envPath /grant:r $grant | Out-Null
}

Write-Host ''
Write-Host 'Tamam: anahtar sifreli saklandi, .env temizlendi ve kilitlendi.'
Write-Host 'Sunucuyu normal sekilde baslatin: npm run server'
