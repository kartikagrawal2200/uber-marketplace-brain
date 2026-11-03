#!/usr/bin/env bash
# demo/scripts/scenario_3_stale_model.sh
# Scripted demo: LLM Staleness & Fallback
#
# Narrative:
#   - Simulate Ollama going offline mid-demo
#   - model_health.py detects staleness within 2 ticks
#   - Seamless switch to Gemini (health badge → amber)
#   - Show that system continues to function
#
# TODO: implement mock Ollama failure endpoint
#       (POST /api/admin/mock_llm_failure or kill Ollama process)

API="http://localhost:8000"

echo "⚠️  Scenario 3: Stale Model Fallback"
echo "======================================"
curl -s -X POST "$API/api/admin/scenario/stale_model" | python3 -m json.tool
echo ""
echo "Watch the admin dashboard health badge turn amber."
echo "TODO: implement stale model simulation in backend"
