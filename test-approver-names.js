// Test script to check if approver names are being saved in the database
const { PrismaClient } = require('@prisma/client');

async function testApproverNames() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking recent request approvals for approver names...');
    
    // Get the most recent request with approvals
    const recentRequest = await prisma.request.findFirst({
      orderBy: { id: 'desc' },
      include: {
        approvals: {
          select: {
            id: true,
            level: true,
            name: true,
            approverId: true,
            approverName: true,
            approverEmail: true,
            status: true,
            approver: {
              select: {
                emp_fname: true,
                emp_lname: true,
                emp_email: true
              }
            }
          },
          orderBy: { level: 'asc' }
        }
      }
    });
    
    if (!recentRequest) {
      console.log('❌ No requests found in database');
      return;
    }
    
    console.log(`📋 Request ID: ${recentRequest.id}`);
    console.log(`📊 Number of approvals: ${recentRequest.approvals.length}`);
    console.log('');
    
    recentRequest.approvals.forEach((approval, index) => {
      console.log(`🔸 Approval ${index + 1}:`);
      console.log(`   Level: ${approval.level}`);
      console.log(`   Level Name: ${approval.name}`);
      console.log(`   Approver ID: ${approval.approverId}`);
      console.log(`   📝 Approver Name (DB): "${approval.approverName || 'EMPTY'}"`);
      console.log(`   📧 Approver Email (DB): "${approval.approverEmail || 'EMPTY'}"`);
      console.log(`   Status: ${approval.status}`);
      
      if (approval.approver) {
        const fullName = `${approval.approver.emp_fname} ${approval.approver.emp_lname}`;
        console.log(`   👤 Actual User: "${fullName}"`);
        console.log(`   ✉️ Actual Email: "${approval.approver.emp_email}"`);
        
        // Check if stored name matches actual name
        if (approval.approverName === fullName) {
          console.log('   ✅ Approver name matches!');
        } else {
          console.log('   ❌ Approver name mismatch!');
        }
        
        // Check if stored email matches actual email
        if (approval.approverEmail === approval.approver.emp_email) {
          console.log('   ✅ Approver email matches!');
        } else {
          console.log('   ❌ Approver email mismatch!');
        }
      } else {
        console.log('   ⚠️ No approver user found (might be deleted)');
      }
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testApproverNames();
