#!/bin/bash
cd "$HOME/mafia"
fuser -k 3000/tcp 2>/dev/null || true
NODE_ENV=production nohup npm start > server.log 2>&1 &
sleep 2
xdg-open "http://localhost:3000/?role=god&key=secret123"
