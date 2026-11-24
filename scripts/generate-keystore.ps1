param([string]$OutDir = '.\release-signing')
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$Keystore = Join-Path $OutDir 'shopmaster-pro-release.jks'
if (Test-Path $Keystore) { throw "Refusing to overwrite existing keystore: $Keystore" }
$StorePass = Read-Host 'Choose a strong keystore password' -AsSecureString
$KeyPass = Read-Host 'Choose a strong key password' -AsSecureString
$Alias = Read-Host 'Key alias [shopmasterpro]'
if ([string]::IsNullOrWhiteSpace($Alias)) { $Alias = 'shopmasterpro' }
function Convert-SecureToPlain($Secure) { $ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure); try {[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)} finally {[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)} }
$StorePlain=Convert-SecureToPlain $StorePass; $KeyPlain=Convert-SecureToPlain $KeyPass
keytool -genkeypair -v -keystore $Keystore -storetype JKS -alias $Alias -keyalg RSA -keysize 4096 -validity 10000 -dname 'CN=ShopMaster Pro, OU=Mobile, O=ShopMaster, L=Akola, ST=Maharashtra, C=IN' -storepass $StorePlain -keypass $KeyPlain
if ($LASTEXITCODE -ne 0) { throw 'keytool failed' }
$bytes=[IO.File]::ReadAllBytes((Resolve-Path $Keystore)); $b64=[Convert]::ToBase64String($bytes)
[IO.File]::WriteAllText((Join-Path $OutDir 'ANDROID_KEYSTORE_BASE64.txt'),$b64)
Write-Host "Created permanent signing key: $Keystore" -ForegroundColor Green
Write-Host 'Back up both files securely. Never commit them to GitHub.'
