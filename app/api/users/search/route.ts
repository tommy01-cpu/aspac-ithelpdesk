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

    // Search users by name, email, or employee code
    const searchPattern = `%${q.toLowerCase()}%`;
    const users = await prisma.$queryRaw`
      SELECT 
        u.id,
        u.employee_id as emp_code,
        u.first_name as emp_fname,
        u.middle_name as emp_mid,
        u.last_name as emp_lname,
        u.suffix as emp_suffix,
        u.corporate_email as emp_email,
        u.corporate_mobile_no as emp_cell,
        u.job_title as post_des,
        u.department,
        u.status as emp_status,
        u.profile_image,
        u.description,
        u.landline_no,
        u.local_no,
        u."reportingToId",
        u."isServiceApprover"
      FROM users u
      WHERE (
        LOWER(u.first_name) LIKE ${searchPattern} OR
        LOWER(u.last_name) LIKE ${searchPattern} OR
        LOWER(u.corporate_email) LIKE ${searchPattern} OR
        LOWER(u.employee_id) LIKE ${searchPattern}
      )
      AND u.status = 'active'
      ORDER BY u.first_name ASC, u.last_name ASC
      LIMIT ${limit}
    `;

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
