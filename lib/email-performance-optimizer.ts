// Email Performance Optimizer
// Implements connection pooling and caching for better email performance

import nodemailer from 'nodemailer';
import { getEmailConfigForService } from './email-config';

// Global transporter instance with connection pooling
let globalTransporter: nodemailer.Transporter | null = null;
let transporterConfig: any = null;
let lastConfigUpdate = 0;
const CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Create optimized transporter with connection pooling
const createOptimizedTransporter = async () => {
  try {
    const config = await getEmailConfigForService();
    
    const transportConfig: any = {
      host: config.serverName,
      port: config.port,
      secure: config.protocol === 'SMTPS',
      
      // Connection pooling settings
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      
      // Performance optimizations
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 5000,    // 5 seconds
      socketTimeout: 30000,     // 30 seconds
      
      tls: {
        rejectUnauthorized: false,
        ciphers: 'SSLv3' // For compatibility
      }
    };

    // Authentication
    if (config.username && config.password) {
      transportConfig.auth = {
        user: config.username,
        pass: config.password,
      };
    } else if (process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
      transportConfig.auth = {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      };
    }

    return nodemailer.createTransport(transportConfig);
  } catch (error) {
    console.error('Error creating optimized transporter:', error);
    throw error;
  }
};

// Get or create cached transporter
export const getOptimizedTransporter = async (): Promise<nodemailer.Transporter> => {
  const now = Date.now();
  
  // Check if we need to refresh the transporter (config might have changed)
  if (!globalTransporter || (now - lastConfigUpdate) > CONFIG_CACHE_TTL) {
    // Close existing transporter if it exists
    if (globalTransporter) {
      globalTransporter.close();
    }
    
    console.log('Creating new optimized email transporter...');
    globalTransporter = await createOptimizedTransporter();
    lastConfigUpdate = now;
  }
  
  return globalTransporter;
};

// Optimized email sending function
export const sendEmailOptimized = async (emailData: {
  to: string | string[];
  cc?: string | string[];
  subject: string;
  message?: string;
  htmlMessage?: string;
}): Promise<boolean> => {
  try {
    const transporter = await getOptimizedTransporter();
    
    const mailOptions: any = {
      from: `"IT Helpdesk" <${process.env.SMTP_USER}>`,
      to: Array.isArray(emailData.to) ? emailData.to.join(', ') : emailData.to,
      cc: emailData.cc ? (Array.isArray(emailData.cc) ? emailData.cc.join(', ') : emailData.cc) : undefined,
      subject: emailData.subject,
    };

    // Set content
    if (emailData.htmlMessage) {
      mailOptions.html = emailData.htmlMessage;
      if (!emailData.message) {
        mailOptions.text = emailData.htmlMessage.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      } else {
        mailOptions.text = emailData.message;
      }
    } else if (emailData.message) {
      mailOptions.text = emailData.message;
      mailOptions.html = emailData.message.replace(/\n/g, '<br>');
    } else {
      throw new Error('No message content provided');
    }

    console.time('Email Send Duration');
    const result = await transporter.sendMail(mailOptions);
    console.timeEnd('Email Send Duration');
    
    console.log('📧 Email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('❌ Error sending optimized email:', error);
    return false;
  }
};

interface BatchEmailResult {
  success: boolean;
  recipient: string;
  messageId?: string;
  error?: string;
}

// Batch email sending for multiple recipients
export const sendBatchEmails = async (
  emails: Array<{
    to: string;
    subject: string;
    htmlMessage: string;
    textMessage?: string;
  }>
): Promise<{sent: number; failed: number; results: BatchEmailResult[]}> => {
  const results: BatchEmailResult[] = [];
  let sent = 0;
  let failed = 0;
  
  try {
    const transporter = await getOptimizedTransporter();
    
    console.log(`📧 Starting batch email send for ${emails.length} emails...`);
    console.time('Batch Email Duration');
    
    // Send all emails concurrently (but limited by connection pool)
    const promises = emails.map(async (email, index): Promise<BatchEmailResult> => {
      try {
        const mailOptions = {
          from: `"IT Helpdesk" <${process.env.SMTP_USER}>`,
          to: email.to,
          subject: email.subject,
          html: email.htmlMessage,
          text: email.textMessage || email.htmlMessage.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
        };
        
        const result = await transporter.sendMail(mailOptions);
        console.log(`✅ Email ${index + 1}/${emails.length} sent to ${email.to}`);
        return { success: true, recipient: email.to, messageId: result.messageId };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Email ${index + 1}/${emails.length} failed to ${email.to}:`, error);
        return { success: false, recipient: email.to, error: errorMessage };
      }
    });
    
    const batchResults = await Promise.all(promises);
    console.timeEnd('Batch Email Duration');
    
    // Count results
    batchResults.forEach(result => {
      if (result.success) {
        sent++;
      } else {
        failed++;
      }
      results.push(result);
    });
    
    console.log(`📊 Batch email complete: ${sent} sent, ${failed} failed`);
    
  } catch (error) {
    console.error('❌ Batch email sending failed:', error);
    failed = emails.length;
  }
  
  return { sent, failed, results };
};

// Cleanup function to close transporter when app shuts down
export const closeTransporter = () => {
  if (globalTransporter) {
    console.log('Closing email transporter...');
    globalTransporter.close();
    globalTransporter = null;
  }
};

// Performance monitoring
export const getEmailPerformanceStats = () => {
  return {
    transporterCached: !!globalTransporter,
    lastConfigUpdate: new Date(lastConfigUpdate).toISOString(),
    cacheAge: Date.now() - lastConfigUpdate
  };
};
