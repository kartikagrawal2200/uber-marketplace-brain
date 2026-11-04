@echo off
title Uber Marketplace Brain - Launcher (SYNTHETIC DATA)
pushd "%~dp0"
set "APP_DIR=%CD%"
echo ======================================================================
echo   UBER MARKETPLACE BRAIN - ONE-CLICK LAUNCHER   (all data is SYNTHETIC)
echo ======================================================================

if not exist "%APP_DIR%\.env" copy "%APP_DIR%\.env.example" "%APP_DIR%\.env" >nul

set "PY_CMD="
if exist "%LOCALAPPDATA%\Programs\Python\Python313\python.exe" set "PY_CMD=%LOCALAPPDATA%\Programs\Python\Python313\python.exe"
if "%PY_CMD%"=="" if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" set "PY_CMD=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
if "%PY_CMD%"=="" if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" set "PY_CMD=%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
if "%PY_CMD%"=="" if exist "%LOCALAPPDATA%\Programs\Python\Python310\python.exe" set "PY_CMD=%LOCALAPPDATA%\Programs\Python\Python310\python.exe"
if "%PY_CMD%"=="" for /d %%D in ("%LOCALAPPDATA%\Programs\Python\Python3*") do if exist "%%D\python.exe" set "PY_CMD=%%D\python.exe"
if "%PY_CMD%"=="" for /d %%D in ("C:\Program Files\Python3*") do if exist "%%D\python.exe" set "PY_CMD=%%D\python.exe"
if "%PY_CMD%"=="" for /d %%D in ("C:\Python3*") do if exist "%%D\python.exe" set "PY_CMD=%%D\python.exe"
if "%PY_CMD%"=="" python --version >nul 2>nul && set "PY_CMD=python"
if "%PY_CMD%"=="" py -3 --version >nul 2>nul && set "PY_CMD=py -3"
if "%PY_CMD%"=="" (
  echo [ERROR] Python 3.10+ was not found. Install it from python.org and tick "Add to PATH".
  pause & exit /b 1
)
where npm >nul 2>nul || ( echo [ERROR] Node.js was not found. Install Node 18+ from nodejs.org. & pause & exit /b 1 )

echo [1/3] Installing backend packages (first run only)...
%PY_CMD% -m pip install -q -r "%APP_DIR%\backend\requirements.txt"

echo [2/3] Installing frontend packages (first run only)...
for %%A in (rider-app driver-app admin-dashboard) do (
  if not exist "%APP_DIR%\frontend\%%A\node_modules" ( pushd "%APP_DIR%\frontend\%%A" & call npm install --no-audit --no-fund & popd )
)

echo [3/3] Starting everything...
start "Backend :8000" /D "%APP_DIR%\backend" cmd /k "%PY_CMD% -m uvicorn app.main:app --host 0.0.0.0 --port 8000"
start "Rider :5173"  /D "%APP_DIR%\frontend\rider-app"       cmd /k "npm run dev"
start "Driver :5174" /D "%APP_DIR%\frontend\driver-app"      cmd /k "npm run dev"
start "Admin :5175"  /D "%APP_DIR%\frontend\admin-dashboard" cmd /k "npm run dev"

echo.
echo   Rider  http://localhost:5173
echo   Driver http://localhost:5174
echo   Admin  http://localhost:5175
echo   API    http://localhost:8000/docs
ping 127.0.0.1 -n 6 >nul
start http://localhost:5173
start http://localhost:5175
popd
