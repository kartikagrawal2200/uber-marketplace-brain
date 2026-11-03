#!/usr/bin/env bash
# scripts/start_local_model.sh
# Starts the local LLM server (Ollama) and pulls the model if not present.
#
# TODO:
#   - Check if Ollama is installed; print install instructions if not
#   - Check if model is already pulled before pulling
#   - Support alternative models (mistral, phi3, etc.) via MODEL env var
#   - Add GPU memory check before starting large models

MODEL="${OLLAMA_MODEL:-llama3.2}"

echo "[LLM] Starting Ollama with model: $MODEL"

# Check if ollama is installed
if ! command -v ollama &> /dev/null; then
  echo "ERROR: Ollama is not installed."
  echo "Install it from: https://ollama.com/download"
  echo ""
  echo "Falling back to Gemini API (set GEMINI_KEY_1 in .env)"
  exit 0   # Non-fatal — app will fall back to Gemini
fi

# Pull model if not present
echo "[LLM] Pulling model (skipped if already downloaded)..."
ollama pull "$MODEL"

# Start server (if not already running)
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
  echo "[LLM] Starting Ollama server..."
  ollama serve &
  sleep 5
else
  echo "[LLM] Ollama server already running."
fi

echo "[LLM] Local model ready at http://localhost:11434"
