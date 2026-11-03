#!/usr/bin/env bash
# demo/scripts/scenario_2_rain_burst.sh
# Scripted demo: Sudden Rain Across 3 Zones
#
# Narrative:
#   - Heavy rain starts across Zones 1, 4, 6
#   - Demand λ multiplied by 1.6 (heavy rain factor)
#   - Weather-aware positioning kicks in
#
# TODO: implement after weather integration is complete

API="http://localhost:8000"

echo "🌧️  Scenario 2: Rain Burst"
echo "==========================="
curl -s -X POST "$API/api/admin/scenario/rain_burst" | python3 -m json.tool
echo ""
echo "TODO: add expected outcomes and metric annotations"
