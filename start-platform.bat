@echo off
title Engineering Academy - Live Instant Server & Cloudflare Tunnel
cd /d "%~dp0"
cls
echo =====================================================================
echo           ENGINEERING ACADEMY - DR. MOHAMED (KAFR EL-SHEIKH)
echo       Starting Instant Live Server & Secure Cloudflare Tunnel...
echo            [CONNECTED TO NEON CLOUD POSTGRESQL DATABASE]
echo =====================================================================
echo.

REM 1. Start Next.js on port 3001 with system CA support
echo [1/2] Starting Next.js platform server on port 3001...
start "Eng-Academy Next.js Server" /MIN node --use-system-ca node_modules\next\dist\bin\next dev -p 3001

echo [INFO] Waiting for server to initialize (7 seconds)...
timeout /t 7 /nobreak >nul

REM 2. Start Cloudflare Tunnel
echo.
echo [2/2] Connecting Secure Cloudflare Tunnel to the live internet...
echo [NOTE] Look below for "Your quick Tunnel has been created! Visit it at:"
echo        Copy the link shown below to open on phone or computer.
echo =====================================================================
echo.
cloudflared.exe tunnel --url http://localhost:3001 --no-autoupdate

pause
