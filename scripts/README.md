# Daily Approval Reminders Setup Guide

This directory contains scripts to automatically send daily email reminders to approvers who have pending approvals in the IT Helpdesk system.

## Files

- `daily_approval_reminders.py` - Main Python script
- `requirements.txt` - Python dependencies
- `run_daily_reminders.bat` - Windows batch file for easy execution
- `README.md` - This documentation

## Prerequisites

1. **Python 3.6+** must be installed on your system
2. **Internet connection** to reach the IT Helpdesk API
3. **IT Helpdesk system** must be running on http://192.168.1.85:3000

## Setup Instructions

### Method 1: Using the Batch File (Recommended for Windows)

1. Open the `scripts` directory
2. Double-click `run_daily_reminders.bat`
3. The script will automatically install dependencies and run the reminders

### Method 2: Manual Python Setup

1. Open Command Prompt or PowerShell
2. Navigate to the scripts directory:
   ```cmd
   cd C:\wamp\www\ithelpdesk\Project\scripts
   ```
3. Install dependencies:
   ```cmd
   pip install -r requirements.txt
   ```
4. Run the script:
   ```cmd
   python daily_approval_reminders.py
   ```

## Scheduling Daily Execution

### Windows Task Scheduler

1. **Open Task Scheduler**
   - Press `Win + R`, type `taskschd.msc`, press Enter

2. **Create Basic Task**
   - Click "Create Basic Task" in the right panel
   - Name: "IT Helpdesk Daily Approval Reminders"
   - Description: "Sends daily email reminders for pending approvals"

3. **Set Trigger**
   - Trigger: Daily
   - Start: Choose a date
   - Recur every: 1 days
   - Time: 08:00:00 (8:00 AM)

4. **Set Action**
   - Action: Start a program
   - Program/script: `C:\wamp\www\ithelpdesk\Project\scripts\run_daily_reminders.bat`
   - Add arguments: `--no-pause`
   - Start in: `C:\wamp\www\ithelpdesk\Project\scripts`

5. **Additional Settings**
   - Check "Run whether user is logged on or not"
   - Check "Run with highest privileges"
   - Configure for: Windows 10/11

### Linux/Mac Cron Job

Add this line to your crontab (`crontab -e`):
```bash
0 8 * * * /usr/bin/python3 /path/to/ithelpdesk/Project/scripts/daily_approval_reminders.py
```

## Configuration

The script is configured to call the API at:
- **Base URL**: `http://192.168.1.85:3000`
- **Endpoint**: `/api/scheduled-tasks/approval-reminders`

To change the API URL, edit the `API_BASE_URL` variable in `daily_approval_reminders.py`.

## Logging

The script creates a log file `daily_approval_reminders.log` in the same directory with detailed information about each execution, including:
- Timestamp of execution
- Number of pending approvals found
- Number of reminders sent
- Success/failure status for each approver
- Any errors encountered

## Testing

To test the script manually:

1. **Check if there are pending approvals** in the system
2. **Run the script** using one of the methods above
3. **Check the log file** for results
4. **Verify emails** were sent to approvers

## Troubleshooting

### Common Issues

**"Python is not installed"**
- Install Python from https://python.org
- Make sure to check "Add Python to PATH" during installation

**"Failed to connect to API"**
- Verify the IT Helpdesk system is running
- Check the API URL in the script configuration
- Ensure network connectivity

**"No pending approvals found"**
- This is normal if all approvals have been processed
- Check the IT Helpdesk system for pending requests

**"Permission denied" errors**
- Run as Administrator (Windows)
- Check file permissions (Linux/Mac)

### Debug Mode

To enable more detailed logging, edit the script and change:
```python
logging.basicConfig(level=logging.DEBUG, ...)
```

## Support

If you encounter issues:

1. Check the log file for detailed error messages
2. Verify the IT Helpdesk system is accessible
3. Test the API endpoint manually using a web browser or curl
4. Contact your system administrator

## API Endpoint Details

The script calls `POST /api/scheduled-tasks/approval-reminders` which:
- Finds all pending approvals for requests still in "for_approval" status
- Groups approvals by approver to avoid duplicate emails
- Sends personalized reminder emails using database templates
- Returns statistics about reminders sent

Example API response:
```json
{
  "success": true,
  "message": "Daily approval reminders sent",
  "remindersSent": 3,
  "totalApprovers": 3,
  "totalPendingApprovals": 5,
  "results": [
    {
      "approverId": 1,
      "approverEmail": "user@example.com",
      "approverName": "John Doe",
      "pendingCount": 2,
      "status": "sent"
    }
  ]
}
```
