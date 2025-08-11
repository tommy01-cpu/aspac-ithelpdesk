import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const { employee_id, resetToEmployeeId = true } = await request.json();

    if (!employee_id) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    // Find the user
    const user = await prisma.users.findUnique({
      where: { emp_code: employee_id.toString() }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    let newPassword = employee_id;
    if (resetToEmployeeId) {
      // Reset password to employee ID
      newPassword = employee_id;
    }

    // Hash the new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update the user's password and set requiresPasswordChange flag
    await prisma.users.update({
      where: { emp_code: employee_id.toString() },
      data: { 
        password: hashedNewPassword,
        requiresPasswordChange: true
      }
    });

    console.log(`🔄 Admin ${session.user.name} reset password for user ${employee_id}`);

    return NextResponse.json({ 
      message: 'Password reset successfully. User will be required to change password on next login.',
      temporaryPassword: resetToEmployeeId ? employee_id : 'Generated password'
    });

  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
