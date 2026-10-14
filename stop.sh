#!/bin/bash
fuser -k 3000/tcp 2>/dev/null || true
pkill -f "tsx server.ts" 2>/dev/null || true
notify-send "بازی مافیا" "سرور بازی متوقف شد." 2>/dev/null || true
