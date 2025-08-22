#!/usr/bin/env python3
"""
Daily Approval Reminders Script (Windows Compatible)

This script sends daily email reminders to approvers who have pending approvals.
It calls the IT Helpdesk API endpoint to trigger the reminder process.

Usage:
    python daily_approval_reminders_simple.py
"""

import sys
import json
import logging
import requests
from datetime import datetime
from typing import Dict, Any

# Configuration
API_BASE_URL = "http://192.168.1.85:3000"
APPROVAL_REMINDERS_ENDPOINT = f"{API_BASE_URL}/api/scheduled-tasks/approval-reminders"
TIMEOUT_SECONDS = 30

# Setup logging without emojis for Windows compatibility
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('daily_approval_reminders.log', encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)


def send_approval_reminders() -> Dict[str, Any]:
    """Send daily approval reminders by calling the API endpoint."""
    try:
        logger.info("Starting daily approval reminders process...")
        logger.info(f"Calling API endpoint: {APPROVAL_REMINDERS_ENDPOINT}")
        
        # Make the API call
        response = requests.post(
            APPROVAL_REMINDERS_ENDPOINT,
            headers={'Content-Type': 'application/json'},
            timeout=TIMEOUT_SECONDS
        )
        
        # Check if the request was successful
        response.raise_for_status()
        
        # Parse the response
        result = response.json()
        
        # Log the results
        if result.get('success'):
            reminders_sent = result.get('remindersSent', 0)
            total_approvers = result.get('totalApprovers', 0)
            total_pending = result.get('totalPendingApprovals', 0)
            
            logger.info("SUCCESS: Daily approval reminders completed!")
            logger.info("Statistics:")
            logger.info(f"   - Total pending approvals: {total_pending}")
            logger.info(f"   - Unique approvers: {total_approvers}")
            logger.info(f"   - Reminders sent: {reminders_sent}")
            
            if reminders_sent == 0:
                logger.info("INFO: No pending approvals found - no reminders sent")
            else:
                logger.info(f"SUCCESS: Sent {reminders_sent} reminder emails")
                
                # Log individual results if available
                results = result.get('results', [])
                for approver_result in results:
                    status = approver_result.get('status', 'unknown')
                    email = approver_result.get('approverEmail', 'unknown')
                    name = approver_result.get('approverName', 'unknown')
                    pending_count = approver_result.get('pendingCount', 0)
                    
                    if status == 'sent':
                        logger.info(f"   OK: {name} ({email}) - {pending_count} pending approval(s)")
                    else:
                        logger.warning(f"   FAIL: {name} ({email}) - Failed to send reminder")
        else:
            error_msg = result.get('error', 'Unknown error')
            logger.error(f"ERROR: API returned error: {error_msg}")
            
        return result
        
    except requests.exceptions.Timeout:
        error_msg = f"Request timed out after {TIMEOUT_SECONDS} seconds"
        logger.error(f"TIMEOUT: {error_msg}")
        return {'success': False, 'error': error_msg}
        
    except requests.exceptions.ConnectionError:
        error_msg = f"Failed to connect to API at {API_BASE_URL}"
        logger.error(f"CONNECTION ERROR: {error_msg}")
        return {'success': False, 'error': error_msg}
        
    except requests.exceptions.HTTPError as e:
        error_msg = f"HTTP error {e.response.status_code}: {e.response.text}"
        logger.error(f"HTTP ERROR: {error_msg}")
        return {'success': False, 'error': error_msg}
        
    except json.JSONDecodeError:
        error_msg = "Invalid JSON response from API"
        logger.error(f"JSON ERROR: {error_msg}")
        return {'success': False, 'error': error_msg}
        
    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        logger.error(f"UNEXPECTED ERROR: {error_msg}")
        return {'success': False, 'error': error_msg}


def main():
    """Main function to run the daily approval reminders."""
    logger.info("=" * 60)
    logger.info("Daily Approval Reminders Script Started")
    logger.info(f"Execution time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info("=" * 60)
    
    try:
        # Send the approval reminders
        result = send_approval_reminders()
        
        # Determine exit code based on success
        if result.get('success'):
            logger.info("Daily approval reminders process completed successfully!")
            exit_code = 0
        else:
            logger.error("Daily approval reminders process failed!")
            exit_code = 1
            
    except KeyboardInterrupt:
        logger.info("Process interrupted by user")
        exit_code = 130
        
    except Exception as e:
        logger.error(f"Unexpected error in main process: {str(e)}")
        exit_code = 1
    
    finally:
        logger.info("=" * 60)
        logger.info("Daily Approval Reminders Script Finished")
        logger.info("=" * 60)
    
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
