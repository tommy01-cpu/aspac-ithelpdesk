import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET single email template
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    
    // Use raw SQL query to access the email_templates table
    const template = await prisma.$queryRaw`
      SELECT * FROM email_templates WHERE id = ${parseInt(id)}
    `;
    
    if (!template || (Array.isArray(template) && template.length === 0)) {
      return NextResponse.json(
        { error: 'Email template not found' },
        { status: 404 }
      );
    }
    
    const templateData = Array.isArray(template) ? template[0] : template;
    
    const transformedTemplate = {
      id: templateData.id,
      name: templateData.title,
      subject: templateData.subject,
      content: templateData.content_html,
      header_html: templateData.header_html,
      footer_html: templateData.footer_html,
      to_field: templateData.to_field,
      cc_field: templateData.cc_field,
      type: templateData.template_key || 'unknown',
      status: templateData.is_active ? 'active' : 'inactive',
      lastModified: templateData.updated_at ? new Date(templateData.updated_at).toLocaleDateString() : 'Unknown'
    };
    
    return NextResponse.json(transformedTemplate);
    
  } catch (error) {
    console.error('Error fetching email template:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch email template: ' + errorMessage },
      { status: 500 }
    );
  }
}

// PUT update email template
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { name, subject, contentHtml, type, isActive } = body;
    
    // @ts-ignore - email_templates model exists but TypeScript cache issue
    const updatedTemplate = await prisma.email_templates.update({
      where: { id: parseInt(id) },
      data: {
        title: name,
        subject: subject,
        content_html: contentHtml,
        template_key: type,
        is_active: isActive,
        updated_at: new Date(),
      }
    });
    
    const transformedTemplate = {
      id: updatedTemplate.id,
      name: updatedTemplate.title,
      subject: updatedTemplate.subject,
      type: updatedTemplate.template_key || 'unknown',
      status: updatedTemplate.is_active ? 'active' : 'inactive',
      lastModified: updatedTemplate.updated_at ? new Date(updatedTemplate.updated_at).toLocaleDateString() : 'Unknown'
    };
    
    return NextResponse.json(transformedTemplate);
    
  } catch (error) {
    console.error('Error updating email template:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to update email template: ' + errorMessage },
      { status: 500 }
    );
  }
}

// DELETE email template
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    
    // @ts-ignore - email_templates model exists but TypeScript cache issue
    await prisma.email_templates.delete({
      where: { id: parseInt(id) }
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Email template deleted successfully' 
    });
    
  } catch (error) {
    console.error('Error deleting email template:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to delete email template: ' + errorMessage },
      { status: 500 }
    );
  }
}
