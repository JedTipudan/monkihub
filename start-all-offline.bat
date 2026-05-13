@echo off
echo ========================================
echo Starting MonkiHub (Offline Mode)
echo ========================================
echo.

REM Check if Kafka is running
docker ps | findstr monkihub-kafka >nul 2>&1
if %errorlevel% neq 0 (
    echo Starting Kafka container...
    docker start monkihub-kafka >nul 2>&1
    if %errorlevel% neq 0 (
        echo ERROR: Kafka container not found!
        echo Please run: setup-kafka-docker.bat first
        pause
        exit /b 1
    )
    echo ✓ Kafka started
    echo Waiting 10 seconds for Kafka to be ready...
    timeout /t 10 /nobreak >nul
) else (
    echo ✓ Kafka is already running
)

echo.
echo ========================================
echo Starting Backend and Consumer
echo ========================================
echo.
echo This will open 2 new windows:
echo   1. Backend Server (port 3000)
echo   2. Kafka Consumer (message processor)
echo.
echo Keep both windows open!
echo.
pause

REM Start backend in new window
start "MonkiHub Backend" cmd /k "cd backend && npm start"

REM Wait a bit for backend to start
timeout /t 5 /nobreak >nul

REM Start consumer in new window
start "MonkiHub Consumer" cmd /k "cd backend && node scripts/consumer.js"

echo.
echo ========================================
echo ✓ MonkiHub is starting!
echo ========================================
echo.
echo Two windows have been opened:
echo   1. Backend Server - Keep this running
echo   2. Kafka Consumer - Keep this running
echo.
echo Open your browser:
echo   http://localhost:3000
echo.
echo To stop everything:
echo   1. Close both terminal windows
echo   2. Run: docker stop monkihub-kafka
echo.
echo Enjoy MonkiHub offline! 🚀
echo.
pause
