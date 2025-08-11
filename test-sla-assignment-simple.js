/**
 * Simple Test for SLA and Auto-Assignment Workflow
 * This script tests the SLA calculation and auto-assignment APIs directly
 */

// Test SLA and auto-assignment API directly
async function testSLAAndAssignmentAPI() {
  console.log('🚀 Testing SLA and Auto-Assignment API...\n');

  try {
    // Step 1: Find an existing request to test with
    console.log('📝 Step 1: Looking for existing requests...');
    
    const requestsResponse = await fetch('http://localhost:3000/api/requests');
    if (!requestsResponse.ok) {
      throw new Error('Failed to fetch requests');
    }
    
    const requests = await requestsResponse.json();
    console.log(`✅ Found ${requests.length} existing requests`);
    
    if (requests.length === 0) {
      console.log('No existing requests found. Creating a test request first...');
      return;
    }

    // Use the first request
    const testRequest = requests[0];
    console.log(`✅ Using request #${testRequest.id} for testing`);

    // Step 2: Test SLA calculation and assignment
    console.log('\n📝 Step 2: Testing SLA and assignment API...');
    
    const slaResponse = await fetch(`http://localhost:3000/api/requests/${testRequest.id}/sla-assignment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requestId: testRequest.id,
        templateId: testRequest.templateId
      })
    });

    if (slaResponse.ok) {
      const slaResult = await slaResponse.json();
      console.log('✅ SLA and assignment API test successful!');
      console.log('\n📊 Results:', JSON.stringify(slaResult, null, 2));
      
      // Display the results nicely
      if (slaResult.results?.sla) {
        console.log('\n🎯 SLA Calculation:');
        console.log(`   Priority: ${slaResult.results.sla.priority}`);
        console.log(`   SLA Hours: ${slaResult.results.sla.slaHours}`);
        console.log(`   Due Date: ${slaResult.results.sla.dueDate}`);
      }
      
      if (slaResult.results?.assignment) {
        console.log('\n👤 Technician Assignment:');
        console.log(`   Success: ${slaResult.results.assignment.success}`);
        if (slaResult.results.assignment.technician) {
          console.log(`   Technician: ${slaResult.results.assignment.technician.name}`);
          console.log(`   Email: ${slaResult.results.assignment.technician.email}`);
          console.log(`   Support Group: ${slaResult.results.assignment.technician.supportGroup}`);
          console.log(`   Load Balance Type: ${slaResult.results.assignment.technician.loadBalanceType}`);
          console.log(`   Already Assigned: ${slaResult.results.assignment.technician.alreadyAssigned}`);
        }
        if (slaResult.results.assignment.message) {
          console.log(`   Message: ${slaResult.results.assignment.message}`);
        }
      }
      
    } else {
      const errorText = await slaResponse.text();
      console.error('❌ SLA and assignment API test failed:', errorText);
    }

    // Step 3: Check the updated request
    console.log('\n📝 Step 3: Checking updated request data...');
    
    const updatedRequestResponse = await fetch(`http://localhost:3000/api/requests/${testRequest.id}`);
    if (updatedRequestResponse.ok) {
      const updatedRequest = await updatedRequestResponse.json();
      console.log('\n📊 Updated Request FormData:');
      
      const formData = updatedRequest.formData || {};
      console.log(`   SLA Due Date: ${formData.slaDueDate || 'Not set'}`);
      console.log(`   SLA Hours: ${formData.slaHours || 'Not set'}`);
      console.log(`   Assigned Technician: ${formData.assignedTechnicianName || 'Not assigned'}`);
      console.log(`   Technician Email: ${formData.assignedTechnicianEmail || 'Not set'}`);
      console.log(`   Support Group: ${formData.supportGroupName || 'Not set'}`);
      console.log(`   Load Balance Method: ${formData.loadBalanceType || 'Not set'}`);
    }

    console.log('\n🎉 SLA and Assignment Test Completed!');
    console.log(`\n🔗 View the request at: http://localhost:3000/users/approvals/${testRequest.id}`);

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

// Run the test
testSLAAndAssignmentAPI().catch(console.error);
