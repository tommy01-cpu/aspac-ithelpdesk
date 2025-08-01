import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = parseInt(params.id);
    const { newPassword } = await req.json();

    if (!userId || !newPassword) {
      return NextResponse.json({
        success: false,
        error: 'User ID and new password are required',
      }, { status: 400 });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password using raw SQL (since Prisma client might not be updated)
    await prisma.$executeRaw`
      UPDATE users 
      SET password = ${hashedPassword}
      WHERE id = ${userId}
    `;

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to reset password',
    }, { status: 500 });
  }
}
