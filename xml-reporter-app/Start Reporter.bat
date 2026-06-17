@echo off
title InfoPath XML Reporter

:: Check for Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed on this machine.
    echo Please download and install it from https://nodejs.org
    echo.
    pause
    exit /b 1
)

:: Install dependencies if node_modules is missing
if not exist "%~dp0node_modules\" (
    echo First-time setup: installing dependencies...
    echo This will take a minute. Please wait.
    echo.
    cd /d "%~dp0"
    npm install --silent
    if %errorlevel% neq 0 (
        echo ERROR: Dependency install failed.
        pause
        exit /b 1
    )
)

:: Build if .next is missing (production mode)
if not exist "%~dp0.next\" (
    echo Building app for the first time...
    cd /d "%~dp0"
    npm run build --silent
    if %errorlevel% neq 0 (
        echo ERROR: Build failed.
        pause
        exit /b 1
    )
)

:: Set library path if configured
:: Uncomment and edit the line below to point to your XML folder:
:: set XML_LIBRARY_PATH=\\server\shared\InfoPathXmlLibrary

:: Open browser after a short delay
start "" /b cmd /c "timeout /t 3 >nul && start http://localhost:3000"

:: Start the server
echo.
echo =========================================
echo  InfoPath XML Reporter is starting...
echo  Open: http://localhost:3000
echo  Press Ctrl+C to stop the server.
echo =========================================
echo.
cd /d "%~dp0"
npm start
