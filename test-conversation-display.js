const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConversationDisplay() {
  try {
    console.log('🔍 Testing Conversation Display Functionality\n');

    // 1. Check if approval_conversations table exists
    console.log('1️⃣ Checking approval_conversations table...');
    try {
      const tableCheck = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'approval_conversations'
      `;
      console.log(`   Table exists: ${tableCheck.length > 0 ? '✅ YES' : '❌ NO'}`);
      
      if (tableCheck.length > 0) {
        const conversationCount = await prisma.$queryRaw`
          SELECT COUNT(*) as count FROM approval_conversations
        `;
        console.log(`   Total conversations: ${conversationCount[0]?.count || 0}`);
      }
    } catch (error) {
      console.log('   ❌ Error checking table:', error.message);
    }

    // 2. Check approval data for conversation display
    console.log('\n2️⃣ Checking approvals for conversation display...');
    const approvals = await prisma.requestApproval.findMany({
      where: {
        status: {
          in: ['pending_approval', 'for_clarification', 'approved']
        }
      },
      include: {
        request: {
          select: {
            id: true,
            templateName: true,
            user: {
              select: {
                emp_fname: true,
                emp_lname: true,
                emp_email: true
              }
            }
          }
        },
        approver: {
          select: {
            emp_fname: true,
            emp_lname: true,
            emp_email: true
          }
        }
      },
      take: 5
    });

    console.log(`   Found ${approvals.length} approvals for testing`);
    
    approvals.forEach((approval, index) => {
      console.log(`   ${index + 1}. Request #${approval.requestId} - Level ${approval.level}`);
      console.log(`      Approver: ${approval.approver?.emp_fname || 'Unknown'} ${approval.approver?.emp_lname || 'User'}`);
      console.log(`      Status: ${approval.status}`);
      console.log(`      Approval ID: ${approval.id} (for conversation testing)`);
    });

    // 3. Test conversation API endpoint functionality
    console.log('\n3️⃣ Testing conversation API structure...');
    if (approvals.length > 0) {
      const testApprovalId = approvals[0].id;
      console.log(`   Testing with approval ID: ${testApprovalId}`);
      
      try {
        const conversations = await prisma.$queryRaw`
          SELECT 
            ac.id,
            ac.type,
            ac.message,
            ac."createdAt" as timestamp,
            ac."isRead",
            ac."readBy",
            ac."authorId"
          FROM approval_conversations ac
          WHERE ac."approvalId" = ${testApprovalId}
          ORDER BY ac."createdAt" ASC
        `;
        
        console.log(`   Conversations for approval ${testApprovalId}: ${conversations.length}`);
        conversations.forEach((conv, idx) => {
          console.log(`     ${idx + 1}. Type: ${conv.type}, Author: ${conv.authorId}, Read: ${conv.isRead}`);
        });
      } catch (dbError) {
        console.log('   ❌ Error querying conversations:', dbError.message);
      }
    }

    // 4. Summary for frontend testing
    console.log('\n📋 FRONTEND TESTING GUIDANCE:');
    console.log('   1. Navigate to any request detail page: /users/requests/[id]');
    console.log('   2. Go to the "Approvals" tab');
    console.log('   3. Look for the "Conversation" column in approval stages table');
    console.log('   4. Expected behavior:');
    console.log('      • Shows message count badge for each approval level');
    console.log('      • Red badge for unread messages from approvers');
    console.log('      • Blue badge for total message count when no unread');
    console.log('      • "0" indicator when no messages exist');
    console.log('      • Click message icon to expand conversation panel');

    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Error testing conversation display:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConversationDisplay();
