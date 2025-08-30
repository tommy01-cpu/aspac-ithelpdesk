import { NextRequest, NextResponse } from 'next/server';
import { 
  autoAssignTechnician,
  getSupportGroupTechnicians,
  getTechnicianWorkload,
  getGlobalLoadBalancingConfig
} from '@/lib/load-balancer';
import { prisma } from '@/lib/prisma';

/**
 * API to test and check load balancing functionality
 */

export async function GET() {
  try {
    console.log('🔄 Checking load balancing system status...');

    // Check if there are support groups
    const supportGroups = await prisma.supportGroup.findMany({
      where: { isActive: true },
      include: {
        technicianMemberships: {
          include: {
            technician: {
              include: {
                user: {
                  select: {
                    id: true,
                    emp_fname: true,
                    emp_lname: true,
                    emp_email: true
                  }
                }
              }
            }
          }
        },
        globalLoadBalanceConfig: true
      }
    });

    // Check global load balancing config
    const globalConfig = await getGlobalLoadBalancingConfig();

    // Check templates with support group assignments
    const templatesWithGroups = await prisma.template.findMany({
      where: { isActive: true },
      include: {
        supportGroups: {
          include: {
            supportGroup: true
          }
        }
      },
      take: 5 // Just first 5 for testing
    });

    // Get technician workloads (if any technicians exist)
    const technicians = await prisma.technician.findMany({
      where: { isActive: true },
      include: {
        user: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true
          }
        }
      },
      take: 5
    });

    const technicianWorkloads = [];
    for (const tech of technicians) {
      try {
        const workload = await getTechnicianWorkload(tech.id);
        technicianWorkloads.push({
          technician: `${tech.user.emp_fname} ${tech.user.emp_lname}`,
          workload
        });
      } catch (error) {
        console.warn(`Failed to get workload for technician ${tech.id}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Load balancing system status',
      data: {
        timestamp: new Date().toISOString(),
        summary: {
          activeSupportGroups: supportGroups.length,
          activeTechnicians: technicians.length,
          templatesWithAssignments: templatesWithGroups.length,
          globalConfigEntries: globalConfig.length
        },
        supportGroups: supportGroups.map(group => ({
          id: group.id,
          name: group.name,
          isActive: group.isActive,
          technicianCount: group.technicianMemberships.length,
          technicians: group.technicianMemberships.map(tm => ({
            id: tm.technician.id,
            name: `${tm.technician.user.emp_fname} ${tm.technician.user.emp_lname}`,
            email: tm.technician.user.emp_email,
            isActive: tm.technician.isActive
          })),
          loadBalanceConfig: group.globalLoadBalanceConfig ? {
            type: group.globalLoadBalanceConfig.loadBalanceType,
            isActive: group.globalLoadBalanceConfig.isActive,
            priority: group.globalLoadBalanceConfig.priority
          } : null
        })),
        technicianWorkloads,
        globalConfig,
        templatesWithGroups: templatesWithGroups.map(template => ({
          id: template.id,
          name: template.name,
          supportGroups: template.supportGroups.map(tsg => ({
            id: tsg.supportGroupId,
            name: tsg.supportGroup.name,
            loadBalanceType: tsg.loadBalanceType,
            priority: tsg.priority,
            isActive: tsg.isActive
          }))
        }))
      }
    });

  } catch (error) {
    console.error('❌ Load balancing check failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to check load balancing system'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, templateId, supportGroupId } = body;

    console.log(`🧪 Testing load balancing action: ${action}`);

    switch (action) {
      case 'test-assignment':
        if (!templateId) {
          return NextResponse.json({
            success: false,
            error: 'templateId is required for test assignment'
          }, { status: 400 });
        }

        const assignmentResult = await autoAssignTechnician(templateId);
        
        return NextResponse.json({
          success: true,
          action: 'Test Assignment',
          result: assignmentResult,
          message: assignmentResult ? 
            `Successfully assigned to ${assignmentResult.assignedTechnician.name}` : 
            'No technician could be assigned'
        });

      case 'check-group-technicians':
        if (!supportGroupId) {
          return NextResponse.json({
            success: false,
            error: 'supportGroupId is required'
          }, { status: 400 });
        }

        const groupTechnicians = await getSupportGroupTechnicians(supportGroupId);
        
        return NextResponse.json({
          success: true,
          action: 'Check Group Technicians',
          result: groupTechnicians,
          message: `Found ${groupTechnicians.length} technicians in support group`
        });

      case 'get-workloads':
        const allTechnicians = await prisma.technician.findMany({
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                emp_fname: true,
                emp_lname: true
              }
            }
          }
        });

        const allWorkloads = [];
        for (const tech of allTechnicians) {
          try {
            const workload = await getTechnicianWorkload(tech.id);
            allWorkloads.push({
              technicianId: tech.id,
              name: `${tech.user.emp_fname} ${tech.user.emp_lname}`,
              workload
            });
          } catch (error) {
            allWorkloads.push({
              technicianId: tech.id,
              name: `${tech.user.emp_fname} ${tech.user.emp_lname}`,
              error: 'Failed to get workload'
            });
          }
        }

        return NextResponse.json({
          success: true,
          action: 'Get All Workloads',
          result: allWorkloads,
          message: `Retrieved workloads for ${allWorkloads.length} technicians`
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action',
          availableActions: [
            'test-assignment',
            'check-group-technicians',
            'get-workloads'
          ]
        }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Load balancing test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Load balancing test failed'
    }, { status: 500 });
  }
}
