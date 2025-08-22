import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
    
    const template = await prisma.emailTemplates.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!template) {
      return NextResponse.json(
        { error: 'Email template not found' },
        { status: 404 }
      );
    }
    
    const transformedTemplate = {
      id: template.id,
      name: template.title,
      subject: template.subject,
      content: template.contentHtml,
      type: template.templateKey || 'unknown',
      status: template.isActive ? 'active' : 'inactive',
      lastModified: template.updatedAt ? new Date(template.updatedAt).toLocaleDateString() : 'Unknown'
    };
    
    return NextResponse.json(transformedTemplate);
    
  } catch (error) {
    console.error('Error fetching email template:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch email template: ' + errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
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
    
    const updatedTemplate = await prisma.emailTemplates.update({
      where: { id: parseInt(id) },
      data: {
        title: name,
        subject: subject,
        contentHtml: contentHtml,
        templateKey: type,
        isActive: isActive,
      }
    });
    
    const transformedTemplate = {
      id: updatedTemplate.id,
      name: updatedTemplate.title,
      subject: updatedTemplate.subject,
      type: updatedTemplate.templateKey || 'unknown',
      status: updatedTemplate.isActive ? 'active' : 'inactive',
      lastModified: new Date(updatedTemplate.updatedAt).toLocaleDateString()
    };
    
    return NextResponse.json(transformedTemplate);
    
  } catch (error) {
    console.error('Error updating email template:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to update email template: ' + errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
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
    
    await prisma.emailTemplates.delete({
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
  } finally {
    await prisma.$disconnect();
  }
}
