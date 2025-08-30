/**
 * SCRIPT: Setup default load balancing for all templates
 * Run this script to automatically configure load balancing for all templates
 */

import { 
  setupDefaultLoadBalancingForAllTemplates,
  distributeTemplatesAcrossSupportGroups,
  updateAllTemplatesToUseLoadBalancing
} from '../lib/default-load-balancing-setup';

async function runCompleteLoadBalancingSetup() {
  console.log('🚀 Starting complete load balancing setup...\n');

  try {
    // Step 1: Distribute templates without assignments across all support groups
    console.log('📋 Step 1: Distributing unassigned templates across support groups...');
    const distribution = await distributeTemplatesAcrossSupportGroups('least_load');
    
    console.log(`✅ Step 1 Results:`);
    console.log(`   - Templates assigned: ${distribution.templatesUpdated}`);
    console.log(`   - Support groups used: ${distribution.supportGroupsUsed}`);
    console.log(`   - Strategy: ${distribution.strategy}`);
    if (distribution.errors.length > 0) {
      console.log(`   - Errors: ${distribution.errors.length}`);
      distribution.errors.forEach((err: string) => console.log(`     • ${err}`));
    }
    console.log('');

    // Step 2: Update all existing assignments to use least_load strategy
    console.log('⚙️ Step 2: Updating all template assignments to use least_load strategy...');
    const strategyUpdate = await updateAllTemplatesToUseLoadBalancing('least_load');
    
    console.log(`✅ Step 2 Results:`);
    console.log(`   - Template assignments updated: ${strategyUpdate.templatesUpdated}`);
    console.log(`   - Support groups affected: ${strategyUpdate.supportGroupsUsed}`);
    console.log(`   - New strategy: ${strategyUpdate.strategy}`);
    if (strategyUpdate.errors.length > 0) {
      console.log(`   - Errors: ${strategyUpdate.errors.length}`);
      strategyUpdate.errors.forEach((err: string) => console.log(`     • ${err}`));
    }
    console.log('');

    // Summary
    console.log('🎉 COMPLETE SETUP FINISHED!');
    console.log('=====================================');
    console.log(`📊 Total Impact:`);
    console.log(`   - New template assignments: ${distribution.templatesUpdated}`);
    console.log(`   - Updated assignments: ${strategyUpdate.templatesUpdated}`);
    console.log(`   - Total templates affected: ${distribution.templatesUpdated + strategyUpdate.templatesUpdated}`);
    console.log(`   - Default strategy: least_load (auto-assigns to technician with lowest workload)`);
    console.log('');
    console.log('✅ All templates now use load balancing by default!');
    console.log('🔄 New requests will automatically assign to the technician with the lowest workload.');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    console.error('Please check the error above and try again.');
  }
}

// Run the setup
runCompleteLoadBalancingSetup()
  .then(() => {
    console.log('\n🏁 Setup script completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Setup script failed:', error);
    process.exit(1);
  });
