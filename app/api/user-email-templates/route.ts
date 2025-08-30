import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from database
    const user = await prisma.users.findFirst({
      where: { emp_email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { 
      templateKey, 
      title, 
      description, 
      subject, 
      headerHtml, 
      contentHtml, 
      footerHtml,
      toField,
      ccField 
    } = await request.json();

    // Validation
    if (!templateKey || !title || !subject || !contentHtml) {
      return NextResponse.json({ 
        error: 'Missing required fields: templateKey, title, subject, contentHtml' 
      }, { status: 400 });
    }

    // Create Philippine time for timestamps
    const now = new Date();
    const philippineTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));

    // Save or update email template
    const emailTemplate = await prisma.email_templates.upsert({
      where: { template_key: templateKey },
      create: {
        template_key: templateKey,
        title,
        description: description || '',
        subject,
        header_html: headerHtml || '',
        content_html: contentHtml,
        footer_html: footerHtml || '',
        to_field: toField || '',
        cc_field: ccField || '',
        created_at: philippineTime,
        updated_at: philippineTime,
        created_by: user.id,
        updated_by: user.id,
        is_active: true
      },
      update: {
        title,
        description: description || '',
        subject,
        header_html: headerHtml || '',
        content_html: contentHtml,
        footer_html: footerHtml || '',
        to_field: toField || '',
        cc_field: ccField || '',
        updated_at: philippineTime,
        updated_by: user.id
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Email template saved successfully',
      template: emailTemplate
    });

  } catch (error) {
    console.error('Error saving email template:', error);
    return NextResponse.json(
      { error: 'Failed to save email template' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const templateKey = searchParams.get('key');

    if (templateKey) {
      // Get specific template
      const template = await prisma.email_templates.findUnique({
        where: {
          template_key: templateKey,
          is_active: true
        }
      });

      if (!template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }

      return NextResponse.json({ template });
    } else {
      // Get all active templates
      const templates = await prisma.email_templates.findMany({
        where: { is_active: true },
        orderBy: { title: 'asc' }
      });

      return NextResponse.json({ templates });
    }

  } catch (error) {
    console.error('Error fetching email templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email templates' },
      { status: 500 }
    );
  }
}
