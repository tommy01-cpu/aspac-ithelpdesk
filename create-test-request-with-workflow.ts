import { prisma } from './lib/prisma';
import { ApprovalStatus } from '@prisma/client';

async function createTestRequest() {
  try {
    console.log('Creating test request to verify approval workflow...');
    
    // Simulate creating a new request like the API would
    const templateId = 1; // Use template 1 which now has approval workflow
    const userId = 1; // JOSE TOMMY MANDAPAT
    
    // Fetch template to get approval workflow configuration
    const template = await prisma.template.findUnique({
      where: { id: templateId },
      select: {
        id: true,
        name: true,
        approvalWorkflow: true,
      }
    });

    if (!template) {
      console.log('❌ Template not found');
      return;
    }

    console.log('✅ Template found:', template.name);
    console.log('Approval workflow configured:', !!template.approvalWorkflow);

    // Fetch user details for automatic approver assignment
    const requestUser = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        emp_fname: true,
        emp_lname: true,
        emp_email: true,
        department: true,
        reportingToId: true,
        departmentHeadId: true,
        reportingTo: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true,
            emp_email: true,
          }
        },
        departmentHead: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true,
            emp_email: true,
          }
        }
      }
    });

    if (!requestUser) {
      console.log('❌ User not found');
      return;
    }

    console.log('✅ User found:', `${requestUser.emp_fname} ${requestUser.emp_lname}`);
    console.log('  - Reporting To:', requestUser.reportingTo ? `${requestUser.reportingTo.emp_fname} ${requestUser.reportingTo.emp_lname}` : 'None');
    console.log('  - Department Head:', requestUser.departmentHead ? `${requestUser.departmentHead.emp_fname} ${requestUser.departmentHead.emp_lname}` : 'None');

    // Create the request
    const newRequest = await prisma.request.create({
      data: {
        templateId: String(templateId),
        templateName: template.name,
        type: 'service',
        status: 'for_approval',
        priority: 'medium',
        userId: userId,
        formData: {
          description: 'Test request for approval workflow testing',
          category: 'IT Support',
          urgency: 'normal'
        },
        attachments: [],
      },
    });

    console.log('✅ Request created with ID:', newRequest.id);

    // Create approval workflow based on template configuration
    if (template.approvalWorkflow && requestUser) {
      const approvalConfig = template.approvalWorkflow as any;
      console.log('📋 Creating approval workflow...');
      
      // Check if template has approval levels configured
      if (approvalConfig.approvalLevels && Array.isArray(approvalConfig.approvalLevels)) {
        const approvalLevels = approvalConfig.approvalLevels;
        const approvalMode = approvalConfig.approvalMode || 'all_must_approve';
        
        console.log(`   - Mode: ${approvalMode}`);
        console.log(`   - Levels: ${approvalLevels.length}`);
        
        // Create approval records for each level
        for (let i = 0; i < approvalLevels.length; i++) {
          const level = approvalLevels[i];
          const levelNumber = i + 1;
          
          // Determine approver based on level configuration
          let approverId = null;
          let approverName = 'System';
          let approverEmail = null;
          let isAutoApproval = false;
          
          // Handle automatic approver assignment
          if (level.autoAssign) {
            if (level.autoAssignType === 'reporting_manager' && requestUser.reportingTo) {
              approverId = requestUser.reportingTo.id;
              approverName = `${requestUser.reportingTo.emp_fname} ${requestUser.reportingTo.emp_lname}`;
              approverEmail = requestUser.reportingTo.emp_email;
            } else if (level.autoAssignType === 'department_head' && requestUser.departmentHead) {
              approverId = requestUser.departmentHead.id;
              approverName = `${requestUser.departmentHead.emp_fname} ${requestUser.departmentHead.emp_lname}`;
              approverEmail = requestUser.departmentHead.emp_email;
            } else if (level.autoAssignType === 'system') {
              isAutoApproval = true;
              approverName = 'System Auto-Approval';
            }
          }
          
          // Determine status based on level and approval mode
          let status: ApprovalStatus = 'pending_approval';
          if (levelNumber === 1) {
            if (isAutoApproval) {
              status = 'approved';
            } else {
              status = 'pending_approval';
            }
          }
          
          // Create approval record
          const approval = await prisma.requestApproval.create({
            data: {
              requestId: newRequest.id,
              level: levelNumber,
              name: level.name || `Level ${levelNumber}`,
              status: status,
              approverId: approverId,
              approverName: approverName,
              approverEmail: approverEmail,
              isAutoApproval: isAutoApproval,
              sentOn: status === 'pending_approval' ? new Date() : null,
              actedOn: status === 'approved' ? new Date() : null,
              comments: isAutoApproval ? 'Auto-approved by system' : null,
            }
          });
          
          console.log(`   ✅ Level ${levelNumber}: ${level.name} - ${approverName} (${status})`);
        }
        
        // Create initial history entry
        await prisma.requestHistory.create({
          data: {
            requestId: newRequest.id,
            action: 'Request Created',
            details: `Request created by ${requestUser.emp_fname} ${requestUser.emp_lname}`,
            actorId: requestUser.id,
            actorName: `${requestUser.emp_fname} ${requestUser.emp_lname}`,
            actorType: 'user',
          }
        });
        
        // Create approval workflow started history entry
        await prisma.requestHistory.create({
          data: {
            requestId: newRequest.id,
            action: 'Approval Workflow Started',
            details: `${approvalLevels.length} approval level(s) configured`,
            actorId: null,
            actorName: 'System',
            actorType: 'system',
          }
        });
        
        console.log('✅ Approval workflow and history created successfully!');
        
        // Verify the creation
        const createdApprovals = await prisma.requestApproval.findMany({
          where: { requestId: newRequest.id },
          orderBy: { level: 'asc' }
        });
        
        const createdHistory = await prisma.requestHistory.findMany({
          where: { requestId: newRequest.id },
          orderBy: { timestamp: 'asc' }
        });
        
        console.log(`\n📊 Verification:`);
        console.log(`   - Approvals created: ${createdApprovals.length}`);
        console.log(`   - History entries created: ${createdHistory.length}`);
        
        console.log('\n🔍 Approval Details:');
        createdApprovals.forEach(approval => {
          console.log(`   Level ${approval.level}: ${approval.name} - ${approval.approverName} (${approval.status})`);
        });
        
        console.log('\n📜 History Details:');
        createdHistory.forEach(entry => {
          console.log(`   ${entry.action} by ${entry.actorName} (${entry.actorType})`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error creating test request:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestRequest();
