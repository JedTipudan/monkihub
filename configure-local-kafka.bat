@echo off
echo ========================================
echo Configure MonkiHub for Local Kafka
echo ========================================
echo.

if not exist "backend\.env" (
    echo ERROR: backend\.env file not found!
    echo Please make sure you're in the MonkiHub root directory.
    pause
    exit /b 1
)

echo Creating backup of .env file...
copy backend\.env backend\.env.backup >nul
echo ✓ Backup created: backend\.env.backup

echo.
echo Updating .env file for local Kafka...

REM Update KAFKA_BROKER
powershell -Command "(Get-Content backend\.env) -replace 'KAFKA_BROKER=.*', 'KAFKA_BROKER=localhost:9092' | Set-Content backend\.env"

REM Clear KAFKA_USERNAME
powershell -Command "(Get-Content backend\.env) -replace 'KAFKA_USERNAME=.*', 'KAFKA_USERNAME=' | Set-Content backend\.env"

REM Clear KAFKA_PASSWORD
powershell -Command "(Get-Content backend\.env) -replace 'KAFKA_PASSWORD=.*', 'KAFKA_PASSWORD=' | Set-Content backend\.env"

REM Ensure KAFKA_TOPIC is set
powershell -Command "(Get-Content backend\.env) -replace 'KAFKA_TOPIC=.*', 'KAFKA_TOPIC=monkihub_messages' | Set-Content backend\.env"

echo ✓ Configuration updated

echo.
echo ========================================
echo ✓ SUCCESS! Configuration updated
echo ========================================
echo.
echo Your backend\.env now uses:
echo   KAFKA_BROKER=localhost:9092
echo   KAFKA_USERNAME=(empty)
echo   KAFKA_PASSWORD=(empty)
echo   KAFKA_TOPIC=monkihub_messages
echo.
echo Original file backed up to: backend\.env.backup
echo.
echo Next step: Run test-kafka.bat to verify
echo.
pause
