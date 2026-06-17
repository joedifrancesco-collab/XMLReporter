@echo off
title InfoPath XML Reporter (Dev)

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed.
    echo Download it from https://nodejs.org
    pause
    exit /b 1
)

if not exist "%~dp0node_modules\" (
    echo Installing dependencies (first run only)...
    cd /d "%~dp0"
    npm install --silent
)

:: Uncomment to set your XML library path:
:: set XML_LIBRARY_PATH=\\server\shared\InfoPathXmlLibrary

start "" /b cmd /c "timeout /t 4 >nul && start http://localhost:3000"

echo.
echo =========================================
echo  InfoPath XML Reporter (Dev Mode)
echo  Open: http://localhost:3000
echo  Press Ctrl+C to stop.
echo =========================================
echo.
cd /d "%~dp0"
npm run dev
