# PortalGenius M-001 — first administrator bootstrap for trusted Windows operators.
# The Supabase Secret API Key is requested through masked input, never saved to disk.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Push-Location $root
$secret = $null
$bstr = [IntPtr]::Zero
$envNames = @('SUPABASE_URL', 'EXPECTED_SUPABASE_PROJECT_REF', 'SUPABASE_SECRET_KEY', 'AUTH_ADMIN_EMAIL')
try {
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        throw 'Node.js 22 atau lebih baru belum tersedia.'
    }
    $major = & node -p "Number(process.versions.node.split('.')[0])"
    if ($LASTEXITCODE -ne 0 -or [int]$major -lt 22) {
        throw 'Gunakan Node.js 22 atau lebih baru.'
    }
    if (-not (Test-Path 'node_modules/@supabase/supabase-js')) {
        throw 'Dependensi belum terpasang. Jalankan npm ci dari root repository.'
    }

    Write-Host 'PortalGenius - Bootstrap administrator pertama'
    Write-Host 'Target database: vpglikrkvsnoyjvluigs (Portal Genius)'
    Write-Host 'Secret hanya diteruskan ke proses Node lokal, tanpa disimpan pada file.'
    $adminEmail = (Read-Host 'Alamat email lengkap administrator yang kamu miliki').Trim().ToLowerInvariant()
    if ($adminEmail.Length -gt 254 -or $adminEmail -notmatch '^[^\s@]+@[^\s@]+\.[^\s@]+$') {
        throw 'Masukkan alamat email lengkap yang valid, bukan nama domain.'
    }

    $secret = Read-Host 'Supabase Secret API Key (input tersembunyi)' -AsSecureString
    if ($null -eq $secret -or $secret.Length -lt 12) {
        throw 'Secret API key tidak boleh kosong.'
    }
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)

    $env:SUPABASE_URL = 'https://vpglikrkvsnoyjvluigs.supabase.co'
    $env:EXPECTED_SUPABASE_PROJECT_REF = 'vpglikrkvsnoyjvluigs'
    $env:AUTH_ADMIN_EMAIL = $adminEmail
    $env:SUPABASE_SECRET_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)

    & node scripts/bootstrap-admin.mjs
    if ($LASTEXITCODE -ne 0) {
        throw 'Bootstrap belum berhasil. Jangan jalankan berulang sebelum membaca pesan error.'
    }
} finally {
    foreach ($name in $envNames) {
        Remove-Item "Env:$name" -ErrorAction SilentlyContinue
    }
    if ($bstr -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
    if ($null -ne $secret) {
        $secret.Dispose()
    }
    Pop-Location
}
