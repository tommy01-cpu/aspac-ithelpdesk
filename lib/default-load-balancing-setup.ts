import { prisma } from './prisma';

/**
 * UTILITY: Set up default load balancing for all templates
 * This will assign all templates without support groups to use load balancing
 */

interface DefaultLoadBalancingSetup {
  templatesUpdated: number;
  supportGroupsUsed: number;
  strategy: string;
  errors: string[];
}

/**
 * Assign all templates to use load balancing with a default support group
 */
export async function setupDefaultLoadBalancingForAllTemplates(
  defaultSupportGroupId?: number,
  defaultStrategy: string = 'least_load'
): Promise<DefaultLoadBalancingSetup> {
  const result: DefaultLoadBalancingSetup = {
    templatesUpdated: 0,
    supportGroupsUsed: 0,
    strategy: defaultStrategy,
    errors: []
  };

  try {
    console.log('🔧 Setting up default load balancing for all templates...');

    // Get all active templates
    const allTemplates = await prisma.template.findMany({
      where: { isActive: true },
      include: {
        supportGroups: true
      }
    });

    console.log(`📋 Found ${allTemplates.length} active templates`);

    // Get all active support groups
    const supportGroups = await prisma.supportGroup.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' }
    });

    if (supportGroups.length === 0) {
      throw new Error('No active support groups found. Please create support groups first.');
    }

    console.log(`👥 Found ${supportGroups.length} active support groups`);

    // Determine default support group
    const targetSupportGroup = defaultSupportGroupId 
      ? supportGroups.find(sg => sg.id === defaultSupportGroupId)
      : supportGroups[0]; // Use first support group as default

    if (!targetSupportGroup) {
      throw new Error(`Support group with ID ${defaultSupportGroupId} not found`);
    }

    console.log(`🎯 Using default support group: ${targetSupportGroup.name} (ID: ${targetSupportGroup.id})`);

    // Process each template
    for (const template of allTemplates) {
      try {
        // Check if template already has support group assignments
        if (template.supportGroups.length > 0) {
          console.log(`✅ Template "${template.name}" already has ${template.supportGroups.length} support group(s) assigned`);
          continue;
        }

        // Assign template to default support group with load balancing
        await prisma.templateSupportGroup.create({
          data: {
            templateId: template.id,
            supportGroupId: targetSupportGroup.id,
            loadBalanceType: defaultStrategy,
            priority: 1,
            isActive: true
          }
        });

        result.templatesUpdated++;
        console.log(`✅ Assigned template "${template.name}" to support group "${targetSupportGroup.name}" with ${defaultStrategy} strategy`);

      } catch (error) {
        const errorMsg = `Failed to assign template "${template.name}": ${error instanceof Error ? error.message : 'Unknown error'}`;
        result.errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    result.supportGroupsUsed = 1; // We used one default support group

    console.log(`✅ Setup complete: ${result.templatesUpdated} templates updated`);
    return result;

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(errorMsg);
    console.error(`❌ Setup failed: ${errorMsg}`);
    return result;
  }
}

/**
 * Distribute templates across all support groups with load balancing
 */
export async function distributeTemplatesAcrossSupportGroups(
  strategy: string = 'least_load'
): Promise<DefaultLoadBalancingSetup> {
  const result: DefaultLoadBalancingSetup = {
    templatesUpdated: 0,
    supportGroupsUsed: 0,
    strategy,
    errors: []
  };

  try {
    console.log('🔄 Distributing templates across all support groups...');

    // Get all active templates without assignments
    const templatesWithoutGroups = await prisma.template.findMany({
      where: { 
        isActive: true,
        supportGroups: {
          none: {}
        }
      }
    });

    // Get all active support groups
    const supportGroups = await prisma.supportGroup.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' }
    });

    if (supportGroups.length === 0) {
      throw new Error('No active support groups found');
    }

    if (templatesWithoutGroups.length === 0) {
      console.log('✅ All templates already have support group assignments');
      return result;
    }

    console.log(`📋 Found ${templatesWithoutGroups.length} templates without support groups`);
    console.log(`👥 Distributing across ${supportGroups.length} support groups`);

    // Distribute templates round-robin across support groups
    for (let i = 0; i < templatesWithoutGroups.length; i++) {
      const template = templatesWithoutGroups[i];
      const supportGroup = supportGroups[i % supportGroups.length];

      try {
        await prisma.templateSupportGroup.create({
          data: {
            templateId: template.id,
            supportGroupId: supportGroup.id,
            loadBalanceType: strategy,
            priority: 1,
            isActive: true
          }
        });

        result.templatesUpdated++;
        console.log(`✅ Assigned "${template.name}" → "${supportGroup.name}" (${strategy})`);

      } catch (error) {
        const errorMsg = `Failed to assign template "${template.name}": ${error instanceof Error ? error.message : 'Unknown error'}`;
        result.errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    result.supportGroupsUsed = supportGroups.length;

    console.log(`✅ Distribution complete: ${result.templatesUpdated} templates assigned across ${result.supportGroupsUsed} support groups`);
    return result;

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(errorMsg);
    console.error(`❌ Distribution failed: ${errorMsg}`);
    return result;
  }
}

/**
 * Update all existing template support groups to use a specific load balancing strategy
 */
export async function updateAllTemplatesToUseLoadBalancing(
  strategy: string = 'least_load'
): Promise<DefaultLoadBalancingSetup> {
  const result: DefaultLoadBalancingSetup = {
    templatesUpdated: 0,
    supportGroupsUsed: 0,
    strategy,
    errors: []
  };

  try {
    console.log(`🔧 Updating all template support groups to use ${strategy} strategy...`);

    // Update all template support group assignments to use the specified strategy
    const updateResult = await prisma.templateSupportGroup.updateMany({
      where: { isActive: true },
      data: { loadBalanceType: strategy }
    });

    result.templatesUpdated = updateResult.count;

    // Count unique support groups affected
    const affectedGroups = await prisma.templateSupportGroup.findMany({
      where: { isActive: true },
      select: { supportGroupId: true },
      distinct: ['supportGroupId']
    });

    result.supportGroupsUsed = affectedGroups.length;

    console.log(`✅ Updated ${result.templatesUpdated} template assignments to use ${strategy} strategy`);
    console.log(`📊 Affected ${result.supportGroupsUsed} support groups`);

    return result;

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(errorMsg);
    console.error(`❌ Update failed: ${errorMsg}`);
    return result;
  }
}
