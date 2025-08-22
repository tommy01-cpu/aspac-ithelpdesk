import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Fetch all email template variables for autocomplete
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    const where: any = { isActive: true };
    
    if (category) {
      where.category = category;
    }
    
    if (search) {
      where.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { variableKey: { contains: search, mode: 'insensitive' } }
      ];
    }

    const variables = await prisma.emailTemplateVariables.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { displayName: 'asc' }
      ]
    });

    // Format for the VariableAutocomplete component
    const formattedVariables = variables.map(variable => ({
      id: variable.id,
      variable_name: variable.variableKey,
      display_name: variable.displayName,
      description: variable.description,
      category: variable.category,
      example_value: variable.defaultValue || variable.exampleValue
    }));

    return NextResponse.json({ 
      variables: formattedVariables
    });

  } catch (error) {
    console.error('Error fetching email template variables:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email template variables' },
      { status: 500 }
    );
  }
}
