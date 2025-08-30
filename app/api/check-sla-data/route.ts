import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Find recent requests with SLA data
    const recentRequests = await prisma.request.findMany({
      where: {
        status: 'open',
        createdAt: {
          gte: new Date('2025-08-29') // Recent requests from yesterday
        }
      },
      select: {
        id: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
        formData: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    const slaAnalysis = recentRequests.map(req => {
      const formData = req.formData as any || {};
      return {
        id: req.id,
        priority: req.priority,
        createdAt: req.createdAt.toISOString(),
        updatedAt: req.updatedAt.toISOString(),
        slaData: {
          slaHours: formData.slaHours,
          slaStartAt: formData.slaStartAt,
          slaDueDate: formData.slaDueDate,
          slaCalculatedAt: formData.slaCalculatedAt,
          slaSource: formData.slaSource
        },
        hasSlaData: !!(formData.slaHours || formData.slaDueDate),
        dueDateAnalysis: formData.slaDueDate ? {
          raw: formData.slaDueDate,
          includesTime: formData.slaDueDate.includes(':'),
          timeComponent: formData.slaDueDate.includes(':') ? formData.slaDueDate.split(' ')[1] : null,
          is12PM: formData.slaDueDate.includes('12:00:00')
        } : null
      };
    });

    return NextResponse.json({
      recentRequestsCount: recentRequests.length,
      requestsWithSLA: slaAnalysis.filter(r => r.hasSlaData).length,
      requestsWith12PM: slaAnalysis.filter(r => r.dueDateAnalysis?.is12PM).length,
      analysis: slaAnalysis,
      success: true
    });

  } catch (error) {
    console.error('Error checking SLA data:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check SLA data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
