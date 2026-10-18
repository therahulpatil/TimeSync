@echo off
title WorkTrack - Office Attendance System
echo =======================================================
echo          WorkTrack - Office Attendance System
echo =======================================================
echo.

where docker >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [INFO] Docker detected on your system.
    echo [INFO] Starting containerized attendance system with Docker Compose...
    docker compose up -d --build
    echo.
    echo =======================================================
    echo  Application is running in Docker at:
    echo  http://localhost:3000
    echo =======================================================
    start http://localhost:3000
    pause
    exit /b
)

echo [INFO] Docker not found in PATH. Starting locally with Node.js...
echo [INFO] Building frontend bundle...
call npm run build

echo [INFO] Launching server on http://localhost:3000 ...
start http://localhost:3000
npm start
