$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$runtime = Join-Path $root '.local'
New-Item -ItemType Directory -Force -Path $runtime | Out-Null

& docker compose -p template-local --env-file "$root/backend/.env" -f "$root/backend/docker-compose.yaml" up -d --wait db redis
if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL/Redis startup failed.' }
Push-Location "$root/backend"
try {
    & "$root/backend/.venv/Scripts/python.exe" -m alembic upgrade head
    if ($LASTEXITCODE -ne 0) { throw 'Database migrations failed.' }
} finally { Pop-Location }

function Start-AppService($Name, $Executable, $Arguments, $Directory, $Port) {
    $stateFile = Join-Path $runtime "$Name.json"
    if (Test-Path $stateFile) {
        $state = Get-Content $stateFile -Raw | ConvertFrom-Json
        $existing = Get-Process -Id $state.pid -ErrorAction SilentlyContinue
        if ($existing -and $existing.StartTime.ToUniversalTime().Ticks.ToString() -eq $state.started) {
            Write-Host "$Name is already running (PID $($existing.Id))."
            return
        }
    }
    if ($Port -and (Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)) {
        throw "Port $Port is already used by another process."
    }
    $process = Start-Process -FilePath $Executable -ArgumentList $Arguments -WorkingDirectory $Directory -WindowStyle Hidden -PassThru -RedirectStandardOutput "$runtime/$Name.out.log" -RedirectStandardError "$runtime/$Name.err.log"
    @{ pid = $process.Id; started = $process.StartTime.ToUniversalTime().Ticks.ToString() } | ConvertTo-Json | Set-Content $stateFile
    Write-Host "$Name started (PID $($process.Id))."
}

Start-AppService 'backend' "$root/backend/.venv/Scripts/python.exe" '-m uvicorn app.main:app --host 127.0.0.1 --port 8000' "$root/backend" 8000
Start-AppService 'worker' "$root/backend/.venv/Scripts/python.exe" ('"' + "$root/Run-LocalWorker.py" + '"') "$root/backend" 0
$nodePath = (Get-Command node.exe).Source
Start-AppService 'frontend' $nodePath ('"' + "$root/frontend/node_modules/next/dist/bin/next" + '" dev --hostname 127.0.0.1 --port 3000') "$root/frontend" 3000
foreach ($url in @('http://127.0.0.1:8000/api/v1/health/ready', 'http://127.0.0.1:3000/api/v1/settings/public')) {
    $ready = $false
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 3
            if ($response.StatusCode -eq 200) { $ready = $true; break }
        } catch { Start-Sleep -Seconds 1 }
    }
    if (-not $ready) { throw "Service not ready: $url. Check logs in $runtime." }
}
Write-Host 'Frontend: http://localhost:3000 | API: http://localhost:8000/docs'
Write-Host "Logs: $runtime"
