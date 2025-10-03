# Backup Technician Auto-Reversion Scheduler Setup

This document explains how to set up automated backup technician reversion using Windows Task Scheduler or external cron jobs.

## Overview

The backup technician system now includes automatic reversion of expired configurations:
- **Service**: `BackupTechnicianService` handles all auto-reversion logic
- **Endpoint**: `/api/scheduled-tasks/backup-technician-reversion` for external schedulers
- **Manual Trigger**: `/api/backup-technicians/auto-revert` for manual execution

## What Gets Auto-Reverted

When a backup technician configuration expires:
1. **Open/On-Hold Requests**: Automatically reverted to original technician
2. **Configuration Status**: Marked as inactive (`is_active: false`)  
3. **Backup Assignments**: Marked as reverted with timestamp
4. **Audit Logs**: Created for all actions
5. **Notifications**: Sent to both original and backup technicians
6. **Request History**: Updated with reversion details

## Windows Task Scheduler Setup

### Option 1: PowerShell Script

Create a PowerShell script `backup-technician-revert.ps1`:

```powershell
# Backup Technician Auto-Reversion Script
# This script should be scheduled to run daily at 6 AM

$ErrorActionPreference = "Stop"
$LogFile = "C:\logs\backup-technician-revert.log"

# Ensure log directory exists
$LogDir = Split-Path $LogFile -Parent
if (!(Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force
}

function Write-Log {
    param($Message)
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogEntry = "$Timestamp - $Message"
    Write-Output $LogEntry
    Add-Content -Path $LogFile -Value $LogEntry
}

try {
    Write-Log "Starting backup technician auto-reversion process..."
    
    # Replace with your actual server URL
    $ServerUrl = "https://your-helpdesk-domain.com"
    $EndpointUrl = "$ServerUrl/api/scheduled-tasks/backup-technician-reversion"
    
    # Make the POST request to trigger auto-reversion
    $Response = Invoke-RestMethod -Uri $EndpointUrl -Method POST -ContentType "application/json" -TimeoutSec 300
    
    if ($Response.success) {
        Write-Log "SUCCESS: $($Response.message)"
        Write-Log "Processed Configs: $($Response.data.processedConfigs)"
        Write-Log "Reverted Requests: $($Response.data.totalRevertedRequests)"
        Write-Log "Duration: $($Response.data.duration)"
        exit 0
    } else {
        Write-Log "FAILED: $($Response.error)"
        exit 1
    }
} catch {
    Write-Log "ERROR: $($_.Exception.Message)"
    Write-Log "Stack Trace: $($_.ScriptStackTrace)"
    exit 1
}
```

### Option 2: Batch Script with curl

Create a batch file `backup-technician-revert.bat`:

```batch
@echo off
setlocal

REM Backup Technician Auto-Reversion Batch Script
REM This script should be scheduled to run daily at 6 AM

set "LOG_FILE=C:\logs\backup-technician-revert.log"
set "SERVER_URL=https://your-helpdesk-domain.com"
set "ENDPOINT_URL=%SERVER_URL%/api/scheduled-tasks/backup-technician-reversion"

REM Create log directory if it doesn't exist
if not exist "C:\logs" mkdir "C:\logs"

echo [%date% %time%] Starting backup technician auto-reversion process... >> "%LOG_FILE%"

REM Make POST request using curl (requires curl to be installed)
curl -X POST "%ENDPOINT_URL%" ^
     -H "Content-Type: application/json" ^
     -w "HTTP Status: %%{http_code}\n" ^
     --connect-timeout 30 ^
     --max-time 300 >> "%LOG_FILE%" 2>&1

if %ERRORLEVEL% EQU 0 (
    echo [%date% %time%] Backup technician reversion completed successfully >> "%LOG_FILE%"
    exit /b 0
) else (
    echo [%date% %time%] Backup technician reversion failed with error level %ERRORLEVEL% >> "%LOG_FILE%"
    exit /b 1
)
```

### Task Scheduler Configuration

1. **Open Task Scheduler**: `taskschd.msc`
2. **Create Basic Task** with these settings:
   - **Name**: "Backup Technician Auto-Reversion"
   - **Description**: "Daily auto-reversion of expired backup technician configurations"
   - **Trigger**: Daily at 6:00 AM
   - **Action**: Start a program
   - **Program**: `powershell.exe` (for PowerShell) or `cmd.exe` (for batch)
   - **Arguments**: 
     - PowerShell: `-ExecutionPolicy Bypass -File "C:\path\to\backup-technician-revert.ps1"`
     - Batch: `/c "C:\path\to\backup-technician-revert.bat"`
   - **Start In**: Directory containing the script

3. **Advanced Settings**:
   - ✅ Run whether user is logged on or not
   - ✅ Run with highest privileges
   - ✅ Configure for Windows 10/Server 2019

## Linux/Unix Cron Job Setup

For Linux servers, add this to crontab:

```bash
# Daily backup technician auto-reversion at 6 AM
0 6 * * * /usr/bin/curl -X POST "https://your-helpdesk-domain.com/api/scheduled-tasks/backup-technician-reversion" \
  -H "Content-Type: application/json" \
  --connect-timeout 30 \
  --max-time 300 \
  >> /var/log/backup-technician-revert.log 2>&1
```

## Monitoring & Health Checks

### Health Check Endpoint

Use the GET endpoint to monitor system status:

```bash
curl "https://your-helpdesk-domain.com/api/scheduled-tasks/backup-technician-reversion"
```

Response includes:
- System status
- Upcoming expirations in next 7 days
- Urgent expirations in next 24 hours

### Log Monitoring

Monitor these log locations:
- **Windows**: `C:\logs\backup-technician-revert.log`
- **Linux**: `/var/log/backup-technician-revert.log`
- **Application**: Check server console logs for detailed processing information

## Manual Execution

For testing or emergency reversion:

### Via Dashboard
1. Go to **Dashboard → Backup Technician** tab
2. Use the manual reversion features in the interface

### Via API
```bash
# Manual trigger (requires authentication)
curl -X POST "https://your-helpdesk-domain.com/api/backup-technicians/auto-revert" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

## Troubleshooting

### Common Issues
1. **Network connectivity**: Ensure server is accessible from scheduler machine
2. **Authentication**: Scheduled endpoint doesn't require auth, manual endpoint does
3. **Timeouts**: Increase timeout values for large datasets
4. **Permissions**: Ensure script has write access to log directory

### Verification Steps
1. Check that expired configurations are marked as `is_active: false`
2. Verify requests are reverted in `request.formData.assignedTechnicianId`
3. Confirm notifications were created for affected technicians
4. Review `backup_technician_logs` table for audit trail

## Security Considerations

- The scheduled endpoint is public but only processes expired configurations
- Manual endpoint requires authentication for security
- Use HTTPS for all endpoint calls
- Restrict access to scheduler machine
- Monitor logs for unauthorized access attempts

## Integration with Backup Approver System

This system works alongside the existing backup approver auto-reversion:
- **Backup Approvers**: Handle approval workflows
- **Backup Technicians**: Handle request assignments
- Both use similar scheduling patterns and can be managed together