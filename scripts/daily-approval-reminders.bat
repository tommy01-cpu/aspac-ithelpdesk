@echo off
REM Daily Approval Reminders - IT Helpdesk
REM This script should be scheduled to run daily at 8:00 AM using Windows Task Scheduler

echo Starting Daily Approval Reminders - %date% %time%

REM Check if curl is available
where curl >nul 2>nul
if errorlevel 1 (
    echo ERROR: curl is not available. Using PowerShell instead.
    powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3001/api/scheduled-tasks/approval-reminders' -Method POST -Headers @{'Content-Type'='application/json'} -Body '{}' -ErrorAction Stop; Write-Output 'SUCCESS: Approval reminders sent'; Write-Output $response.Content } catch { Write-Output 'ERROR: Failed to send approval reminders'; Write-Output $_.Exception.Message }"
) else (
    echo Using curl to send approval reminders...
    curl -X POST ^
         -H "Content-Type: application/json" ^
         -d "{}" ^
         http://localhost:3001/api/scheduled-tasks/approval-reminders
)

echo.
echo Approval reminders process completed - %date% %time%
echo.

REM Log the execution
echo %date% %time% - Daily approval reminders executed >> "%~dp0logs\approval-reminders.log"
