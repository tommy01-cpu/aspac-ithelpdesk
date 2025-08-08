import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Fetch only active technicians
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    
    // Build search conditions for active technicians only
    const searchConditions = {
      isActive: true,
      ...(search ? {
        OR: [
          { displayName: { contains: search, mode: 'insensitive' as const } },
          { loginName: { contains: search, mode: 'insensitive' as const } },
          { user: { 
              OR: [
                { emp_fname: { contains: search, mode: 'insensitive' as const } },
                { emp_lname: { contains: search, mode: 'insensitive' as const } },
                { emp_email: { contains: search, mode: 'insensitive' as const } },
                { emp_code: { contains: search, mode: 'insensitive' as const } }
              ]
            }
          }
        ]
      } : {})
    };
    
    // Fetch active technicians
    const technicians = await prisma.technician.findMany({
      where: searchConditions,
      select: {
        id: true,
        displayName: true,
        loginName: true,
        isActive: true,
        user: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true,
            emp_email: true,
            emp_code: true,
            post_des: true,
            department: true
          }
        }
      },
      orderBy: [
        { user: { emp_fname: 'asc' } },
        { user: { emp_lname: 'asc' } },
        { displayName: 'asc' }
      ]
    });

    return NextResponse.json({
      success: true,
      data: technicians.map(tech => ({
        id: tech.id,
        displayName: tech.displayName || `${tech.user?.emp_fname || ''} ${tech.user?.emp_lname || ''}`.trim(),
        loginName: tech.loginName,
        employeeId: tech.user?.emp_code || '',
        jobTitle: tech.user?.post_des || '',
        primaryEmail: tech.user?.emp_email || '',
        department: tech.user?.department ? {
          id: tech.user.department,
          name: tech.user.department
        } : null,
        user: tech.user, // Include the full user object for frontend compatibility
        isActive: tech.isActive,
        value: tech.id.toString(),
        name: tech.displayName || `${tech.user?.emp_fname || ''} ${tech.user?.emp_lname || ''}`.trim()
      })),
      total: technicians.length
    });
    
  } catch (error) {
    console.error('Error fetching active technicians:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch active technicians' },
      { status: 500 }
    );
  }
}
