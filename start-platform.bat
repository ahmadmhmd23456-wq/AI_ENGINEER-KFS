@echo off
title Engineering Academy - Live Instant Sync & Cloudflare Tunnel
cd /d "%~dp0"
echo ===============================================================
echo     ENGINEERING ACADEMY - DR. MOHAMED (KAFR EL-SHEIKH)
echo       Starting Instant Live Sync Server & Cloudflare Tunnel...
echo       [CONNECTED DIRECTLY TO NEON CLOUD POSTGRESQL]
echo ===============================================================
echo.

REM 1. Start Next.js on port 3001
start /B "" node node_modules\next\dist\bin\next dev -p 3001

timeout /t 5 /nobreak >nul

REM 2. Start Cloudflare Tunnel
echo.
echo [INFO] Connecting Cloudflare Tunnel to the live web...
cloudflared.exe tunnel --url http://localhost:3001

pause
