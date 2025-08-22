# IT Helpdesk Daily Approval Reminders Script
# This script calls the approval reminders API and logs the results

param(
    [string]$ApiUrl = "http://192.168.1.85:3000/api/scheduled-tasks/approval-reminders",
    [string]$LogPath = "C:\logs\ithelpdesk-approval-reminders.log"
)

# Ensure log directory exists
$logDir = Split-Path $LogPath -Parent
if (!(Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

# Function to write log with timestamp
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    Write-Host $logMessage
    Add-Content -Path $LogPath -Value $logMessage
}

try {
    Write-Log "Starting IT Helpdesk approval reminders process..."
    
    # Call the API endpoint
    $response = Invoke-WebRequest -Uri $ApiUrl -Method POST -Headers @{"Content-Type"="application/json"} -TimeoutSec 60
    
    # Parse the response
    $result = $response.Content | ConvertFrom-Json
    
    if ($result.success) {
        if ($result.remindersSent -gt 0) {
            Write-Log "SUCCESS: Sent $($result.remindersSent) reminders to $($result.totalApprovers) approvers for $($result.totalPendingApprovals) pending approvals"
            
            # Log details for each approver
            foreach ($approverResult in $result.results) {
                if ($approverResult.status -eq "sent") {
                    Write-Log "  ✓ Sent to $($approverResult.approverName) ($($approverResult.approverEmail)) - $($approverResult.pendingCount) pending request(s)"
                } else {
                    Write-Log "  ✗ Failed to send to $($approverResult.approverName) ($($approverResult.approverEmail))" "WARN"
                }
            }
        } else {
            Write-Log "SUCCESS: No pending approvals found - no reminders needed"
        }
        
        exit 0
    } else {
        Write-Log "API returned error: $($result.error)" "ERROR"
        exit 1
    }
    
} catch {
    $errorMessage = $_.Exception.Message
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode
        Write-Log "HTTP Error [$statusCode]: $errorMessage" "ERROR"
    } else {
        Write-Log "Connection Error: $errorMessage" "ERROR"
    }
    
    # Additional troubleshooting info
    Write-Log "Troubleshooting tips:" "INFO"
    Write-Log "  1. Ensure IT Helpdesk application is running on port 3000" "INFO"
    Write-Log "  2. Check if localhost:3000 is accessible" "INFO"
    Write-Log "  3. Verify no firewall is blocking the connection" "INFO"
    Write-Log "  4. Check IT Helpdesk server logs for errors" "INFO"
    
    exit 1
}

# Clean up old log entries (keep last 30 days)
try {
    $cutoffDate = (Get-Date).AddDays(-30)
    $logContent = Get-Content $LogPath | Where-Object {
        if ($_ -match "^\[(\d{4}-\d{2}-\d{2})") {
            $logDate = [DateTime]::ParseExact($matches[1], "yyyy-MM-dd", $null)
            return $logDate -ge $cutoffDate
        }
        return $true
    }
    $logContent | Set-Content $LogPath
} catch {
    # Ignore cleanup errors
}
