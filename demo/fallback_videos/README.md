# Fallback Videos

Place pre-recorded demo videos here in case of WiFi/tech issues during the pitch.

## Required Videos

| Filename | Scenario | Duration |
|----------|----------|----------|
| `surge.mp4` | Stadium Surge — demand spike, driver recommendations | ~30s |
| `rain.mp4` | Rain Burst — weather multiplier, zone demand shift | ~20s |
| `stale_model.mp4` | LLM Staleness — Ollama dies, Gemini fallback activates | ~20s |

## Recording Instructions

TODO:
1. Start the full stack with `bash scripts/start_all.sh`
2. Open admin dashboard at http://localhost:5175
3. Use OBS or QuickTime to record the screen
4. Trigger each scenario using the dashboard buttons
5. Trim to the relevant 20–30 second segment
6. Export as MP4 H.264, 1080p
7. Place in this directory

## Playback

During the demo, if the live system is unavailable:
1. Open the relevant video file
2. Play it full-screen
3. Narrate over it using the pitch script
