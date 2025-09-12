// Direct test of approval reminder service
const { safeApprovalReminderService } = require('./lib/safe-approval-reminder-service');

async function testApprovalReminder() {
  console.log('🧪 Testing Approval Reminder Service directly...');
  console.log('📅 Date/Time:', new Date().toISOString());
  
  try {
    const result = await safeApprovalReminderService.sendDailyReminders();
    console.log('✅ Test Result:', result);
  } catch (error) {
    console.error('❌ Test Error:', error);
  }
}

testApprovalReminder();
