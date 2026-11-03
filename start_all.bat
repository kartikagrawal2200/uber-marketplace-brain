@echo off
title Uber Marketplace Brain - Launcher
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================================
echo   🧠 UBER MARKETPLACE BRAIN - ONE-CLICK LAUNCHER
echo ========================================================
echo.

REM 1. Ensure .env exists
if not exist ".env" (
    echo [Setup] Creating .env from .env.example...
    copy ".env.example" ".env" >nul
    echo [Setup] Created .env file.
)

REM 2. Launch Local LLM (Ollama)
echo [1/5] Launching Local Model (Ollama)...
start "Ollama - Local LLM" cmd /k "echo Starting Ollama... & ollama serve"

REM 3. Launch FastAPI Backend
echo [2/5] Launching FastAPI Backend on port 8000...
start "Backend - FastAPI :8000" cmd /k "cd /d ""%~dp0backend"" & echo Starting Backend API... & uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

REM 4. Launch Rider App (5173)
echo [3/5] Launching Rider App on port 5173...
start "Rider App :5173" cmd /k "cd /d ""%~dp0frontend\rider-app"" & echo Starting Rider App... & npm run dev"

REM 5. Launch Driver App (5174)
echo [4/5] Launching Driver App on port 5174...
start "Driver App :5174" cmd /k "cd /d ""%~dp0frontend\driver-app"" & echo Starting Driver App... & npm run dev"

REM 6. Launch Admin Dashboard (5175)
echo [5/5] Launching Admin Dashboard on port 5175...
start "Admin Dashboard :5175" cmd /k "cd /d ""%~dp0frontend\admin-dashboard"" & echo Starting Admin Dashboard... & npm run dev"

echo.
echo ========================================================
echo   ✅ All 5 services launched in separate windows!
echo ========================================================
echo.
echo   📱 Rider App        : http://localhost:5173
echo   🚗 Driver App       : http://localhost:5174
echo   🧠 Admin Dashboard  : http://localhost:5175
echo   🔌 Backend API      : http://localhost:8000
echo   📖 Swagger Docs     : http://localhost:8000/docs
echo.
echo Opening Admin Dashboard in your browser in 3 seconds...
timeout /t 3 /nobreak >nul
start http://localhost:5175

echo.
echo You can close this window at any time. 
echo To stop services, close their individual command windows.
pause
