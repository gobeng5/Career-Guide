@echo off
title Career Guide
cd /d "%~dp0"
echo ============================================================
echo   Starting Career Guide Server...
echo   Local Address: http://localhost:5000
echo ============================================================
echo.
echo Launching browser in 2 seconds...
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:5000"
node server/server.js
pause

