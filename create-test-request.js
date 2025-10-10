const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestRequest() {
  try {
    console.log('🧪 Creating test request to verify backup approver logic...\n');
    
    // Create a simple test request
    const testRequest = await prisma.request.create({
      data: {
        templateId: '11', // Test Service Template
        userId: 1, // Jose Tommy Mandapat
        formData: {
          test: 'This is a test request to verify backup approver functionality'
        },
        attachments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'for_approval'
      }
    });
    
    console.log(`✅ Created test request ${testRequest.id}`);
    
    // Now manually create an approval with an approver who has a backup (Floi Neri - ID 4)
    console.log('\n📝 Creating approval for Floi Neri (ID 4) who has backup to Jose Tommy Mandapat...');
    
    // Simulate what our backup logic should do
    const originalApprovalData = {
      level: 1,
      name: 'Level 1 Approval',
      approverId: 4, // Floi Neri
      approverName: 'Floi Neri',
      approverEmail: 'plukjosetommymandapatjr@gmail.com',
      sentOn: new Date(),
      createdAt: new Date(),
      status: 'pending_approval'
    };
    
    // Check for backup
    const backupConfig = await prisma.backup_approvers.findFirst({
      where: {
        original_approver_id: 4,
        is_active: true,
        start_date: { lte: new Date() },
        end_date: { gte: new Date() }
      },
      include: {
        original_approver: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true,
            emp_email: true
          }
        },
        backup_approver: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true,
            emp_email: true
          }
        }
      }
    });
    
    if (backupConfig) {
      console.log(`✅ Backup found: ${backupConfig.original_approver.emp_fname} ${backupConfig.original_approver.emp_lname} → ${backupConfig.backup_approver.emp_fname} ${backupConfig.backup_approver.emp_lname}`);
      
      // Create approval with backup approver
      const finalApprovalData = {
        ...originalApprovalData,
        approverId: backupConfig.backup_approver.id,
        approverName: `${backupConfig.backup_approver.emp_fname} ${backupConfig.backup_approver.emp_lname}`,
        approverEmail: backupConfig.backup_approver.emp_email
      };
      
      const createdApproval = await prisma.requestApproval.create({
        data: {
          requestId: testRequest.id,
          ...finalApprovalData,
        },
      });
      
      console.log(`✅ Created approval ${createdApproval.id} for backup approver`);
      
      // Add history entry
      await prisma.requestHistory.create({
        data: {
          requestId: testRequest.id,
          action: 'Approval Redirected',
          actorName: 'System',
          actorType: 'system',
          details: `Level ${originalApprovalData.level} approval redirected from ${backupConfig.original_approver.emp_fname} ${backupConfig.original_approver.emp_lname} to backup approver ${backupConfig.backup_approver.emp_fname} ${backupConfig.backup_approver.emp_lname}`,
          timestamp: new Date()
        }
      });
      
      console.log(`✅ Added backup redirect history entry`);
      
      // Create diversion record
      await prisma.approval_diversions.create({
        data: {
          request_id: testRequest.id,
          original_approver_id: originalApprovalData.approverId,
          backup_approver_id: backupConfig.backup_approver.id,
          backup_config_id: backupConfig.id,
          diversion_type: 'automatic',
          diverted_at: new Date()
        }
      });
      
      console.log(`✅ Created diversion record`);
      
      // Add standard "Approvals Initiated" history entry
      await prisma.requestHistory.create({
        data: {
          requestId: testRequest.id,
          action: 'Approvals Initiated',
          actorName: 'System',
          actorType: 'system',
          details: `Approval request sent to ${finalApprovalData.approverName} (redirected from ${originalApprovalData.approverName})`,
          timestamp: new Date()
        }
      });
      
      console.log(`✅ Added Approvals Initiated history entry`);
      
    } else {
      console.log(`❌ No backup configuration found for approver ID 4`);
    }
    
    console.log(`\n🎯 Test request created: ${testRequest.id}`);
    console.log(`📱 You can view it at: http://localhost:3000/requests/view/${testRequest.id}`);
    
    // Show the history for this request
    const history = await prisma.requestHistory.findMany({
      where: { requestId: testRequest.id },
      orderBy: { timestamp: 'desc' }
    });
    
    console.log(`\n📜 Request history (${history.length} entries):`);
    history.forEach(entry => {
      console.log(`  - ${entry.action}: ${entry.details}`);
      console.log(`    By: ${entry.actorName} at ${entry.timestamp}`);
    });
    
  } catch (error) {
    console.error('❌ Error creating test request:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestRequest();