# Single-purpose read-only logical archive of PortalGenius PostgreSQL.
# Never connect to a different project. Never restore/migrate/modify data.
# Requires PostgreSQL 17 pg_dump and pg_restore client binaries on Windows.
param(
  [Parameter(Mandatory = $true)]
  [string]$Destination,
  [switch]$EncryptedDestinationConfirmed
)
$ErrorActionPreference = 'Stop'
$projectRef = 'vpglikrkvsnoyjvluigs'

if (-not $EncryptedDestinationConfirmed) {
  throw 'BACKUP_BLOCKED: use an encrypted, access-controlled off-repository drive and acknowledge it.'
}
if (-not (Test-Path -LiteralPath $Destination -PathType Container)) {
  throw 'BACKUP_BLOCKED: encrypted destination directory does not exist.'
}
$destinationPath = [System.IO.Path]::GetFullPath((Resolve-Path -LiteralPath $Destination).Path)
$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..')).TrimEnd('\') + '\'
if (($destinationPath.TrimEnd('\') + '\').StartsWith(
  $repoRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw 'BACKUP_BLOCKED: destination must be outside the Git checkout.'
}
if (Test-Path Env:PGPASSWORD) {
  throw 'BACKUP_BLOCKED: clear any pre-existing PGPASSWORD environment variable first.'
}
$pgDump = (Get-Command pg_dump.exe -ErrorAction SilentlyContinue | Select-Object -First 1).Source
$pgRestore = (Get-Command pg_restore.exe -ErrorAction SilentlyContinue | Select-Object -First 1).Source
if (-not $pgDump -or -not $pgRestore) {
  $installation = Join-Path $env:ProgramFiles 'PostgreSQL\17\bin'
  if (-not $pgDump) { $pgDump = Join-Path $installation 'pg_dump.exe' }
  if (-not $pgRestore) { $pgRestore = Join-Path $installation 'pg_restore.exe' }
}
if (-not (Test-Path -LiteralPath $pgDump -PathType Leaf) -or
    -not (Test-Path -LiteralPath $pgRestore -PathType Leaf)) {
  throw 'BACKUP_BLOCKED: PostgreSQL 17 pg_dump/pg_restore not found.'
}
$versionText = (& $pgDump --version) -join ' '
if ($LASTEXITCODE -ne 0 -or $versionText -notmatch 'PostgreSQL\) (\d+)') {
  throw 'BACKUP_BLOCKED: cannot identify pg_dump major version.'
}
if ([int]$Matches[1] -lt 17) { throw 'BACKUP_BLOCKED: pg_dump must be PostgreSQL 17 or newer.' }

Write-Host 'PortalGenius Production: read-only pg_dump backup.'
Write-Host 'Enter host and user ONLY from Supabase Dashboard > Connect.'
$hostName = (Read-Host 'Database hostname').Trim().ToLowerInvariant()
$dbUser = (Read-Host 'Database username').Trim()
$directHost = 'db.' + $projectRef + '.supabase.co'
if ($hostName -eq $directHost) {
  if ($dbUser -ne 'postgres') { throw 'BACKUP_BLOCKED: direct-host user mismatch.' }
} elseif ($hostName -match '^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.pooler\.supabase\.com$') {
  if ($dbUser -ne ('postgres.' + $projectRef)) {
    throw 'BACKUP_BLOCKED: session-pooler user does not match PortalGenius.'
  }
} else {
  throw 'BACKUP_BLOCKED: database hostname is not a Supabase direct host or pooler.'
}
$secure = Read-Host 'Supabase database password (hidden; do not share)' -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  $secure.Dispose()
}
$env:PGSSLMODE = 'require'
$timestamp = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ')
$fileName = 'portalgenius-' + $timestamp + '-' + [guid]::NewGuid().ToString('N').Substring(0,8) + '.dump'
$archive = Join-Path $destinationPath $fileName
$complete = $false
try {
  # Custom pg_dump includes data and table definitions from selected schemas.
  # The managed auth schema is deliberately included: Supabase CLI dumps
  # exclude it by default. This is an archive, not a tested restore plan.
  & $pgDump --host=$hostName --port=5432 --username=$dbUser --dbname=postgres `
    --no-password --format=custom --no-owner --no-privileges `
    --schema=public --schema=private --schema=auth --schema=supabase_migrations `
    --file=$archive
  if ($LASTEXITCODE -ne 0) { throw 'BACKUP_FAILED: pg_dump did not complete.' }
  if (-not (Test-Path -LiteralPath $archive -PathType Leaf)) {
    throw 'BACKUP_FAILED: no archive was created.'
  }
  $item = Get-Item -LiteralPath $archive
  if ($item.Length -le 0) { throw 'BACKUP_FAILED: empty archive.' }
  $catalog = (& $pgRestore --list $archive) -join "`n"
  if ($LASTEXITCODE -ne 0) { throw 'BACKUP_FAILED: pg_restore cannot list archive.' }
  foreach ($required in @('TABLE DATA auth users', 'TABLE DATA public accounts',
      'TABLE DATA private login_identities')) {
    if (-not $catalog.Contains($required)) {
      throw 'BACKUP_INCOMPLETE: an expected Auth/account table was not found.'
    }
  }
  $digest = Get-FileHash -LiteralPath $archive -Algorithm SHA256
  $complete = $true
  Write-Host 'BACKUP_ARCHIVE_CREATED: all required table entries present.'
  Write-Host ('BACKUP_ARCHIVE_FILE: ' + $fileName)
  Write-Host ('BACKUP_ARCHIVE_BYTES: ' + $item.Length)
  Write-Host ('BACKUP_ARCHIVE_SHA256: ' + $digest.Hash)
  Write-Host 'BACKUP_RESTORE_NOT_VERIFIED: rehearse on a disposable database before release.'
  Write-Host 'BACKUP_EXTERNAL_COPY_REQUIRED: keep an encrypted off-device copy.'
} finally {
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:PGSSLMODE -ErrorAction SilentlyContinue
  if (-not $complete -and (Test-Path -LiteralPath $archive -PathType Leaf)) {
    # Only the newly generated, incomplete local archive may be removed.
    Remove-Item -LiteralPath $archive -Force
  }
}
