import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/database-email-templates';

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Testing email with processed image...');
    
    const testHtml = `
      <h2>Debug Email Test</h2>
      <p>This is a test email with processed image content.</p>
      <p><strong>Original text:</strong> testing</p>
      <p><strong>Processed image:</strong></p>
      <p><img src="http://192.168.1.85:3000/uploads/request-images/request_224_img_1_1755835842492_10e1fffe.png" alt="Test Image"></p>
      <p>If you can see the image above, the processing is working correctly.</p>
    `;
    
    const result = await sendEmail({
      to: 'tom.mandapat@aspacphils.com.ph',
      subject: 'DEBUG: Image Processing Test',
      htmlMessage: testHtml
    });
    
    if (result) {
      console.log('✅ Debug email sent successfully');
      return NextResponse.json({
        success: true,
        message: 'Debug email sent successfully'
      });
    } else {
      console.log('❌ Failed to send debug email');
      return NextResponse.json({
        success: false,
        error: 'Failed to send email'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ Error sending debug email:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
