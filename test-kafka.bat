@echo off
echo ========================================
echo Test Kafka Connection
echo ========================================
echo.

echo [1/3] Checking if Kafka container is running...
docker ps | findstr monkihub-kafka >nul 2>&1
if %errorlevel% neq 0 (
    echo ✗ Kafka container is not running!
    echo.
    echo Please run: setup-kafka-docker.bat
    echo Or start it: docker start monkihub-kafka
    pause
    exit /b 1
)
echo ✓ Kafka container is running

echo.
echo [2/3] Checking if port 9092 is listening...
netstat -an | findstr ":9092.*LISTENING" >nul 2>&1
if %errorlevel% neq 0 (
    echo ✗ Port 9092 is not listening!
    echo Kafka might still be starting up...
    echo Wait 30 seconds and try again.
    pause
    exit /b 1
)
echo ✓ Port 9092 is listening

echo.
echo [3/3] Testing Kafka connection from Node.js...
cd backend
node -e "const { Kafka } = require('kafkajs'); const kafka = new Kafka({ clientId: 'test', brokers: ['localhost:9092'] }); kafka.admin().listTopics().then(topics => { console.log('✓ Connected to Kafka!'); console.log('Topics:', topics.length > 0 ? topics : '(none yet)'); process.exit(0); }).catch(err => { console.error('✗ Connection failed:', err.message); process.exit(1); });"

if %errorlevel% neq 0 (
    echo.
    echo ✗ Failed to connect to Kafka from Node.js
    echo.
    echo Troubleshooting:
    echo   1. Make sure Kafka container is running: docker ps
    echo   2. Check Kafka logs: docker logs monkihub-kafka
    echo   3. Restart Kafka: docker restart monkihub-kafka
    echo   4. Wait 30 seconds after starting Kafka
    pause
    exit /b 1
)

cd ..

echo.
echo ========================================
echo ✓ SUCCESS! Kafka is working correctly
echo ========================================
echo.
echo Your Kafka setup is ready!
echo.
echo Next steps:
echo   1. Start backend: cd backend ^&^& npm start
echo   2. Start consumer: cd backend ^&^& node scripts/consumer.js
echo   3. Open browser: http://localhost:3000
echo   4. Test chat feature!
echo.
echo Or use the all-in-one script: start-all-offline.bat
echo.
pause
