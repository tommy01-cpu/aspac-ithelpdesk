import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json({ error: 'Holiday ID is required' }, { status: 400 });
    }

    const body = await req.json();
    const { name, date, description, isRecurring, isActive } = body;

    // Validate required fields
    if (!name || !date) {
      return NextResponse.json(
        { error: 'Name and date are required' },
        { status: 400 }
      );
    }

        const holiday = await prisma.holiday.update({
      where: { id: parseInt(id) },
      data: {
        name,
        date: new Date(date),
        description,
        isRecurring: isRecurring ?? false, // Use nullish coalescing to preserve explicit false
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json({
      message: 'Holiday updated successfully',
      holiday,
    });
  } catch (error) {
    console.error('Error updating holiday:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json({ error: 'Holiday ID is required' }, { status: 400 });
    }

    await prisma.holiday.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ message: 'Holiday deleted successfully' });
  } catch (error) {
    console.error('Error deleting holiday:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
