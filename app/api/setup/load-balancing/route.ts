import { NextRequest, NextResponse } from 'next/server';
import { 
  setupDefaultLoadBalancingForAllTemplates,
  distributeTemplatesAcrossSupportGroups,
  updateAllTemplatesToUseLoadBalancing
} from '@/lib/default-load-balancing-setup';
import { prisma } from '@/lib/prisma';

/**
 * API to setup default load balancing for all templates
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, supportGroupId, strategy = 'least_load' } = body;

    console.log(`🔧 Setting up default load balancing: ${action}`);

    switch (action) {
      case 'setup-default-group':
        // Assign all templates without support groups to a default group
        const setupResult = await setupDefaultLoadBalancingForAllTemplates(supportGroupId, strategy);
        
        return NextResponse.json({
          success: true,
          action: 'Setup Default Group',
          result: setupResult,
          message: `Successfully assigned ${setupResult.templatesUpdated} templates to default load balancing`
        });

      case 'distribute-all':
        // Distribute templates across all support groups
        const distributeResult = await distributeTemplatesAcrossSupportGroups(strategy);
        
        return NextResponse.json({
          success: true,
          action: 'Distribute All Templates',
          result: distributeResult,
          message: `Successfully distributed ${distributeResult.templatesUpdated} templates across ${distributeResult.supportGroupsUsed} support groups`
        });

      case 'update-strategy':
        // Update all existing assignments to use specific strategy
        const updateResult = await updateAllTemplatesToUseLoadBalancing(strategy);
        
        return NextResponse.json({
          success: true,
          action: 'Update Strategy',
          result: updateResult,
          message: `Successfully updated ${updateResult.templatesUpdated} template assignments to use ${strategy} strategy`
        });

      case 'setup-complete':
        // Complete setup: distribute + update strategy
        console.log('🚀 Running complete load balancing setup...');
        
        // Step 1: Distribute templates without assignments
        const step1 = await distributeTemplatesAcrossSupportGroups(strategy);
        
        // Step 2: Update all to use the same strategy
        const step2 = await updateAllTemplatesToUseLoadBalancing(strategy);
        
        return NextResponse.json({
          success: true,
          action: 'Complete Setup',
          result: {
            distribution: step1,
            strategyUpdate: step2,
            totalTemplatesAffected: step1.templatesUpdated + step2.templatesUpdated,
            strategy: strategy
          },
          message: `Complete setup finished: ${step1.templatesUpdated} new assignments + ${step2.templatesUpdated} strategy updates`
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action',
          availableActions: [
            'setup-default-group',
            'distribute-all',
            'update-strategy',
            'setup-complete'
          ]
        }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Load balancing setup failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Load balancing setup failed'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Show current status and available setup options
    const templates = await prisma.template.findMany({
      where: { isActive: true },
      include: {
        supportGroups: {
          include: {
            supportGroup: true
          }
        }
      }
    });

    const supportGroups = await prisma.supportGroup.findMany({
      where: { isActive: true }
    });

    const templatesWithAssignments = templates.filter(t => t.supportGroups.length > 0);
    const templatesWithoutAssignments = templates.filter(t => t.supportGroups.length === 0);

    // Analyze current strategies
    const strategyStats: Record<string, number> = {};
    templates.forEach(template => {
      template.supportGroups.forEach(sg => {
        strategyStats[sg.loadBalanceType] = (strategyStats[sg.loadBalanceType] || 0) + 1;
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Load balancing setup status',
      data: {
        timestamp: new Date().toISOString(),
        summary: {
          totalTemplates: templates.length,
          templatesWithAssignments: templatesWithAssignments.length,
          templatesWithoutAssignments: templatesWithoutAssignments.length,
          supportGroups: supportGroups.length,
          strategiesInUse: Object.keys(strategyStats),
          strategyDistribution: strategyStats
        },
        templatesWithoutAssignments: templatesWithoutAssignments.map(t => ({
          id: t.id,
          name: t.name
        })),
        supportGroups: supportGroups.map(sg => ({
          id: sg.id,
          name: sg.name,
          isActive: sg.isActive
        })),
        setupOptions: {
          'setup-default-group': 'Assign all unassigned templates to one default support group',
          'distribute-all': 'Distribute unassigned templates across all support groups',
          'update-strategy': 'Update all existing assignments to use a specific strategy',
          'setup-complete': 'Complete setup: distribute + update strategy (RECOMMENDED)'
        },
        availableStrategies: [
          'least_load',
          'round_robin', 
          'random',
          'load_balancing' // alias for least_load
        ]
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
