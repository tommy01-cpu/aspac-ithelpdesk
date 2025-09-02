import { NextRequest, NextResponse } from 'next/server';
import { sendApproverAddedEmail, getEmailTemplateById } from '@/lib/database-email-templates';

export async function GET() {
  try {
    console.log('🧪 Testing approver added email functionality...');
    
    // First, test if we can fetch the email template
    const template = await getEmailTemplateById(30);
    if (!template) {
      return NextResponse.json({
        success: false,
        error: 'Email template with ID 30 (notify-approver-added) not found'
      });
    }

    console.log('✅ Email template found:', template.title);

    // Test email variables (sample data)
    const testVariables = {
      Approver_Name: 'John Doe',
      Approver_Email: 'john.doe@example.com',
      Request_ID: '123',
      Request_Subject: 'Test Service Request',
      Request_Title: 'Test Service Request',
      Requester_Name: 'Jane Smith',
      Service_Name: 'IT Support',
      Category_Name: 'Hardware',
      approval_level: '1',
      Priority: 'Medium',
      Created_Date: new Date().toLocaleDateString(),
      approval_link: 'http://192.168.1.85:3000/requests/approvals/123',
      Base_URL: 'http://192.168.1.85:3000'
    };

    console.log('🔧 Testing email template processing...');
    
    // Test the email functionality without actually sending
    // (we'll just prepare the email content)
    const result = await sendApproverAddedEmail(
      'test@example.com', // Test email that won't actually be sent
      testVariables
    );

    return NextResponse.json({
      success: true,
      message: 'Approver notification system test completed',
      templateFound: !!template,
      templateTitle: template.title,
      emailProcessingResult: result,
      testVariables
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
