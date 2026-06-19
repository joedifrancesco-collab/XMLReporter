@echo off
setlocal EnableDelayedExpansion

echo ============================================================
echo  PDF Generator
echo ============================================================
echo.

:: --- Prompt for source folder ---
set /p "SOURCE=Enter the path to the folder containing XML files: "
if "!SOURCE!"=="" (
    echo No path entered. Exiting.
    pause
    exit /b 1
)

:: Strip surrounding quotes if the user included them
set SOURCE=!SOURCE:"=!

if not exist "!SOURCE!" (
    echo Folder not found: !SOURCE!
    pause
    exit /b 1
)

:: --- Prompt for output folder (optional) ---
echo.
echo Where should PDFs be saved?
echo   Press ENTER to use: !SOURCE!\PDFs
set /p "OUTPUT=Output folder (or press ENTER for default): "
set OUTPUT=!OUTPUT:"=!

echo.
echo Starting conversion...
echo.

if "!OUTPUT!"=="" (
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Convert-InfoPathToPDF.ps1" -SourceFolder "!SOURCE!"
) else (
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Convert-InfoPathToPDF.ps1" -SourceFolder "!SOURCE!" -OutputFolder "!OUTPUT!"
)

echo.
if %ERRORLEVEL% EQU 0 (
    echo Conversion complete!
) else (
    echo Conversion finished with some errors. Check the output above.
)

pause
