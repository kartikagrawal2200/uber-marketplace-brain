#!/usr/bin/env bash
# scripts/start_all.sh
# Launches the entire uber-marketplace-brain stack:
#   1. Local LLM (Ollama)
#   2. FastAPI backend
#   3. rider-app   (port 5173)
#   4. driver-app  (port 5174)
#   5. admin-dashboard (port 5175)
#
# Usage:
#   bash scripts/start_all.sh
#
# Prerequisites:
#   - Python 3.11+ with venv activated (or pip packages installed globally)
#   - Node.js 20+ and npm/pnpm installed
#   - .env file configured (see .env.example)
#   - Ollama installed and model pulled: ollama pull llama3.2
#
# TODO:
#   - Add health checks after each service starts
#   - Add --no-llm flag to skip Ollama for Gemini-only mode
#   - Redirect logs to logs/ directory
#   - Add cleanup trap (kill all child processes on Ctrl+C)

set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$ROOT_DIR/logs"
mkdir -p "$LOG_DIR"

echo "=============================================="
echo "  🧠 Uber Marketplace Brain — Starting Stack"
echo "=============================================="

# --- Trap: kill all background processes on exit ---
PIDS=()
cleanup() {
  echo ""
  echo "Shutting down all services..."
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  echo "Done."
}
trap cleanup EXIT INT TERM

# --- 1. Local LLM ---
echo ""
echo "[1/5] Starting local LLM (Ollama)..."
bash "$ROOT_DIR/scripts/start_local_model.sh" &
PIDS+=($!)
sleep 3   # Give Ollama time to start

# --- 2. Backend ---
echo ""
echo "[2/5] Starting FastAPI backend (port 8000)..."
cd "$ROOT_DIR/backend"
# TODO: activate venv if exists: source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload \
  > "$LOG_DIR/backend.log" 2>&1 &
PIDS+=($!)
sleep 2

# --- 3. Rider App ---
echo ""
echo "[3/5] Starting rider-app (port 5173)..."
cd "$ROOT_DIR/frontend/rider-app"
npm run dev > "$LOG_DIR/rider-app.log" 2>&1 &
PIDS+=($!)

# --- 4. Driver App ---
echo ""
echo "[4/5] Starting driver-app (port 5174)..."
cd "$ROOT_DIR/frontend/driver-app"
npm run dev > "$LOG_DIR/driver-app.log" 2>&1 &
PIDS+=($!)

# --- 5. Admin Dashboard ---
echo ""
echo "[5/5] Starting admin-dashboard (port 5175)..."
cd "$ROOT_DIR/frontend/admin-dashboard"
npm run dev > "$LOG_DIR/admin-dashboard.log" 2>&1 &
PIDS+=($!)

echo ""
echo "=============================================="
echo "  ✅ All services started!"
echo ""
echo "  Rider App       : http://localhost:5173"
echo "  Driver App      : http://localhost:5174"
echo "  Admin Dashboard : http://localhost:5175"
echo "  Backend API     : http://localhost:8000"
echo "  API Docs        : http://localhost:8000/docs"
echo "  Logs            : $LOG_DIR/"
echo ""
echo "  Press Ctrl+C to stop all services."
echo "=============================================="

# Wait for any background process to exit
wait
