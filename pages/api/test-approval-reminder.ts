// Test approval reminder service directly
import { safeApprovalReminderService } from '../../lib/safe-approval-reminder-service';

export default async function handler(req: any, res: any) {
  const timestamp = new Date().toISOString();
  const localTime = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
  
  console.log(`\n📧 [MANUAL TEST] Approval Reminder Service Test`);
  console.log(`📅 Timestamp: ${timestamp}`);
  console.log(`🇵🇭 Local Time (PH): ${localTime}`);
  console.log(`🔗 Method: ${req.method}`);
  console.log(`🌐 URL: ${req.url}`);

  if (req.method !== 'POST') {
    console.log('❌ Method not allowed - only POST accepted');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🧪 Starting Safe Approval Reminder Service test...');
    console.log('⏰ This will test the service immediately (not waiting for 8:00 AM)');
    
    const startTime = Date.now();
    const result = await safeApprovalReminderService.sendDailyReminders();
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✅ Test completed in ${duration}ms`);
    console.log('📊 Result details:', JSON.stringify(result, null, 2));
    
    return res.status(200).json({
      success: true,
      message: 'Approval reminder test completed',
      testResult: result,
      timing: {
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        duration: `${duration}ms`
      },
      testInfo: {
        timestamp,
        localTime,
        note: 'This is a manual test trigger, not the scheduled 8:00 AM run'
      }
    });
    
  } catch (error) {
    const errorTimestamp = new Date().toISOString();
    console.error(`❌ [${errorTimestamp}] Test failed:`, error);
    console.error('📊 Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorDetails: error instanceof Error ? error.stack : undefined,
      testResult: null,
      errorTimestamp
    });
  }
}
