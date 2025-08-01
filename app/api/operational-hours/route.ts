import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    // Get operational hours with all related data
    const operationalHours = await prisma.operationalHours.findFirst({
      where: {
        isActive: true,
      },
      include: {
        workingDays: {
          include: {
            breakHours: true,
          },
          orderBy: {
            dayOfWeek: 'asc',
          },
        },
        exclusionRules: {
          orderBy: {
            id: 'asc',
          },
        },
      },
    });

    if (!operationalHours) {
      // Return default configuration if none exists
      return NextResponse.json({
        success: true,
        operationalHours: {
          workingTimeType: 'standard',
          standardStartTime: '08:00',
          standardEndTime: '18:00',
          standardBreakStart: '12:00',
          standardBreakEnd: '13:00',
          workingDays: [],
          exclusionRules: [],
        },
      });
    }

    // Transform the data to match frontend expectations
    const transformedData = {
      id: operationalHours.id,
      workingTimeType: operationalHours.workingTimeType,
      standardStartTime: operationalHours.standardStartTime,
      standardEndTime: operationalHours.standardEndTime,
      standardBreakStart: operationalHours.standardBreakStart,
      standardBreakEnd: operationalHours.standardBreakEnd,
      workingDays: operationalHours.workingDays.map(day => ({
        id: day.id,
        dayOfWeek: day.dayOfWeek,
        isEnabled: day.isEnabled,
        scheduleType: day.scheduleType,
        customStartTime: day.customStartTime,
        customEndTime: day.customEndTime,
        breakHours: day.breakHours.map(br => ({
          id: br.id,
          startTime: br.startTime,
          endTime: br.endTime,
        })),
      })),
      exclusionRules: operationalHours.exclusionRules.map(rule => ({
        id: rule.id,
        excludeOn: rule.excludeOn,
        weekSelection: rule.weekSelection,
        monthSelection: rule.monthSelection,
      })),
    };

    return NextResponse.json({
      success: true,
      operationalHours: transformedData,
    });
  } catch (error) {
    console.error('Error fetching operational hours:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch operational hours',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    
    const {
      workingTimeType,
      standardStartTime,
      standardEndTime,
      standardBreakStart,
      standardBreakEnd,
      workingDays,
      exclusionRules,
    } = data;

    // Validate required fields
    if (!workingTimeType) {
      return NextResponse.json({
        success: false,
        error: 'Working time type is required',
      }, { status: 400 });
    }

    // Check if operational hours already exist
    const existingConfig = await prisma.operationalHours.findFirst({
      where: { isActive: true },
    });

    let operationalHoursId: number;

    if (existingConfig) {
      // Update existing configuration
      await prisma.operationalHours.update({
        where: { id: existingConfig.id },
        data: {
          workingTimeType,
          standardStartTime: workingTimeType === 'standard' ? standardStartTime : null,
          standardEndTime: workingTimeType === 'standard' ? standardEndTime : null,
          standardBreakStart: workingTimeType === 'standard' ? standardBreakStart : null,
          standardBreakEnd: workingTimeType === 'standard' ? standardBreakEnd : null,
          updatedAt: new Date(),
        },
      });

      // Delete existing working days and exclusion rules to recreate them
      await prisma.workingDay.deleteMany({
        where: { operationalHoursId: existingConfig.id },
      });
      await prisma.exclusionRule.deleteMany({
        where: { operationalHoursId: existingConfig.id },
      });

      operationalHoursId = existingConfig.id;
    } else {
      // Create new configuration
      const newConfig = await prisma.operationalHours.create({
        data: {
          workingTimeType,
          standardStartTime: workingTimeType === 'standard' ? standardStartTime : null,
          standardEndTime: workingTimeType === 'standard' ? standardEndTime : null,
          standardBreakStart: workingTimeType === 'standard' ? standardBreakStart : null,
          standardBreakEnd: workingTimeType === 'standard' ? standardBreakEnd : null,
        },
      });

      operationalHoursId = newConfig.id;
    }

    // Create working days
    if (workingDays && Array.isArray(workingDays)) {
      for (const day of workingDays) {
        const workingDay = await prisma.workingDay.create({
          data: {
            operationalHoursId,
            dayOfWeek: day.dayOfWeek,
            isEnabled: day.isEnabled,
            scheduleType: day.scheduleType,
            customStartTime: day.customStartTime || null,
            customEndTime: day.customEndTime || null,
          },
        });

        // Create break hours for this working day
        if (day.breakHours && Array.isArray(day.breakHours)) {
          for (const breakHour of day.breakHours) {
            await prisma.breakHours.create({
              data: {
                workingDayId: workingDay.id,
                startTime: breakHour.startTime,
                endTime: breakHour.endTime,
              },
            });
          }
        }
      }
    }

    // Create exclusion rules
    if (exclusionRules && Array.isArray(exclusionRules)) {
      for (const rule of exclusionRules) {
        await prisma.exclusionRule.create({
          data: {
            operationalHoursId,
            excludeOn: rule.excludeOn,
            weekSelection: rule.weekSelection || null,
            monthSelection: rule.monthSelection,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Operational hours saved successfully',
    });
  } catch (error) {
    console.error('Error saving operational hours:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to save operational hours',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  // Use the same logic as POST for updates
  return POST(req);
}
