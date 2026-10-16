# M-002C2 local-only Supabase Auth provider compatibility QA.
# Never uses supabase link, db push/reset, hosted credentials, or production data.
param([switch]$SessionE2E)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$cliVersion = '2.120.0'
$tag = [guid]::NewGuid().ToString('N').Substring(0, 10)
$projectId = "pg-auth-qa-$tag"
$workspace = Join-Path ([IO.Path]::GetTempPath()) "PortalGenius-Auth-QA-$tag"
$expectedApi = 'http://127.0.0.1:55321'
$initialized = $false
$created = $false
$safeToRemoveWorkspace = $true

function Assert-Command($name) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        throw "LOCAL_QA_PREREQUISITE_MISSING: $name"
    }
}
function Invoke-LocalCli([string[]]$arguments, [switch]$CaptureOutput) {
    # Windows PowerShell 5.1 converts native stderr into an ErrorRecord even
    # with 2>$null. A harmless CLI update notice must not terminate the script.
    # Suppress local credentials and notices, but ALWAYS check the exit code.
    $ErrorActionPreference = 'Continue'
    if ($CaptureOutput) {
        $lines = @(& npx.cmd --yes "supabase@$cliVersion" @arguments 2>$null)
    } else {
        & npx.cmd --yes "supabase@$cliVersion" @arguments 1>$null 2>$null
    }
    $cliExitCode = $LASTEXITCODE
    if ($cliExitCode -ne 0) {
        throw "LOCAL_QA_SUPABASE_COMMAND_FAILED: $($arguments[0]) (exit $cliExitCode)"
    }
    if ($CaptureOutput) { return $lines }
}
function Set-LocalPort([string]$text, [int]$oldPort, [int]$newPort) {
    $pattern = "(?m)^(\s*port\s*=\s*)$oldPort(?=\s*(?:#.*)?$)"
    if (-not [regex]::IsMatch($text, $pattern)) {
        throw "LOCAL_QA_CONFIG_PORT_MISSING: $oldPort"
    }
    return [regex]::Replace($text, $pattern, ('${1}' + $newPort))
}

try {
    Assert-Command 'node'
    Assert-Command 'npx.cmd'
    Assert-Command 'docker'
    $nodeMajor = & node -p "Number(process.versions.node.split('.')[0])"
    if ($LASTEXITCODE -ne 0 -or [int]$nodeMajor -lt 22) {
        throw 'LOCAL_QA_REQUIRES_NODE_22_OR_NEWER'
    }
    if (-not (Test-Path (Join-Path $repositoryRoot 'node_modules\@supabase\supabase-js'))) {
        throw 'LOCAL_QA_RUN_NPM_CI_FIRST'
    }
    # Windows PowerShell 5.1 can convert native stderr into a terminating
    # error when ErrorActionPreference=Stop. Handle it as a preflight failure.
    $dockerOS = $null
    try {
        $dockerOS = & docker info --format '{{.OSType}}' 2>$null
        if ($LASTEXITCODE -ne 0) { $dockerOS = $null }
    } catch {
        $dockerOS = $null
    }
    if (-not $dockerOS) {
        throw 'LOCAL_QA_DOCKER_DESKTOP_NOT_RUNNING: Buka Docker Desktop, tunggu Engine running, gunakan Linux containers, lalu jalankan ulang.'
    }
    if ([string]$dockerOS -ne 'linux') {
        throw 'LOCAL_QA_LINUX_CONTAINERS_REQUIRED: Alihkan Docker Desktop ke Linux containers.'
    }
    # Never inherit hosted Supabase credentials into the local CLI/probe.
    @('SUPABASE_ACCESS_TOKEN','SUPABASE_URL','SUPABASE_SECRET_KEY',
      'SUPABASE_PROJECT_ID','SUPABASE_DB_PASSWORD','SUPABASE_DB_URL',
      'PG_QA_LOCAL_URL','PG_QA_LOCAL_ANON_KEY','PG_QA_LOCAL_SERVICE_KEY') |
        ForEach-Object { Remove-Item "Env:$_" -ErrorAction SilentlyContinue }

    # Another local project may already use the reserved QA ports. Do not stop it.
    foreach ($port in @(55320,55321,55322,55323,55324,55325,55327)) {
        $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $port)
        try {
            $listener.Start()
        } catch {
            throw "LOCAL_QA_PORT_IN_USE: $port (jangan menghentikan proyek Docker lain)"
        } finally {
            $listener.Stop()
        }
    }
    New-Item -ItemType Directory -Path $workspace -ErrorAction Stop | Out-Null
    $created = $true
    Push-Location $workspace
    try {
        Write-Host 'LOCAL_AUTH_QA_START: isolated Docker stack, no hosted project access'
        Write-Host 'First run may download Supabase Docker images and take several minutes.'
        Invoke-LocalCli @('init','--yes')
        $configPath = Join-Path $workspace 'supabase\config.toml'
        if (-not (Test-Path $configPath)) { throw 'LOCAL_QA_CONFIG_NOT_GENERATED' }
        $config = [IO.File]::ReadAllText($configPath)
        if (-not [regex]::IsMatch($config, '(?m)^project_id\s*=\s*"[^"]+"')) {
            throw 'LOCAL_QA_PROJECT_ID_NOT_FOUND'
        }
        $config = [regex]::Replace($config, '(?m)^project_id\s*=\s*"[^"]+"',
            ('project_id = "' + $projectId + '"'))
        foreach ($pair in @(@(54321,55321),@(54322,55322),
            @(54320,55320),@(54323,55323),@(54324,55324),@(54327,55327))) {
            # Optional service ports can be absent in newer Supabase CLI config.
            if ([regex]::IsMatch($config, "(?m)^(\s*port\s*=\s*)$($pair[0])(?=\s*(?:#.*)?$)")) {
                $config = Set-LocalPort $config $pair[0] $pair[1]
            } elseif ($pair[0] -eq 54321 -or $pair[0] -eq 54322) {
                throw "LOCAL_QA_REQUIRED_PORT_NOT_FOUND: $($pair[0])"
            }
        }
        # Disable anonymous sign-up on the temporary local provider only.
        $authPattern = '(?ms)^\[auth\][^\r\n]*\r?\n.*?(?=^\[|\z)'
        $authMatch = [regex]::Match($config, $authPattern)
        if (-not $authMatch.Success) { throw 'LOCAL_QA_AUTH_SECTION_MISSING' }
        $authBody = $authMatch.Value
        $signupPattern = '(?m)^(?<start>\s*enable_signup\s*=\s*)(?:true|false)(?<end>\s*(?:#.*)?)$'
        if (-not [regex]::IsMatch($authBody, $signupPattern)) {
            throw 'LOCAL_QA_ENABLE_SIGNUP_CONFIG_MISSING'
        }
        $authBody = [regex]::Replace($authBody, $signupPattern, '${start}false${end}')
        $config = $config.Substring(0, $authMatch.Index) + $authBody +
            $config.Substring($authMatch.Index + $authMatch.Length)
        [IO.File]::WriteAllText($configPath, $config, [Text.UTF8Encoding]::new($false))
        Write-Host 'LOCAL_QA_AUTH_SIGNUP_DISABLED: isolated Docker project only'
        if ($SessionE2E) {
            # Copy ONLY session foundation and synthetic-only helper SQL to the
            # newly created CLI project. Never run migrations against hosted DB.
            $migrationDir = Join-Path $workspace 'supabase\migrations'
            New-Item -ItemType Directory -Path $migrationDir -Force | Out-Null
            Copy-Item -LiteralPath (Join-Path $repositoryRoot 'supabase\migrations\20261015052905_portalgenius_m001_identity_session_foundation.sql') -Destination (Join-Path $migrationDir '20261016090000_local_session_foundation.sql')
            Copy-Item -LiteralPath (Join-Path $repositoryRoot 'scripts\qa\localSessionFixtures.sql') -Destination (Join-Path $migrationDir '20261016090001_local_session_fixtures.sql')
            Write-Host 'LOCAL_BFF_QA_SCHEMA_READY: isolated migrations only'
        }

        $initialized = $true # Also clean up containers after partially failed startup.
        Invoke-LocalCli @('start','--exclude',
          'studio,realtime,storage-api,imgproxy,postgres-meta,edge-runtime,logflare,vector,supavisor')
        $lines = @(Invoke-LocalCli -arguments @('status','-o','env') -CaptureOutput)
        $values = @{}
        foreach ($line in @($lines)) {
            if ($line -match '^([A-Z_]+)=(.*)$') {
                $values[$matches[1]] = $matches[2].Trim().Trim('"').Trim("'")
            }
        }
        if ($values['API_URL'] -ne $expectedApi) {
            throw 'LOCAL_QA_ENDPOINT_MISMATCH'
        }
        if (-not $values['ANON_KEY'] -or -not $values['SERVICE_ROLE_KEY']) {
            throw 'LOCAL_QA_STATUS_KEYS_MISSING'
        }
        $env:PG_QA_LOCAL_URL = $values['API_URL']
        $env:PG_QA_LOCAL_ANON_KEY = $values['ANON_KEY']
        $env:PG_QA_LOCAL_SERVICE_KEY = $values['SERVICE_ROLE_KEY']
        Write-Host 'LOCAL_AUTH_QA_PROVIDER_READY: localhost only'
        & node --experimental-strip-types (Join-Path $repositoryRoot 'scripts\qa\localAuthProbe.mjs')
        if ($LASTEXITCODE -ne 0) { throw 'LOCAL_AUTH_QA_BLOCKED: see the PASS/BLOCKED checks above' }
        if ($SessionE2E) {
            Write-Host 'LOCAL_BFF_QA_START: real HTTP handlers, synthetic Auth and DB only'
            & node --experimental-strip-types (Join-Path $repositoryRoot 'scripts\qa\localSessionE2E.mjs')
            if ($LASTEXITCODE -ne 0) { throw 'LOCAL_BFF_QA_BLOCKED: see the local-only error label above' }
        }
    } finally {
        foreach ($name in @('PG_QA_LOCAL_URL','PG_QA_LOCAL_ANON_KEY','PG_QA_LOCAL_SERVICE_KEY')) {
            Remove-Item "Env:$name" -ErrorAction SilentlyContinue
        }
        if ($initialized) {
            Write-Host 'LOCAL_AUTH_QA_STOP: stopping only our isolated project'
            try {
                Invoke-LocalCli -arguments @('stop','--no-backup')
            } catch {
                $safeToRemoveWorkspace = $false
                Write-Warning "LOCAL_QA_STOP_FAILED: isolated project $projectId needs manual cleanup at $workspace"
            }
        }
        Pop-Location
    }
} finally {
    if ($created -and $safeToRemoveWorkspace -and (Test-Path $workspace) -and -not (Test-Path (Join-Path $workspace 'keep-qa-workspace'))) {
        # Delete only the uniquely generated empty-purpose workspace.
        # Local container data are already cleared by stop --no-backup above.
        Remove-Item -LiteralPath $workspace -Recurse -Force -ErrorAction SilentlyContinue
    }
}

