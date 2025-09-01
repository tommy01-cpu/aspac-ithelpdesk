import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    console.log('=== DEBUGGING DATA CHECK ===');
    
    // 1. Check pending approvals
    const pendingApprovals = await prisma.requestApproval.findMany({
      where: {
        status: 'pending_approval'
      },
      include: {
        request: {
          select: {
            id: true,
            templateId: true,
            formData: true,
            createdAt: true,
            status: true
          }
        },
        approver: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true,
            emp_email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`Found ${pendingApprovals.length} pending approvals`);

    // 2. Check holidays (especially around August 21, 2025)
    const holidays = await prisma.holiday.findMany({
      where: {
        date: {
          gte: new Date('2025-08-01'),
          lte: new Date('2025-09-30')
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    console.log(`Found ${holidays.length} holidays between Aug-Sep 2025`);

    // 3. Check all holidays to see what's in the system
    const allHolidays = await prisma.holiday.findMany({
      orderBy: {
        date: 'desc'
      },
      take: 20 // Last 20 holidays
    });

    console.log(`Total holidays in system: ${allHolidays.length} (showing last 20)`);

    // 4. Check specific date August 21, 2025
    const aug21Holiday = await prisma.holiday.findFirst({
      where: {
        date: new Date('2025-08-21')
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        pendingApprovals: {
          count: pendingApprovals.length,
          approvals: pendingApprovals.map(approval => ({
            id: approval.id,
            requestId: approval.request.id,
            templateId: approval.request.templateId,
            formData: approval.request.formData,
            level: approval.level,
            approverName: approval.approverName,
            approverEmail: approval.approverEmail,
            sentOn: approval.sentOn,
            createdAt: approval.createdAt,
            status: approval.status,
            requestStatus: approval.request.status
          }))
        },
        holidays: {
          august21Holiday: aug21Holiday,
          augustSeptemberHolidays: holidays,
          recentHolidays: allHolidays.slice(0, 10)
        },
        currentDate: new Date().toISOString(),
        debugInfo: {
          pendingApprovalCount: pendingApprovals.length,
          holidayCount: holidays.length,
          aug21Exists: !!aug21Holiday
        }
      }
    });

  } catch (error) {
    console.error('Error checking data:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
