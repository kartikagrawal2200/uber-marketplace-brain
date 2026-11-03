@echo off
title Uber Marketplace Brain - Launcher
chcp 65001 >nul

pushd "%~dp0"
set "APP_DIR=%CD%"

echo ======================================================================
echo   UBER MARKETPLACE BRAIN - ONE-CLICK LAUNCHER
echo ======================================================================
echo.

REM --- 1. Ensure .env exists ---
if not exist "%APP_DIR%\.env" (
    echo [Setup] Creating .env from .env.example...
    copy "%APP_DIR%\.env.example" "%APP_DIR%\.env" >nul
    echo [Setup] .env file created with team Gemini keys.
)

REM --- 2. Check Local Model Ollama ---
echo [1/5] Checking Local Model Ollama...
where ollama >nul 2>nul
if %errorlevel% equ 0 (
    echo   - Ollama detected. Starting local model server...
    start "Ollama - Local LLM" cmd /k "ollama serve"
) else (
    echo   - Local model Ollama is not installed or not configured.
    echo   - Seamlessly using Google Gemini API with 4 rotated keys.
)

REM --- 3. Detect Python and Start Backend ---
echo [2/5] Starting Backend API port 8000...
set "PY_CMD="
where python >nul 2>nul && set "PY_CMD=python"
if "%PY_CMD%"=="" where py >nul 2>nul && set "PY_CMD=py -3"
if "%PY_CMD%"=="" if exist "C:\msys64\ucrt64\bin\python.exe" set "PY_CMD=C:\msys64\ucrt64\bin\python.exe"

if "%PY_CMD%"=="" (
    echo   [Notice] Python not found in PATH.
    echo   Frontends will run in standalone simulation mode with full AI logic.
) else (
    echo   - Using Python: %PY_CMD%
    start "Backend - FastAPI :8000" /D "%APP_DIR%\backend" cmd /k "%PY_CMD% -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
)

REM --- 4. Start Rider App port 5173 ---
echo [3/5] Starting Rider App port 5173...
start "Rider App :5173" /D "%APP_DIR%\frontend\rider-app" cmd /k "npm run dev"

REM --- 5. Start Driver App port 5174 ---
echo [4/5] Starting Driver App port 5174...
start "Driver App :5174" /D "%APP_DIR%\frontend\driver-app" cmd /k "npm run dev"

REM --- 6. Start Admin Dashboard port 5175 ---
echo [5/5] Starting Admin Dashboard port 5175...
start "Admin Dashboard :5175" /D "%APP_DIR%\frontend\admin-dashboard" cmd /k "npm run dev"

echo.
echo ======================================================================
echo   All services launched successfully!
echo ======================================================================
echo.
echo   Rider App        : http://localhost:5173
echo   Driver App       : http://localhost:5174
echo   Admin Dashboard  : http://localhost:5175
echo   Backend API      : http://localhost:8000
echo   API Swagger Docs : http://localhost:8000/docs
echo.
echo Waiting 3 seconds, then opening Admin Dashboard and Rider App in your browser...
timeout /t 3 /nobreak >nul
start http://localhost:5175
start http://localhost:5173

echo.
echo All services are running in their respective windows.
echo To stop any service, simply close its window.
pause
popd
