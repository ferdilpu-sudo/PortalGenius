# PortalGenius M-001: Windows operator bootstrap.
# Run only on your own trusted computer, with a checked-out PortalGenius branch.
# Supabase secret is requested as a masked SecureString, never saved in .dev.vars.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Push-Location $root
$secret = $null
$bstr = [IntPtr]::Zero
$envNames = @('SUPABASE_URL','EXPECTED_SUPABASE_PROJECT_REF','SUPABASE_SECRET_KEY','AUTH_ALIAS_DOMAIN')
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
    $domain = (Read-Host 'Domain alias Auth internal yang dikelola lembaga').Trim().ToLowerInvariant()
    if ($domain -notmatch '^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])$' -or -not $domain.Contains('.')) {
        throw 'Domain alias Auth harus berupa domain yang valid.'
    }
    $secret = Read-Host 'Supabase Secret API Key (input tersembunyi)' -AsSecureString
    if ($null -eq $secret -or $secret.Length -lt 12) {
        throw 'Secret API key tidak boleh kosong.'
    }
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)

    $env:SUPABASE_URL = 'https://vpglikrkvsnoyjvluigs.supabase.co'
    $env:EXPECTED_SUPABASE_PROJECT_REF = 'vpglikrkvsnoyjvluigs'
    $env:AUTH_ALIAS_DOMAIN = $domain
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
