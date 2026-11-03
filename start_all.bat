@echo off
title Uber Marketplace Brain - Launcher
chcp 65001 >nul
cd /d "%~dp0"

echo ======================================================================
echo   🧠 UBER MARKETPLACE BRAIN - ONE-CLICK LAUNCHER
echo ======================================================================
echo.

REM --- 1. Ensure .env exists ---
if not exist ".env" (
    echo [Setup] Creating .env from .env.example...
    copy ".env.example" ".env" >nul
    echo [Setup] .env file created.
)

REM --- 2. Check Local Model (Ollama) ---
echo [1/5] Checking Local Model (Ollama)...
where ollama >nul 2>nul
if %errorlevel% equ 0 (
    echo   - Ollama detected. Starting local model server...
    start "Ollama - Local LLM" cmd /k "ollama serve"
) else (
    echo   - Local model (Ollama) is not installed / not configured.
    echo   - Seamlessly using Google Gemini API with 4 rotated keys.
)

REM --- 3. Detect Python and Start Backend ---
echo [2/5] Starting Backend API (port 8000)...
set "PY_CMD="
where python >nul 2>nul && set "PY_CMD=python"
if "%PY_CMD%"=="" where py >nul 2>nul && set "PY_CMD=py -3"
if "%PY_CMD%"=="" if exist "C:\msys64\ucrt64\bin\python.exe" set "PY_CMD=C:\msys64\ucrt64\bin\python.exe"

if "%PY_CMD%"=="" (
    echo   [Warning] Python not found in PATH.
    echo   Please install Python 3.11+ to run the FastAPI backend.
    echo   Frontends will run in standalone simulation mode.
) else (
    echo   - Using Python: %PY_CMD%
    start "Backend - FastAPI :8000" cmd /k "cd /d ""%~dp0backend"" & %PY_CMD% -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
)

REM --- 4. Start Rider App (port 5173) ---
echo [3/5] Starting Rider App (port 5173)...
if not exist "%~dp0frontend\rider-app\node_modules" (
    echo   - Installing rider-app packages...
    cd /d "%~dp0frontend\rider-app" && call npm install && cd /d "%~dp0"
)
start "Rider App :5173" cmd /k "cd /d ""%~dp0frontend\rider-app"" & echo Running Rider App on :5173... & npm run dev"

REM --- 5. Start Driver App (port 5174) ---
echo [4/5] Starting Driver App (port 5174)...
if not exist "%~dp0frontend\driver-app\node_modules" (
    echo   - Installing driver-app packages...
    cd /d "%~dp0frontend\driver-app" && call npm install && cd /d "%~dp0"
)
start "Driver App :5174" cmd /k "cd /d ""%~dp0frontend\driver-app"" & echo Running Driver App on :5174... & npm run dev"

REM --- 6. Start Admin Dashboard (port 5175) ---
echo [5/5] Starting Admin Dashboard (port 5175)...
if not exist "%~dp0frontend\admin-dashboard\node_modules" (
    echo   - Installing admin-dashboard packages...
    cd /d "%~dp0frontend\admin-dashboard" && call npm install && cd /d "%~dp0"
)
start "Admin Dashboard :5175" cmd /k "cd /d ""%~dp0frontend\admin-dashboard"" & echo Running Admin Dashboard on :5175... & npm run dev"

echo.
echo ======================================================================
echo   ✅ All services launched successfully!
echo ======================================================================
echo.
echo   📱 Rider App        : http://localhost:5173
echo   🚗 Driver App       : http://localhost:5174
echo   🧠 Admin Dashboard  : http://localhost:5175
echo   🔌 Backend API      : http://localhost:8000
echo   📖 API Swagger Docs : http://localhost:8000/docs
echo.
echo Opening Admin Dashboard and Rider App in your browser...
timeout /t 3 /nobreak >nul
start http://localhost:5175
start http://localhost:5173

echo.
echo All services are running in their respective windows.
echo To stop any service, simply close its window.
pause
