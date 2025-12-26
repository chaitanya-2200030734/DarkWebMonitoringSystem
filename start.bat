@echo off
REM Production startup script for ThreatDetector (Windows)

echo Starting ThreatDetector...

REM Check if dist folder exists
if not exist "dist" (
    echo Building frontend...
    call npm run build:prod
)

REM Set production environment
set NODE_ENV=production

REM Start server
echo Starting server on port %PORT%...
node server.js

