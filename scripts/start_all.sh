#!/usr/bin/env bash
# One command to run everything.  All data is SYNTHETIC.   Usage: bash scripts/start_all.sh
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
[ -f .env ] || cp .env.example .env
PY=$(command -v python3 || command -v python)
echo "[1/3] Backend packages..."; $PY -m pip install -q -r backend/requirements.txt
echo "[2/3] Frontend packages..."
for a in rider-app driver-app admin-dashboard; do
  [ -d "frontend/$a/node_modules" ] || (cd "frontend/$a" && npm install --no-audit --no-fund)
done
echo "[3/3] Starting..."
PIDS=()
trap 'echo; echo Stopping...; kill "${PIDS[@]}" 2>/dev/null' EXIT INT TERM
(cd backend && $PY -m uvicorn app.main:app --host 0.0.0.0 --port 8000) & PIDS+=($!)
for a in rider-app driver-app admin-dashboard; do (cd "frontend/$a" && npm run dev) & PIDS+=($!); done
echo "Rider http://localhost:5173 | Driver http://localhost:5174 | Admin http://localhost:5175 | API http://localhost:8000/docs"
wait
