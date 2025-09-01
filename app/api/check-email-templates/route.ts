import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    console.log('🔍 Checking email templates in database...');
    
    // Get all email templates to see what's available
    const templates = await prisma.email_templates.findMany({
      select: {
        id: true,
        template_key: true,
        title: true,
        is_active: true
      },
      orderBy: {
        id: 'desc'
      }
    });

    console.log(`Found ${templates.length} email templates`);

    // Look specifically for the notify-approver-added template
    const approverTemplate = templates.find(t => t.template_key === 'notify-approver-added');
    
    return NextResponse.json({
      success: true,
      totalTemplates: templates.length,
      approverTemplate: approverTemplate || null,
      allTemplates: templates
    });

  } catch (error) {
    console.error('❌ Database check failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
