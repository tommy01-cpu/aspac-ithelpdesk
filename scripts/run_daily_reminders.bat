@echo off
REM Daily Approval Reminders - Windows Batch Script
REM This script runs the Python daily approval reminders

echo ========================================
echo Daily Approval Reminders
echo ========================================
echo.

REM Change to the script directory
cd /d "%~dp0"

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.6+ and try again
    pause
    exit /b 1
)

REM Check if requests library is installed
python -c "import requests" >nul 2>&1
if errorlevel 1 (
    echo Installing required Python packages...
    python -m pip install -r requirements.txt
    if errorlevel 1 (
        echo ERROR: Failed to install required packages
        pause
        exit /b 1
    )
)

REM Run the Python script
echo Running daily approval reminders...
python daily_approval_reminders.py

REM Show exit code
if errorlevel 1 (
    echo.
    echo ERROR: Script failed with exit code %errorlevel%
) else (
    echo.
    echo SUCCESS: Script completed successfully
)

REM Pause only if running interactively (not from Task Scheduler)
if "%1"=="--no-pause" goto :eof
pause
