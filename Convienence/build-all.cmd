@echo off
REM Cross-compilation script for Windows and Raspberry Pi
REM Builds both State Server and Deployable for multiple platforms

setlocal enabledelayedexpansion

set "ROOT_DIR=%~dp0.."
set "STATE_SERVER_DIR=%ROOT_DIR%\State Server"
set "DEPLOYABLE_DIR=%ROOT_DIR%\Deployable"
set "OUTPUT_DIR=%ROOT_DIR%\build"

echo Building for multiple platforms...
echo.

REM Create output directory
if exist "%OUTPUT_DIR%" rmdir /s /q "%OUTPUT_DIR%"
mkdir "%OUTPUT_DIR%"

REM Build for Windows (amd64)
echo Building for Windows (amd64)...
set GOOS=windows
set GOARCH=amd64
cd /d "%STATE_SERVER_DIR%"
go build -o "%OUTPUT_DIR%\state-server-windows-amd64.exe" .\cmd\state-server
if errorlevel 1 (
    echo Failed to build State Server for Windows
    exit /b 1
)
cd /d "%DEPLOYABLE_DIR%"
go build -o "%OUTPUT_DIR%\deployable-windows-amd64.exe" .\cmd\deployable
if errorlevel 1 (
    echo Failed to build Deployable for Windows
    exit /b 1
)
echo   [OK] State Server: state-server-windows-amd64.exe
echo   [OK] Deployable: deployable-windows-amd64.exe
echo.

REM Build for Raspberry Pi (ARMv7 - 32-bit, most common)
echo Building for Raspberry Pi ARMv7 (32-bit)...
set GOOS=linux
set GOARCH=arm
cd /d "%STATE_SERVER_DIR%"
go build -o "%OUTPUT_DIR%\state-server-rpi-armv7" .\cmd\state-server
if errorlevel 1 (
    echo Failed to build State Server for RPi ARMv7
    exit /b 1
)
cd /d "%DEPLOYABLE_DIR%"
go build -o "%OUTPUT_DIR%\deployable-rpi-armv7" .\cmd\deployable
if errorlevel 1 (
    echo Failed to build Deployable for RPi ARMv7
    exit /b 1
)
echo   [OK] State Server: state-server-rpi-armv7
echo   [OK] Deployable: deployable-rpi-armv7
echo.

REM Build for Raspberry Pi (ARM64 - 64-bit, newer models)
echo Building for Raspberry Pi ARM64 (64-bit)...
set GOOS=linux
set GOARCH=arm64
cd /d "%STATE_SERVER_DIR%"
go build -o "%OUTPUT_DIR%\state-server-rpi-arm64" .\cmd\state-server
if errorlevel 1 (
    echo Failed to build State Server for RPi ARM64
    exit /b 1
)
cd /d "%DEPLOYABLE_DIR%"
go build -o "%OUTPUT_DIR%\deployable-rpi-arm64" .\cmd\deployable
if errorlevel 1 (
    echo Failed to build Deployable for RPi ARM64
    exit /b 1
)
echo   [OK] State Server: state-server-rpi-arm64
echo   [OK] Deployable: deployable-rpi-arm64
echo.

REM Clean up environment variables
set GOOS=
set GOARCH=

echo Build complete! All binaries are in: %OUTPUT_DIR%
echo.
echo Built binaries:
dir /b "%OUTPUT_DIR%"
