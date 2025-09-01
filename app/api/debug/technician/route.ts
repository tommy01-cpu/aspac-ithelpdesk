import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * API to check technician status for a specific user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({
        error: 'userId parameter is required'
      }, { status: 400 });
    }

    // Look up user and check technician table
    const user = await prisma.users.findUnique({
      where: { id: parseInt(userId) },
      include: {
        technician: true
      }
    });

    if (!user) {
      return NextResponse.json({
        error: 'User not found'
      }, { status: 404 });
    }

    // Also get all technicians to see the full table
    const allTechnicians = await prisma.technician.findMany({
      select: {
        id: true,
        userId: true,
        displayName: true,
        isAdmin: true,
        status: true,
        isActive: true,
        user: {
          select: {
            emp_code: true,
            emp_fname: true,
            emp_lname: true
          }
        }
      }
    });

    return NextResponse.json({
      user: {
        id: user.id,
        emp_code: user.emp_code,
        emp_fname: user.emp_fname,
        emp_lname: user.emp_lname,
        hasTechnicianRecord: !!user.technician
      },
      technician: user.technician ? {
        id: user.technician.id,
        userId: user.technician.userId,
        displayName: user.technician.displayName,
        isAdmin: user.technician.isAdmin,
        status: user.technician.status,
        isActive: user.technician.isActive
      } : null,
      shouldBeTechnician: !!user.technician,
      allTechnicians: allTechnicians.map((t: any) => ({
        id: t.id,
        userId: t.userId,
        displayName: t.displayName,
        emp_code: t.user.emp_code,
        emp_fname: t.user.emp_fname,
        emp_lname: t.user.emp_lname,
        isAdmin: t.isAdmin,
        status: t.status,
        isActive: t.isActive
      }))
    });

  } catch (error) {
    console.error('Technician check error:', error);
    return NextResponse.json({
      error: 'Failed to check technician status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
