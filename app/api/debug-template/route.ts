import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    console.log('🔍 Checking REQUEST_CREATED_REQUESTER email template...');
    
    const template = await prisma.email_Template.findFirst({
      where: { type: 'REQUEST_CREATED_REQUESTER' }
    });
    
    if (!template) {
      return NextResponse.json({ error: 'No template found for REQUEST_CREATED_REQUESTER' });
    }
    
    const analysis = {
      id: template.id,
      name: template.name,
      isActive: template.is_active,
      containsRequestDescription: template.html_content.includes('Request_Description'),
      containsDescriptionVariable: template.html_content.includes('${Request_Description}'),
      descriptionMatches: template.html_content.match(/\$\{[^}]*Request_Description[^}]*\}/gi),
      fullTemplate: template.html_content
    };
    
    return NextResponse.json(analysis);
    
  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
