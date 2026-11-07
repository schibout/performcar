$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
foreach ($name in @('frontend', 'worker', 'backend')) {
    $stateFile = Join-Path $root ".local/$name.json"
    if (Test-Path $stateFile) {
        $state = Get-Content $stateFile -Raw | ConvertFrom-Json
        $process = Get-Process -Id $state.pid -ErrorAction SilentlyContinue
        if ($process -and $process.StartTime.ToUniversalTime().Ticks.ToString() -eq $state.started) {
            & taskkill.exe /PID $process.Id /T /F | Out-Null
            Write-Host "$name stopped."
        }
    }
}
& docker compose -p template-local --env-file "$root/backend/.env" -f "$root/backend/docker-compose.yaml" stop db redis
if ($LASTEXITCODE -ne 0) { throw 'Could not stop PostgreSQL/Redis.' }
Write-Host 'Application stopped. Database volumes are preserved.'
