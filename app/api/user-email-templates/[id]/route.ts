import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/email-templates/[id] - Get a single template
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const identifier = params.id;
    
    // Check if identifier is numeric (ID) or string (templateKey)
    const isNumericId = !isNaN(Number(identifier));
    
    const template = await prisma.email_templates.findFirst({
      where: isNumericId 
        ? { id: parseInt(identifier) }
        : { template_key: identifier }
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error fetching template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    );
  }
}

// PUT /api/email-templates/[id] - Update a template
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const identifier = params.id;
    const body = await request.json();

    const {
      title,
      description,
      subject,
      toField,
      ccField,
      headerHtml,
      contentHtml,
      footerHtml,
      isActive
    } = body;

    // Check if identifier is numeric (ID) or string (templateKey)
    const isNumericId = !isNaN(Number(identifier));

    // Update the template
    const updatedTemplate = await prisma.email_templates.update({
      where: isNumericId
        ? { id: parseInt(identifier) }
        : { template_key: identifier },
      data: {
        title,
        description,
        subject,
        to_field: toField,
        cc_field: ccField,
        header_html: headerHtml,
        content_html: contentHtml,
        footer_html: footerHtml,
        is_active: isActive,
        updated_at: new Date()
      }
    });

    return NextResponse.json({ 
      message: 'Template updated successfully',
      template: updatedTemplate 
    });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

// DELETE /api/email-templates/[id] - Delete a template
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const identifier = params.id;
    
    // Check if identifier is numeric (ID) or string (templateKey)
    const isNumericId = !isNaN(Number(identifier));

    await prisma.email_templates.delete({
      where: isNumericId
        ? { id: parseInt(identifier) }
        : { template_key: identifier }
    });

    return NextResponse.json({ 
      message: 'Template deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
