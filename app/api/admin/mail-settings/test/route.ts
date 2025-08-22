import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { settings, testEmail } = await request.json();
    
    if (!testEmail || !settings) {
      return NextResponse.json({ 
        error: 'Test email address and settings are required' 
      }, { status: 400 });
    }

    // Create transporter with the provided settings
    const transporter = nodemailer.createTransport({
      host: settings.serverName,
      port: settings.port,
      secure: settings.protocol === 'SMTPS', // SMTPS is secure
      auth: (settings.username && settings.password) ? {
        user: settings.username,
        pass: settings.password,
      } : undefined,
      tls: {
        rejectUnauthorized: false // For development/testing
      }
    });

    // Verify connection first
    await transporter.verify();

    // Send test email
    const testEmailContent = {
      from: `${settings.senderName} <${settings.username || settings.replyTo}>`,
      to: testEmail,
      replyTo: settings.replyTo,
      subject: 'IT Helpdesk - Test Email Configuration',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745;">
            <h2 style="color: #28a745; margin-top: 0;">✅ Email Configuration Test Successful!</h2>
            <p>This is a test email from your IT Helpdesk system.</p>
            <p><strong>Configuration Details:</strong></p>
            <ul style="list-style-type: none; padding-left: 0;">
              <li>📧 <strong>Server:</strong> ${settings.serverName}:${settings.port}</li>
              <li>🔒 <strong>Protocol:</strong> ${settings.protocol}</li>
              <li>👤 <strong>Sender:</strong> ${settings.senderName}</li>
              <li>↩️ <strong>Reply To:</strong> ${settings.replyTo}</li>
            </ul>
            <p style="color: #6c757d; font-size: 14px; margin-top: 20px;">
              If you received this email, your mail server configuration is working correctly.
            </p>
          </div>
          <div style="margin-top: 20px; padding: 10px; background-color: #e9ecef; border-radius: 4px; font-size: 12px; color: #6c757d;">
            <p><strong>IT Helpdesk System</strong></p>
            <p>This is an automated test email. Please do not reply to this message.</p>
            <p>Time sent: ${new Date().toLocaleString()}</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(testEmailContent);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test email sent successfully!' 
    });
    
  } catch (error: any) {
    console.error('Email test failed:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      command: error.command,
      response: error.response
    });
    
    let errorMessage = 'Failed to send test email';
    
    // Provide more specific error messages based on error codes
    if (error.code === 'EAUTH' || error.responseCode === 535) {
      errorMessage = 'Authentication failed: Invalid username or password. Please check your credentials.';
    } else if (error.code === 'ECONNECTION' || error.code === 'ENOTFOUND') {
      errorMessage = 'Connection failed: Could not connect to the mail server. Please check your server name and port.';
    } else if (error.code === 'ESOCKET' || error.code === 'ETIMEDOUT') {
      errorMessage = 'Connection timeout: The server is not responding. Please check your server settings.';
    } else if (error.responseCode === 530) {
      errorMessage = 'Authentication required: The server requires authentication. Please provide username and password.';
    } else if (error.responseCode === 587 || error.message?.includes('Must issue a STARTTLS')) {
      errorMessage = 'Security error: The server requires secure connection (TLS/SSL). Try using SMTPS protocol or port 465.';
    } else if (error.message) {
      // Clean up the error message for better display
      errorMessage = error.message.replace(/Mail command failed: /, '').replace(/\r?\n/g, ' ');
    }
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 400 });
  }
}
