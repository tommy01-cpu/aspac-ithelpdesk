import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE() {
  try {
    // Delete the incorrectly created 2026 holidays
    const result = await prisma.holiday.deleteMany({
      where: {
        date: {
          gte: new Date(2026, 0, 1), // January 1st 2026
          lt: new Date(2027, 0, 1)   // January 1st 2027
        },
        name: {
          contains: 'Test Recurring Holiday'
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Deleted ${result.count} test holidays from 2026`,
      deletedCount: result.count
    });
    
  } catch (error) {
    console.error('❌ Delete failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
