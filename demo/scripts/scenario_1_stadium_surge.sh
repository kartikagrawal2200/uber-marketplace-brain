#!/usr/bin/env bash
# demo/scripts/scenario_1_stadium_surge.sh
# Scripted demo: Stadium Surge
#
# Narrative:
#   - 50,000 fans leaving Stadium District (Zone 7)
#   - AI system predicts spike 12 min before it hits
#   - Drivers in Zones 5 & 9 receive GO recommendations
#   - Expected result: +11 pp over baseline
#
# Usage:
#   bash demo/scripts/scenario_1_stadium_surge.sh
#
# TODO: replace curl stubs with real API calls once backend is running

API="http://localhost:8000"

echo "🏟️  Scenario 1: Stadium Surge"
echo "================================"
echo "Triggering stadium event at Zone 7..."

curl -s -X POST "$API/api/admin/scenario/stadium_surge" | python3 -m json.tool

echo ""
echo "Watch the admin dashboard for:"
echo "  - Zone 7 demand spike (orange/red)"
echo "  - Driver recommendations to move toward Zone 7"
echo "  - Fulfilment rate rising vs baseline"
echo ""
echo "TODO: add timing annotations and expected metric values here"
