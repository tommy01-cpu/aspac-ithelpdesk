import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST - Bulk delete SLA services
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids } = body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'IDs array is required and cannot be empty' },
        { status: 400 }
      );
    }

    // Validate that all IDs are numbers
    const numericIds = ids.map(id => parseInt(id)).filter(id => !isNaN(id));
    
    if (numericIds.length !== ids.length) {
      return NextResponse.json(
        { success: false, error: 'All IDs must be valid numbers' },
        { status: 400 }
      );
    }

    // Check which services exist
    const existingServices = await prisma.sLAService.findMany({
      where: {
        id: { in: numericIds },
      },
      select: { id: true },
    });

    const existingIds = existingServices.map(service => service.id);
    const notFoundIds = numericIds.filter(id => !existingIds.includes(id));

    if (notFoundIds.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `SLA services not found with IDs: ${notFoundIds.join(', ')}` 
        },
        { status: 404 }
      );
    }

    // Delete related escalations first
    await prisma.sLAServiceEscalation.deleteMany({
      where: {
        slaServiceId: { in: numericIds },
      },
    });

    // Delete the services
    const deleteResult = await prisma.sLAService.deleteMany({
      where: {
        id: { in: numericIds },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deleteResult.count} SLA service(s)`,
      deletedCount: deleteResult.count,
    });
  } catch (error) {
    console.error('Error bulk deleting SLA services:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete SLA services' },
      { status: 500 }
    );
  }
}
