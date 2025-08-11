/**
 * Test Complete SLA and Auto-Assignment Workflow
 * This script creates a test request, sets up approvals, processes them, and verifies SLA calculation and auto-assignment
 */

import { PrismaClient, RequestStatus, ApprovalStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function testCompleteWorkflow() {
  console.log('🚀 Starting Complete Workflow Test...\n');

  try {
    // Step 1: Create a test user if not exists
    console.log('📝 Step 1: Setting up test user...');
    let testUser = await prisma.users.findFirst({
      where: { emp_email: 'test.requester@company.com' }
    });

    if (!testUser) {
      testUser = await prisma.users.create({
        data: {
          emp_email: 'test.requester@company.com',
          emp_fname: 'Test',
          emp_lname: 'Requester',
          emp_position: 'Developer',
          department: 'IT',
          password: 'test123'
        }
      });
      console.log('✅ Created test user:', testUser.emp_email);
    } else {
      console.log('✅ Using existing test user:', testUser.emp_email);
    }

    // Step 2: Create a test template with IT support group
    console.log('\n📝 Step 2: Setting up test template...');
    let testTemplate = await prisma.serviceTemplate.findFirst({
      where: { name: 'Test Workflow Template' }
    });

    if (!testTemplate) {
      // First create or find IT support group
      let itSupportGroup = await prisma.supportGroup.findFirst({
        where: { name: 'IT Support' }
      });

      if (!itSupportGroup) {
        itSupportGroup = await prisma.supportGroup.create({
          data: {
            name: 'IT Support',
            description: 'IT Support Team',
            loadBalanceType: 'round_robin'
          }
        });
        console.log('✅ Created IT Support Group');
      }

      testTemplate = await prisma.serviceTemplate.create({
        data: {
          name: 'Test Workflow Template',
          description: 'Template for testing SLA and auto-assignment',
          category: 'IT',
          priority: 'high',
          supportGroupId: itSupportGroup.id,
          formFields: JSON.stringify([
            { id: '1', label: 'Title', type: 'text', required: true },
            { id: '2', label: 'Description', type: 'textarea', required: true },
            { id: '3', label: 'Priority', type: 'select', options: ['high', 'medium', 'low'], required: true }
          ])
        }
      });
      console.log('✅ Created test template:', testTemplate.name);
    } else {
      console.log('✅ Using existing test template:', testTemplate.name);
    }

    // Step 3: Create test technicians
    console.log('\n📝 Step 3: Setting up test technicians...');
    const technicianData = [
      { email: 'tech1@company.com', fname: 'John', lname: 'Tech1' },
      { email: 'tech2@company.com', fname: 'Jane', lname: 'Tech2' },
      { email: 'tech3@company.com', fname: 'Bob', lname: 'Tech3' }
    ];

    for (const tech of technicianData) {
      let technician = await prisma.users.findFirst({
        where: { emp_email: tech.email }
      });

      if (!technician) {
        technician = await prisma.users.create({
          data: {
            emp_email: tech.email,
            emp_fname: tech.fname,
            emp_lname: tech.lname,
            emp_position: 'IT Technician',
            department: 'IT',
            password: 'tech123',
            role: 'technician'
          }
        });
        console.log(`✅ Created technician: ${technician.emp_fname} ${technician.emp_lname}`);
      }

      // Associate with support group
      const supportGroup = await prisma.supportGroup.findFirst({
        where: { name: 'IT Support' }
      });

      if (supportGroup) {
        const existing = await prisma.supportGroupMember.findFirst({
          where: {
            supportGroupId: supportGroup.id,
            userId: technician.id
          }
        });

        if (!existing) {
          await prisma.supportGroupMember.create({
            data: {
              supportGroupId: supportGroup.id,
              userId: technician.id
            }
          });
          console.log(`✅ Added ${technician.emp_fname} to IT Support group`);
        }
      }
    }

    // Step 4: Create test approvers
    console.log('\n📝 Step 4: Setting up test approvers...');
    const approverData = [
      { email: 'approver1@company.com', fname: 'Manager', lname: 'One' },
      { email: 'approver2@company.com', fname: 'Director', lname: 'Two' }
    ];

    const createdApprovers = [];
    for (const app of approverData) {
      let approver = await prisma.users.findFirst({
        where: { emp_email: app.email }
      });

      if (!approver) {
        approver = await prisma.users.create({
          data: {
            emp_email: app.email,
            emp_fname: app.fname,
            emp_lname: app.lname,
            emp_position: 'Manager',
            department: 'IT',
            password: 'manager123',
            role: 'manager'
          }
        });
        console.log(`✅ Created approver: ${approver.emp_fname} ${approver.emp_lname}`);
      }
      createdApprovers.push(approver);
    }

    // Step 5: Create a test request
    console.log('\n📝 Step 5: Creating test request...');
    const testRequest = await prisma.request.create({
      data: {
        userId: testUser.id,
        templateId: testTemplate.id.toString(),
        templateName: testTemplate.name,
        title: 'Test Request for SLA and Auto-Assignment',
        description: 'Testing the complete workflow',
        type: 'service_request',
        priority: 'high',
        status: RequestStatus.pending_approval,
        formData: {
          '1': 'Test Request for SLA and Auto-Assignment',
          '2': 'This is a test request to verify SLA calculation and auto-assignment workflow',
          '3': 'high'
        }
      }
    });
    console.log(`✅ Created test request #${testRequest.id}`);

    // Step 6: Create approval workflow
    console.log('\n📝 Step 6: Setting up approval workflow...');
    const approvals = [];
    for (let i = 0; i < createdApprovers.length; i++) {
      const approval = await prisma.requestApproval.create({
        data: {
          requestId: testRequest.id,
          approverId: createdApprovers[i].id,
          approverEmail: createdApprovers[i].emp_email,
          approverName: `${createdApprovers[i].emp_fname} ${createdApprovers[i].emp_lname}`,
          level: i + 1,
          status: i === 0 ? ApprovalStatus.pending_approval : ApprovalStatus.awaiting_activation,
          sentOn: i === 0 ? new Date() : null
        }
      });
      approvals.push(approval);
      console.log(`✅ Created level ${approval.level} approval for ${approval.approverName}`);
    }

    // Step 7: Process approvals to trigger SLA and auto-assignment
    console.log('\n📝 Step 7: Processing approvals...');
    
    for (let i = 0; i < approvals.length; i++) {
      console.log(`\n⏳ Processing approval level ${i + 1}...`);
      
      // Simulate approval action
      const response = await fetch('http://localhost:3000/api/approvals/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approvalId: approvals[i].id,
          action: 'approve',
          comments: `Approved by ${approvals[i].approverName} - Test Workflow`
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Approval level ${i + 1} processed successfully`);
        console.log(`   Result: ${result.message}`);
      } else {
        const error = await response.text();
        console.error(`❌ Failed to process approval: ${error}`);
        throw new Error(`Approval processing failed: ${error}`);
      }

      // Wait a bit between approvals
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Step 8: Verify final results
    console.log('\n📝 Step 8: Verifying results...');
    
    // Check final request status
    const finalRequest = await prisma.request.findUnique({
      where: { id: testRequest.id },
      include: {
        user: true
      }
    });

    console.log(`\n📊 Final Request Status: ${finalRequest?.status}`);
    console.log(`📊 Request Priority: ${finalRequest?.priority}`);
    
    if (finalRequest?.formData) {
      const formData = finalRequest.formData as any;
      console.log(`📊 SLA Due Date: ${formData.slaDueDate || 'Not set'}`);
      console.log(`📊 SLA Hours: ${formData.slaHours || 'Not set'}`);
      console.log(`📊 Assigned Technician: ${formData.assignedTechnicianName || 'Not assigned'}`);
      console.log(`📊 Technician Email: ${formData.assignedTechnicianEmail || 'Not set'}`);
      console.log(`📊 Support Group: ${formData.supportGroupName || 'Not set'}`);
      console.log(`📊 Load Balance Method: ${formData.loadBalanceType || 'Not set'}`);
    }

    // Check request history
    const history = await prisma.requestHistory.findMany({
      where: { requestId: testRequest.id },
      orderBy: { timestamp: 'asc' }
    });

    console.log(`\n📋 Request History (${history.length} entries):`);
    history.forEach((entry, index) => {
      console.log(`   ${index + 1}. ${entry.action} by ${entry.actorName} (${entry.actorType})`);
      console.log(`      ${entry.details}`);
      console.log(`      Time: ${entry.timestamp.toLocaleString()}`);
    });

    console.log('\n🎉 Complete Workflow Test Completed Successfully!');
    console.log('\n🔗 You can now view the request in the approval interface at:');
    console.log(`   http://localhost:3000/users/approvals/${testRequest.id}`);

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testCompleteWorkflow().catch(console.error);
