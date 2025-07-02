@echo off
echo SVN Commit Tracker - Installation Verification Tool
echo ====================================================
echo.

REM Get the AppData location
set APPDATA_DIR=%APPDATA%\..\Local\svn-commit-tracker

echo Checking installation status...
echo.

if exist "%APPDATA_DIR%" (
    echo ✓ Application data directory exists at:
    echo   %APPDATA_DIR%
) else (
    echo ✗ Application data directory not found at:
    echo   %APPDATA_DIR%
    echo.
    echo This may be normal if you haven't run the application yet.
    echo The directory will be created on first launch.
)

echo.
if exist "%APPDATA_DIR%\tasks.json" (
    echo ✓ tasks.json file found
    echo   Location: %APPDATA_DIR%\tasks.json
    echo.
    echo File information:
    for %%F in ("%APPDATA_DIR%\tasks.json") do (
        echo   - Last modified: %%~tF
        echo   - Size: %%~zF bytes
    )
) else (
    echo ✗ tasks.json file not found
    echo.
    echo This is normal if you haven't run the application yet.
    echo The file will be created automatically when you first launch the application.
)

echo.
echo Note: If you encounter any issues with the tasks.json file:
echo 1. Try launching the application - it will create the file if missing
echo 2. If problems persist, run the application with the --reset-data flag:
echo    svn-commit-tracker.exe --reset-data
echo.
echo ====================================================

pause
