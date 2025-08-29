import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Fetch users who are technicians (from technician table)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    
    // Build search conditions for users who are technicians
    const searchConditions = {
      emp_status: 'active',
      technician: {
        isActive: true
      },
      ...(search ? {
        OR: [
          { emp_fname: { contains: search, mode: 'insensitive' as const } },
          { emp_lname: { contains: search, mode: 'insensitive' as const } },
          { emp_email: { contains: search, mode: 'insensitive' as const } },
          { emp_code: { contains: search, mode: 'insensitive' as const } }
        ]
      } : {})
    };
    
    // Fetch users who have active technician records
    const users = await prisma.users.findMany({
      where: searchConditions,
      select: {
        id: true,
        emp_fname: true,
        emp_lname: true,
        emp_email: true,
        emp_code: true,
        post_des: true,
        department: true
      },
      orderBy: [
        { emp_fname: 'asc' },
        { emp_lname: 'asc' }
      ]
    });

    return NextResponse.json({
      success: true,
      users: users,
      total: users.length
    });
    
  } catch (error) {
    console.error('Error fetching technician users:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch technician users' },
      { status: 500 }
    );
  }
}
