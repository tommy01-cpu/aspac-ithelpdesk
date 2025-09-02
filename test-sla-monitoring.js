// Test script for SLA monitoring service
const { safeSLAMonitoringService } = require('./lib/safe-sla-monitoring-service.ts');

async function testSLAMonitoring() {
  console.log('🧪 Testing SLA Monitoring Service...\n');

  try {
    // Test 1: Basic status check
    console.log('1. Testing basic status check...');
    const basicStatus = safeSLAMonitoringService.getStatus();
    console.log('Basic Status:', JSON.stringify(basicStatus, null, 2));

    // Test 2: Health check
    console.log('\n2. Testing health check...');
    const healthCheck = await safeSLAMonitoringService.getHealthCheck();
    console.log('Health Check:', JSON.stringify(healthCheck, null, 2));

    // Test 3: Manual SLA trigger
    console.log('\n3. Testing manual SLA trigger...');
    const slaResult = await safeSLAMonitoringService.manualTriggerSLA();
    console.log('SLA Trigger Result:', JSON.stringify(slaResult, null, 2));

    // Test 4: Manual auto-close trigger
    console.log('\n4. Testing manual auto-close trigger...');
    const autoCloseResult = await safeSLAMonitoringService.manualTriggerAutoClose();
    console.log('Auto-Close Result:', JSON.stringify(autoCloseResult, null, 2));

    console.log('\n✅ All tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testSLAMonitoring();
