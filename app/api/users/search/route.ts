import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!q || q.length < 2) {
      return NextResponse.json({
        success: true,
        users: []
      });
    }

    // Use Prisma operations instead of raw SQL for better connection management
    const searchTerm = q.toLowerCase();
    const users = await prisma.users.findMany({
      where: {
        AND: [
          { emp_status: 'active' },
          {
            OR: [
              { emp_fname: { contains: searchTerm, mode: 'insensitive' } },
              { emp_lname: { contains: searchTerm, mode: 'insensitive' } },
              { emp_email: { contains: searchTerm, mode: 'insensitive' } },
              { emp_code: { contains: searchTerm, mode: 'insensitive' } }
            ]
          }
        ]
      },
      select: {
        id: true,
        emp_code: true,
        emp_fname: true,
        emp_mid: true,
        emp_lname: true,
        emp_suffix: true,
        emp_email: true,
        emp_cell: true,
        post_des: true,
        department: true,
        emp_status: true,
        profile_image: true,
        description: true,
        landline_no: true,
        local_no: true,
        reportingToId: true,
        isServiceApprover: true
      },
      orderBy: [
        { emp_fname: 'asc' },
        { emp_lname: 'asc' }
      ],
      take: limit
    });

    return NextResponse.json({
      success: true,
      users: users
    });
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to search users'
    }, { status: 500 });
  }
}
