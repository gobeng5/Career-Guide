@echo off
title CareerCraft AI
cd /d "%~dp0"
echo ============================================================
echo   Starting CareerCraft AI Server...
echo   Local Address: http://localhost:5000
echo ============================================================
echo.
echo Launching browser in 2 seconds...
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:5000"
node server/server.js
pause

