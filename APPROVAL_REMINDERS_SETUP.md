# Daily Approval Reminders Setup Guide

## Overview
The IT Helpdesk system now includes automatic daily email reminders for pending approvals. This feature sends reminders to approvers who have pending requests requiring action.

## Features
- ✅ **Daily reminders at 8 AM** - Configurable time
- ✅ **Template-based emails** - Uses database email template (ID: 13)
- ✅ **Grouped by approver** - Avoids multiple emails to same person
- ✅ **Detailed request lists** - Shows all pending requests for each approver
- ✅ **Smart filtering** - Only sends for requests still in "for_approval" status
- ✅ **Fallback support** - Uses hardcoded template if database template fails

## API Endpoint
```
POST http://192.168.1.85:3000/api/scheduled-tasks/approval-reminders
```

## Setup Methods

### Method 1: Windows Task Scheduler (Recommended)

1. **Open Task Scheduler**
   - Press `Win + R`, type `taskschd.msc`, press Enter

2. **Create Basic Task**
   - Click "Create Basic Task..." in the right panel
   - Name: `IT Helpdesk Daily Approval Reminders`
   - Description: `Sends daily email reminders to approvers with pending requests`

3. **Set Trigger**
   - When: `Daily`
   - Start date: Today
   - Start time: `08:00:00` (8:00 AM)
   - Recur every: `1 days`

4. **Set Action**
   - Action: `Start a program`
   - Program/script: `powershell.exe`
   - Arguments: 
   ```powershell
   -Command "try { $response = Invoke-WebRequest -Uri 'http://192.168.1.85:3000/api/scheduled-tasks/approval-reminders' -Method POST -Headers @{'Content-Type'='application/json'} -TimeoutSec 30; Write-Host 'Success:' $response.Content } catch { Write-Host 'Error:' $_.Exception.Message; exit 1 }"
   ```

5. **Configure Advanced Settings**
   - Check "Run whether user is logged on or not"
   - Check "Run with highest privileges"
   - Configure for: Windows 10/Windows Server 2016

### Method 2: PowerShell Script with Task Scheduler

1. **Create PowerShell Script**
   Create `c:\scripts\approval-reminders.ps1`:
   ```powershell
   # IT Helpdesk Daily Approval Reminders
   $logFile = "c:\logs\approval-reminders.log"
   $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
   
   try {
       Write-Host "[$timestamp] Starting approval reminders process..."
       
       $response = Invoke-WebRequest -Uri "http://192.168.1.85:3000/api/scheduled-tasks/approval-reminders" -Method POST -Headers @{"Content-Type"="application/json"} -TimeoutSec 30
       
       $result = $response.Content | ConvertFrom-Json
       
       if ($result.success) {
           $message = "[$timestamp] SUCCESS: Sent $($result.remindersSent) reminders to $($result.totalApprovers) approvers"
           Write-Host $message
           Add-Content -Path $logFile -Value $message
       } else {
           $message = "[$timestamp] ERROR: $($result.error)"
           Write-Host $message
           Add-Content -Path $logFile -Value $message
           exit 1
       }
   } catch {
       $message = "[$timestamp] FAILED: $($_.Exception.Message)"
       Write-Host $message
       Add-Content -Path $logFile -Value $message
       exit 1
   }
   ```

2. **Schedule the Script**
   - Program/script: `powershell.exe`
   - Arguments: `-ExecutionPolicy Bypass -File "c:\scripts\approval-reminders.ps1"`

### Method 3: Manual Testing

You can manually trigger the reminder system anytime using PowerShell:

```powershell
Invoke-WebRequest -Uri "http://192.168.1.85:3000/api/scheduled-tasks/approval-reminders" -Method POST -Headers @{"Content-Type"="application/json"}
```

## Expected Response

**Success Response:**
```json
{
  "success": true,
  "message": "Daily approval reminders sent",
  "remindersSent": 2,
  "totalApprovers": 2,
  "totalPendingApprovals": 2,
  "results": [
    {
      "approverId": 1,
      "approverEmail": "tom.mandapat@aspacphils.com.ph",
      "approverName": "Jose Tommy Mandapat",
      "pendingCount": 1,
      "status": "sent"
    },
    {
      "approverId": 2,
      "approverEmail": "tommy02mandapat@gmail.com",
      "approverName": "Jhon Sanchez",
      "pendingCount": 1,
      "status": "sent"
    }
  ]
}
```

**No Approvals Response:**
```json
{
  "success": true,
  "message": "No pending approvals found",
  "remindersSent": 0
}
```

## Email Template

The system uses database template ID 13 with the following variables:
- `${Approver_Name}` - Full name of the approver
- `${Pending_Requests_Count}` - Number of pending requests
- `${Pending_Requests_List}` - Formatted list of pending requests
- `${Approval_Link}` - Direct link to approvals page

## Troubleshooting

### Common Issues:

1. **"No pending approvals found" but approvals exist**
   - Check that approvals have status `pending_approval`
   - Verify requests have status `for_approval`

2. **Task fails to run**
   - Ensure IT Helpdesk application is running
   - Check network connectivity to localhost:3000
   - Verify PowerShell execution policy allows scripts

3. **Emails not being sent**
   - Check SMTP configuration in environment variables
   - Verify email template ID 13 exists in database
   - Check server logs for email sending errors

### Testing:
```bash
# Test the endpoint manually
node test-approval-reminders.js

# Check current pending approvals
node check-approval-statuses.js
```

## Security Considerations

- The endpoint has no authentication by design (internal scheduled task)
- Ensure the server is not exposed to external networks
- Consider adding IP whitelist if needed
- Monitor logs for unusual activity

## Maintenance

- Review logs regularly for failed reminder attempts
- Update email templates as needed
- Adjust timing if 8 AM doesn't work for your organization
- Monitor email delivery rates

---

*This system ensures approvers never miss pending requests and helps maintain efficient approval workflows.*
