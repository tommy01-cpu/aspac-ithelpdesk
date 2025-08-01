import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const users = await prisma.users.findMany({
      where: {
        emp_status: 'active',
        isServiceApprover: true
      },
      select: {
        id: true,
        emp_fname: true,
        emp_mid: true,
        emp_lname: true,
        emp_code: true,
        emp_email: true,
        post_des: true,
        department: true
      },
      orderBy: [
        { emp_fname: 'asc' },
        { emp_lname: 'asc' }
      ]
    });

    // Format the users for better display
    const formattedUsers = users.map(user => ({
      id: user.id,
      name: `${user.emp_fname} ${user.emp_mid ? user.emp_mid + ' ' : ''}${user.emp_lname}`.trim(),
      employeeId: user.emp_code,
      email: user.emp_email,
      jobTitle: user.post_des,
      department: user.department
    }));

    return NextResponse.json(formattedUsers);
  } catch (error) {
    console.error('Error fetching approvers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch approvers' },
      { status: 500 }
    );
  }
}
