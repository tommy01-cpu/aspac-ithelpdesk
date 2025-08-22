import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Fetch active email template variables from database
    const variables = await prisma.emailTemplateVariables.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        variableKey: true,
        displayName: true,
        description: true,
        category: true,
        exampleValue: true
      },
      orderBy: [
        { category: 'asc' },
        { displayName: 'asc' }
      ]
    });

    // Transform to match the expected format
    const formattedVariables = variables.map((variable: any) => ({
      name: variable.variableKey,
      description: variable.description || variable.displayName,
      displayName: variable.displayName,
      category: variable.category || 'General',
      exampleValue: variable.exampleValue || ''
    }));

    return NextResponse.json(formattedVariables);
  } catch (error) {
    console.error('Error fetching email template variables:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email template variables' },
      { status: 500 }
    );
  }
}
