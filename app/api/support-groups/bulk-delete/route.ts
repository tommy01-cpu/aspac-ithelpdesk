import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST - Bulk delete support groups
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid or empty IDs array' },
        { status: 400 }
      );
    }

    // Convert string IDs to integers
    const numericIds = ids.map(id => parseInt(id)).filter(id => !isNaN(id));

    if (numericIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid IDs provided' },
        { status: 400 }
      );
    }

    // Check if all support groups exist
    const existingGroups = await prisma.supportGroup.findMany({
      where: { id: { in: numericIds } },
      select: { id: true, name: true }
    });

    if (existingGroups.length !== numericIds.length) {
      return NextResponse.json(
        { success: false, error: 'Some support groups not found' },
        { status: 404 }
      );
    }

    // Delete in transaction to ensure referential integrity
    const result = await prisma.$transaction(async (tx) => {
      // Delete technician memberships first
      await tx.technicianSupportGroup.deleteMany({
        where: { supportGroupId: { in: numericIds } }
      });

      // Delete the support groups
      const deletedGroups = await tx.supportGroup.deleteMany({
        where: { id: { in: numericIds } }
      });

      return deletedGroups;
    });

    return NextResponse.json({
      success: true,
      message: `${result.count} support group(s) deleted successfully`,
      deletedCount: result.count
    });

  } catch (error) {
    console.error('Error bulk deleting support groups:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete support groups' },
      { status: 500 }
    );
  }
}
