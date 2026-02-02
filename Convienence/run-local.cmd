@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "REPO_ROOT=%SCRIPT_DIR%.."
set "STATE_SERVER_DIR=%REPO_ROOT%\State Server"
set "DEPLOYABLE_DIR=%REPO_ROOT%\Deployable"

set "STATE_SERVER_ADDR=:8081"
set "DEPLOYABLE_WEB_ADDR=:8090"
set "PLAYBACK_BACKEND=vlc"

echo Building State Server...
pushd "%STATE_SERVER_DIR%"
go build -o "%STATE_SERVER_DIR%\\state-server.exe" .\cmd\state-server
if errorlevel 1 (
  echo State Server build failed.
  exit /b 1
)
popd

echo Building Deployable...
pushd "%DEPLOYABLE_DIR%"
go build -o "%DEPLOYABLE_DIR%\\deployable.exe" .\cmd\deployable
if errorlevel 1 (
  echo Deployable build failed.
  exit /b 1
)
popd

set "SERVER_URL=ws://localhost%STATE_SERVER_ADDR%/ws/deployable"

echo Starting State Server on %STATE_SERVER_ADDR%...
set "STATE_SERVER_LISTEN=%STATE_SERVER_ADDR%"
set "STATE_SERVER_ASSETS_DIR=%REPO_ROOT%\\Assets"
start "State Server" "%STATE_SERVER_DIR%\\state-server.exe"

set "HEALTH_URL=http://localhost%STATE_SERVER_ADDR%/health"
set "READY=0"
for /l %%i in (1,1,10) do (
  powershell -Command "try { (Invoke-WebRequest -UseBasicParsing %HEALTH_URL%).StatusCode -eq 200 } catch { $false }" | findstr /i "True" >nul 2>&1 && set "READY=1" && goto :startDeployable
  timeout /t 1 >nul
)
if "%READY%"=="0" (
  echo State Server did not become ready at %HEALTH_URL%
  exit /b 1
)

:startDeployable
set "DEPLOYABLE_DATA_DIR=%DEPLOYABLE_DIR%\\data"
set "DEPLOYABLE_ASSETS_DIR=%DEPLOYABLE_DIR%\\Assets"
set "DEPLOYABLE_ASSETS_SOURCE_URL=http://localhost%STATE_SERVER_ADDR%/assets"
set "DEPLOYABLE_ASSETS_CLEANUP=false"
echo Starting Deployable (web=%DEPLOYABLE_WEB_ADDR%, server=%SERVER_URL%)...
start "Deployable" "%DEPLOYABLE_DIR%\\deployable.exe" --server "%SERVER_URL%" --web "%DEPLOYABLE_WEB_ADDR%" --playback-backend "%PLAYBACK_BACKEND%" --diagnostic-showlogic

echo Done.
endlocal
