import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Priority mapping to enum values
const PRIORITY_MAPPING: Record<string, string> = {
  'low': 'Low',
  'medium': 'Medium', 
  'high': 'High',
  'critical': 'Top',
  'top': 'Top'
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const priority = searchParams.get('priority');

    if (!priority) {
      return NextResponse.json(
        { error: 'Priority parameter is required' },
        { status: 400 }
      );
    }

    // Map incoming priority to enum value
    const mappedPriority = PRIORITY_MAPPING[priority.toLowerCase()];
    if (!mappedPriority) {
      return NextResponse.json(
        { error: 'Invalid priority value' },
        { status: 400 }
      );
    }

    const slaIncident = await prisma.sLAIncident.findFirst({
      where: {
        priority: mappedPriority as any,
        status: 'active'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (slaIncident) {
      return NextResponse.json({
        success: true,
        data: slaIncident
      });
    } else {
      // Return default SLA configuration for the priority
      const getDefaultResponseTime = (priority: string) => {
        const defaults: Record<string, number> = {
          'low': 24,
          'medium': 8, 
          'high': 4,
          'critical': 1,
          'top': 1
        };
        return defaults[priority] || 8;
      };

      const getDefaultResolutionTime = (priority: string) => {
        const defaults: Record<string, number> = {
          'low': 72,
          'medium': 24,
          'high': 8, 
          'critical': 4,
          'top': 2
        };
        return defaults[priority] || 24;
      };

      const getDefaultResolutionDays = (priority: string) => {
        const defaults: Record<string, number> = {
          'low': 3,
          'medium': 1,
          'high': 1,
          'critical': 1, 
          'top': 1
        };
        return defaults[priority] || 1;
      };

      return NextResponse.json({
        success: true,
        data: {
          id: `default-${priority}`,
          name: `Default SLA - ${priority.charAt(0).toUpperCase() + priority.slice(1)} Priority`,
          description: `Default SLA for ${priority} priority incidents`,
          priority: priority,
          responseHours: getDefaultResponseTime(priority),
          responseMinutes: 0,
          resolutionHours: getDefaultResolutionTime(priority),
          resolutionMinutes: 0,
          resolutionDays: getDefaultResolutionDays(priority),
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });
    }
  } catch (error) {
    console.error('Error fetching SLA incident by priority:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
