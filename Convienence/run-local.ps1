param(
  [string]$StateServerAddr = ":8081",
  [string]$DeployableWebAddr = ":8090",
  [string]$PlaybackBackend = "vlc"
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$stateServerDir = Join-Path $repoRoot "State Server"
$deployableDir = Join-Path $repoRoot "Deployable"

Write-Host "Building State Server..."
Push-Location $stateServerDir
go build -o (Join-Path $stateServerDir "state-server.exe") .\cmd\state-server
if ($LASTEXITCODE -ne 0) { throw "State Server build failed." }
Pop-Location

Write-Host "Building Deployable..."
Push-Location $deployableDir
go build -o (Join-Path $deployableDir "deployable.exe") .\cmd\deployable
if ($LASTEXITCODE -ne 0) { throw "Deployable build failed." }
Pop-Location

$serverUrl = "ws://localhost$StateServerAddr/ws/deployable"

Write-Host "Starting State Server on $StateServerAddr..."
$env:STATE_SERVER_LISTEN = $StateServerAddr
$env:STATE_SERVER_ASSETS_DIR = (Join-Path $stateServerDir "Assets")
Start-Process -FilePath (Join-Path $stateServerDir "state-server.exe") `
  -WorkingDirectory $stateServerDir `
  -NoNewWindow:$false

$healthUrl = "http://localhost$StateServerAddr/health"
$ready = $false
for ($i = 0; $i -lt 10; $i++) {
  try {
    $resp = Invoke-WebRequest -UseBasicParsing -Uri $healthUrl -TimeoutSec 2
    if ($resp.StatusCode -eq 200) {
      $ready = $true
      break
    }
  } catch {
    Start-Sleep -Seconds 1
  }
}
if (-not $ready) {
  throw "State Server did not become ready at $healthUrl"
}

$env:DEPLOYABLE_DATA_DIR = (Join-Path $deployableDir "data")
$env:DEPLOYABLE_ASSETS_DIR = (Join-Path $deployableDir "Assets")
$env:DEPLOYABLE_ASSETS_SOURCE_URL = "http://localhost$StateServerAddr/assets"
$env:DEPLOYABLE_ASSETS_CLEANUP = "false"
Write-Host "Starting Deployable (web=$DeployableWebAddr, server=$serverUrl)..."
Start-Process -FilePath (Join-Path $deployableDir "deployable.exe") `
  -WorkingDirectory $deployableDir `
  -ArgumentList @(
    "--server", $serverUrl,
    "--web", $DeployableWebAddr,
    "--playback-backend", $PlaybackBackend
  ) `
  -NoNewWindow:$false

Write-Host "Done."
