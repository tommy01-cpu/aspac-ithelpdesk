// Test approval reminder service directly
import { safeApprovalReminderService } from '../../lib/safe-approval-reminder-service';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🧪 Testing Safe Approval Reminder Service...');
    
    const result = await safeApprovalReminderService.sendDailyReminders();
    
    console.log('✅ Test completed:', result);
    
    return res.status(200).json({
      success: true,
      message: 'Test completed',
      testResult: result
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      testResult: null
    });
  }
}
