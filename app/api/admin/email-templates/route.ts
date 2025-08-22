import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('=== EMAIL TEMPLATES API DEBUG ===');
    console.log('Fetching email templates with Prisma...');
    
    const templates = await prisma.emailTemplates.findMany({
      orderBy: {
        title: 'asc'
      }
    });
    
    console.log('Query successful! Found', templates.length, 'templates');
    console.log('Sample data:', templates[0] || 'No data');
    
    // Transform the data to match the frontend interface
    const transformedTemplates = templates.map(template => ({
      id: template.id,
      name: template.title,
      subject: template.subject,
      type: template.templateKey || 'unknown',
      status: template.isActive ? 'active' : 'inactive',
      lastModified: template.updatedAt ? new Date(template.updatedAt).toLocaleDateString() : 'Unknown'
    }));
    
    console.log('Transformed templates:', transformedTemplates);
    return NextResponse.json(transformedTemplates);
    
  } catch (error) {
    console.error('Error fetching email templates:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch email templates: ' + errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, subject, contentHtml, type, isActive = true } = body;
    
    if (!name || !subject || !contentHtml) {
      return NextResponse.json(
        { error: 'Name, subject, and content are required' },
        { status: 400 }
      );
    }
    
    console.log('=== CREATING EMAIL TEMPLATE ===');
    console.log('Data:', { name, subject, type, isActive });
    
    // Create new email template using Prisma
    const newTemplate = await prisma.emailTemplates.create({
      data: {
        title: name,
        subject: subject,
        contentHtml: contentHtml,
        templateKey: type,
        isActive: isActive,
      }
    });
    
    const transformedTemplate = {
      id: newTemplate.id,
      name: newTemplate.title,
      subject: newTemplate.subject,
      type: newTemplate.templateKey || 'unknown',
      status: newTemplate.isActive ? 'active' : 'inactive',
      lastModified: new Date(newTemplate.updatedAt).toLocaleDateString()
    };
    
    console.log('Template created successfully:', transformedTemplate);
    return NextResponse.json(transformedTemplate, { status: 201 });
    
  } catch (error) {
    console.error('Error creating email template:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create email template: ' + errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
