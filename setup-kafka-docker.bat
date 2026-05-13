@echo off
echo ========================================
echo MonkiHub - Local Kafka Setup (Docker)
echo ========================================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not installed!
    echo.
    echo Please install Docker Desktop from:
    echo https://www.docker.com/products/docker-desktop/
    echo.
    pause
    exit /b 1
)

echo [1/5] Checking Docker...
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running!
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)
echo ✓ Docker is running

echo.
echo [2/5] Stopping any existing Kafka container...
docker stop monkihub-kafka >nul 2>&1
docker rm monkihub-kafka >nul 2>&1
echo ✓ Cleaned up old containers

echo.
echo [3/5] Pulling Kafka image (this may take a few minutes)...
docker pull apache/kafka:latest
if %errorlevel% neq 0 (
    echo ERROR: Failed to pull Kafka image
    pause
    exit /b 1
)
echo ✓ Kafka image downloaded

echo.
echo [4/5] Starting Kafka container...
docker run -d ^
  --name monkihub-kafka ^
  -p 9092:9092 ^
  -e KAFKA_NODE_ID=1 ^
  -e KAFKA_PROCESS_ROLES=broker,controller ^
  -e KAFKA_LISTENERS=PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093 ^
  -e KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092 ^
  -e KAFKA_CONTROLLER_LISTENER_NAMES=CONTROLLER ^
  -e KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT ^
  -e KAFKA_CONTROLLER_QUORUM_VOTERS=1@localhost:9093 ^
  -e KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1 ^
  -e KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR=1 ^
  -e KAFKA_TRANSACTION_STATE_LOG_MIN_ISR=1 ^
  -e KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS=0 ^
  -e KAFKA_NUM_PARTITIONS=1 ^
  apache/kafka:latest

if %errorlevel% neq 0 (
    echo ERROR: Failed to start Kafka container
    pause
    exit /b 1
)
echo ✓ Kafka container started

echo.
echo [5/5] Waiting for Kafka to be ready (30 seconds)...
timeout /t 30 /nobreak >nul
echo ✓ Kafka should be ready

echo.
echo ========================================
echo ✓ SUCCESS! Kafka is running locally
echo ========================================
echo.
echo Kafka is now running on: localhost:9092
echo Container name: monkihub-kafka
echo.
echo Next steps:
echo   1. Run: configure-local-kafka.bat
echo   2. Run: test-kafka.bat
echo   3. Start your backend: cd backend ^&^& npm start
echo   4. Start consumer: cd backend ^&^& node scripts/consumer.js
echo.
echo Useful commands:
echo   docker ps                    - Check if running
echo   docker logs monkihub-kafka   - View logs
echo   docker stop monkihub-kafka   - Stop Kafka
echo   docker start monkihub-kafka  - Start Kafka
echo.
pause
