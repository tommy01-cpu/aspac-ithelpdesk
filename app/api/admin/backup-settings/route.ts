import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get backup settings - there should be only one record
    let settings = await prisma.$queryRaw`
      SELECT * FROM backup_settings ORDER BY id LIMIT 1
    `;

    // If no settings exist, create default one
    if (!settings || (Array.isArray(settings) && settings.length === 0)) {
      await prisma.$executeRaw`
        INSERT INTO backup_settings (backup_directory, backup_time, is_enabled) 
        VALUES ('C:\\BackupDB', '00:00', true)
      `;
      
      settings = await prisma.$queryRaw`
        SELECT * FROM backup_settings ORDER BY id LIMIT 1
      `;
    }

    const settingsData = Array.isArray(settings) ? settings[0] : settings;

    return NextResponse.json({ 
      success: true, 
      settings: settingsData 
    });
  } catch (error) {
    console.error('Error fetching backup settings:', error);
    return NextResponse.json({ error: 'Failed to fetch backup settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { backup_directory, backup_time, is_enabled } = await request.json();

    // Validate inputs
    if (!backup_directory?.trim()) {
      return NextResponse.json({ error: 'Backup directory is required' }, { status: 400 });
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(backup_time)) {
      return NextResponse.json({ error: 'Invalid time format. Use HH:MM' }, { status: 400 });
    }

    // Check if settings exist
    const existingSettings = await prisma.$queryRaw`
      SELECT id FROM backup_settings LIMIT 1
    `;

    let updatedSettings;

    if (!existingSettings || (Array.isArray(existingSettings) && existingSettings.length === 0)) {
      // Create new settings
      await prisma.$executeRaw`
        INSERT INTO backup_settings (backup_directory, backup_time, is_enabled) 
        VALUES (${backup_directory}, ${backup_time}, ${is_enabled})
      `;
    } else {
      // Update existing settings
      await prisma.$executeRaw`
        UPDATE backup_settings 
        SET backup_directory = ${backup_directory}, 
            backup_time = ${backup_time}, 
            is_enabled = ${is_enabled},
            updated_at = NOW()
        WHERE id = (SELECT id FROM backup_settings LIMIT 1)
      `;
    }

    // Get updated settings
    updatedSettings = await prisma.$queryRaw`
      SELECT * FROM backup_settings ORDER BY id LIMIT 1
    `;

    const settingsData = Array.isArray(updatedSettings) ? updatedSettings[0] : updatedSettings;

    return NextResponse.json({ 
      success: true, 
      message: 'Backup settings updated successfully',
      settings: settingsData 
    });
  } catch (error) {
    console.error('Error updating backup settings:', error);
    return NextResponse.json({ error: 'Failed to update backup settings' }, { status: 500 });
  }
}
