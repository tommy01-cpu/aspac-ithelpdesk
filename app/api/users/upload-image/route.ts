import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const userId = formData.get('userId') as string;
    const file = formData.get('image') as File;

    if (!userId || !file) {
      return NextResponse.json(
        { error: 'User ID and image file are required' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    try {
      await fs.access(uploadsDir);
    } catch {
      await fs.mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = path.extname(file.name);
    const filename = `${userId}_${timestamp}${extension}`;
    const filepath = path.join(uploadsDir, filename);

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await fs.writeFile(filepath, new Uint8Array(buffer));

    // Update user record with new profile image
    // TODO: Enable once Prisma client supports profile_image field
    // await prisma.users.update({
    //   where: { id: parseInt(userId) },
    //   data: { profile_image: filename }
    // });

    return NextResponse.json(
      { 
        message: 'Image uploaded successfully',
        filename: filename,
        url: `/uploads/${filename}`
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // TODO: Enable once Prisma client supports profile_image field
    // Get current user data to find existing image
    // const user = await prisma.users.findUnique({
    //   where: { id: parseInt(userId) },
    //   select: { profile_image: true }
    // });

    // if (!user) {
    //   return NextResponse.json(
    //     { error: 'User not found' },
    //     { status: 404 }
    //   );
    // }

    // Delete existing image file if it exists
    // if (user.profile_image) {
    //   const filepath = path.join(process.cwd(), 'public', 'uploads', user.profile_image);
    //   try {
    //     await fs.unlink(filepath);
    //   } catch (error) {
    //     console.warn('Could not delete old image file:', error);
    //   }
    // }

    // Update user record to remove profile image
    // await prisma.users.update({
    //   where: { id: parseInt(userId) },
    //   data: { profile_image: null }
    // });

    return NextResponse.json(
      { message: 'Profile image removed successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error removing profile image:', error);
    return NextResponse.json(
      { error: 'Failed to remove profile image' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
