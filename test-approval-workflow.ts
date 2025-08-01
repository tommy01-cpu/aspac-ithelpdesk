import { prisma } from './lib/prisma';

async function testApprovalWorkflow() {
  try {
    console.log('Testing approval workflow creation...');
    
    // Check if we have any templates with approval workflows
    const templates = await prisma.template.findMany({
      select: {
        id: true,
        name: true,
        approvalWorkflow: true,
      }
    });
    
    console.log('Found templates:', templates.length);
    
    // Find template with ID 1 and add a sample approval workflow
    const template = await prisma.template.findUnique({
      where: { id: 1 }
    });
    
    if (template) {
      console.log('Found template 1:', template.name);
      
      // Sample approval workflow configuration
      const sampleApprovalWorkflow = {
        approvalMode: 'all_must_approve', // or 'first_approval_action'
        approvalLevels: [
          {
            name: 'Level One',
            autoAssign: true,
            autoAssignType: 'system', // system auto-approval
            approvers: []
          },
          {
            name: 'Manager Approval',
            autoAssign: true,
            autoAssignType: 'reporting_manager', // automatic reporting manager
            approvers: []
          },
          {
            name: 'Department Head Approval',
            autoAssign: true,
            autoAssignType: 'department_head', // automatic department head
            approvers: []
          }
        ]
      };
      
      // Update template with approval workflow
      const updatedTemplate = await prisma.template.update({
        where: { id: 1 },
        data: {
          approvalWorkflow: sampleApprovalWorkflow
        }
      });
      
      console.log('✅ Updated template 1 with approval workflow');
      console.log('Approval workflow:', JSON.stringify(sampleApprovalWorkflow, null, 2));
    }
    
    // Check current requests
    const requests = await prisma.request.findMany({
      include: {
        approvals: true,
        history: true,
      }
    });
    
    console.log(`Found ${requests.length} requests in database`);
    requests.forEach(request => {
      console.log(`Request ${request.id}:`);
      console.log(`  - Approvals: ${request.approvals.length}`);
      console.log(`  - History entries: ${request.history.length}`);
    });
    
  } catch (error) {
    console.error('Error testing approval workflow:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testApprovalWorkflow();
