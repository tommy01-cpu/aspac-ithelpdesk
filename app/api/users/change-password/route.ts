import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { employee_id, currentPassword, newPassword, isForceChange } = await request.json();

    if (!employee_id || !newPassword) {
      return NextResponse.json(
        { error: 'Employee ID and new password are required' },
        { status: 400 }
      );
    }

    // Validate password requirements
    const passwordValidation = {
      length: newPassword.length >= 8,
      uppercase: /[A-Z]/.test(newPassword),
      lowercase: /[a-z]/.test(newPassword),
      numbers: /[0-9]/.test(newPassword),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(newPassword),
    };

    const isPasswordValid = Object.values(passwordValidation).every(Boolean);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Password does not meet security requirements' },
        { status: 400 }
      );
    }

    // Check if new password is same as employee ID
    if (newPassword.toLowerCase() === employee_id.toLowerCase()) {
      return NextResponse.json(
        { error: 'Password cannot be the same as employee ID' },
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

    // If not a force change, verify current password
    if (!isForceChange && currentPassword) {
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 401 }
        );
      }
    }

    // Hash the new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update the user's password
    await prisma.users.update({
      where: { emp_code: employee_id.toString() },
      data: { 
        password: hashedNewPassword
      }
    });

    return NextResponse.json({ message: 'Password updated successfully' });

  } catch (error) {
    console.error('Error changing password:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
