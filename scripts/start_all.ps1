# scripts/start_all.ps1
# Windows PowerShell launch script for uber-marketplace-brain stack:
#   1. Local LLM (Ollama)
#   2. FastAPI backend (port 8000)
#   3. rider-app       (port 5173)
#   4. driver-app      (port 5174)
#   5. admin-dashboard (port 5175)

$ErrorActionPreference = "Continue"
$rootDir = (Get-Item $PSScriptRoot).Parent.FullName
$logDir = Join-Path $rootDir "logs"
if (!(Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  🧠 Uber Marketplace Brain — Starting Stack" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

# 1. Local LLM (Ollama)
Write-Host "`n[1/5] Checking Ollama..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "ollama serve" -WindowStyle Minimized

# 2. FastAPI Backend
Write-Host "[2/5] Starting FastAPI backend (port 8000)..." -ForegroundColor Yellow
$backendDir = Join-Path $rootDir "backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendDir'; uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

# 3. Rider App
Write-Host "[3/5] Starting Rider App (port 5173)..." -ForegroundColor Yellow
$riderDir = Join-Path $rootDir "frontend\rider-app"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$riderDir'; npm run dev"

# 4. Driver App
Write-Host "[4/5] Starting Driver App (port 5174)..." -ForegroundColor Yellow
$driverDir = Join-Path $rootDir "frontend\driver-app"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$driverDir'; npm run dev"

# 5. Admin Dashboard
Write-Host "[5/5] Starting Admin Dashboard (port 5175)..." -ForegroundColor Yellow
$adminDir = Join-Path $rootDir "frontend\admin-dashboard"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$adminDir'; npm run dev"

Write-Host "`n==============================================" -ForegroundColor Green
Write-Host "  ✅ All services launched in separate windows!" -ForegroundColor Green
Write-Host "  Rider App       : http://localhost:5173" -ForegroundColor White
Write-Host "  Driver App      : http://localhost:5174" -ForegroundColor White
Write-Host "  Admin Dashboard : http://localhost:5175" -ForegroundColor White
Write-Host "  Backend API     : http://localhost:8000" -ForegroundColor White
Write-Host "  API Docs        : http://localhost:8000/docs" -ForegroundColor White
Write-Host "==============================================" -ForegroundColor Green
