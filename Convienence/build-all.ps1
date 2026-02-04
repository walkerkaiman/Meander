# Cross-compilation script for Windows and Raspberry Pi
# Builds both State Server and Deployable for multiple platforms

$ErrorActionPreference = "Stop"

$rootDir = Split-Path -Parent $PSScriptRoot
$stateServerDir = Join-Path $rootDir "State Server"
$deployableDir = Join-Path $rootDir "Deployable"
$outputDir = Join-Path $rootDir "build"

Write-Host "Building for multiple platforms..." -ForegroundColor Cyan
Write-Host ""

# Create output directory
if (Test-Path $outputDir) {
    Remove-Item -Recurse -Force $outputDir
}
New-Item -ItemType Directory -Path $outputDir | Out-Null

# Function to build for a specific platform
function Build-Platform {
    param(
        [string]$GOOS,
        [string]$GOARCH,
        [string]$PlatformName,
        [string]$Extension = ""
    )
    
    Write-Host "Building for $PlatformName ($GOOS/$GOARCH)..." -ForegroundColor Yellow
    
    $env:GOOS = $GOOS
    $env:GOARCH = $GOARCH
    
    # Build State Server
    Push-Location $stateServerDir
    $stateServerOutput = Join-Path $outputDir "state-server-$PlatformName$Extension"
    go build -o $stateServerOutput ./cmd/state-server
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to build State Server for $PlatformName" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Pop-Location
    
    # Build Deployable
    Push-Location $deployableDir
    $deployableOutput = Join-Path $outputDir "deployable-$PlatformName$Extension"
    go build -o $deployableOutput ./cmd/deployable
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to build Deployable for $PlatformName" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Pop-Location
    
    Write-Host "  ✓ State Server: $stateServerOutput" -ForegroundColor Green
    Write-Host "  ✓ Deployable: $deployableOutput" -ForegroundColor Green
    Write-Host ""
}

# Build for Windows (amd64)
Build-Platform -GOOS "windows" -GOARCH "amd64" -PlatformName "windows-amd64" -Extension ".exe"

# Build for Raspberry Pi (ARMv7 - 32-bit, most common)
Build-Platform -GOOS "linux" -GOARCH "arm" -PlatformName "rpi-armv7"

# Build for Raspberry Pi (ARM64 - 64-bit, newer models)
Build-Platform -GOOS "linux" -GOARCH "arm64" -PlatformName "rpi-arm64"

# Clean up environment variables
Remove-Item Env:\GOOS
Remove-Item Env:\GOARCH

Write-Host "Build complete! All binaries are in: $outputDir" -ForegroundColor Cyan
Write-Host ""
Write-Host "Built binaries:" -ForegroundColor Cyan
Get-ChildItem $outputDir | ForEach-Object {
    $size = [math]::Round($_.Length / 1MB, 2)
    Write-Host "  $($_.Name) ($size MB)" -ForegroundColor Gray
}
