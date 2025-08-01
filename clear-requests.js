const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearAllRequestData() {
  try {
    console.log('🧹 Starting to clear all request data...');

    // Delete in order to respect foreign key constraints
    
    // 1. Delete RequestHistory records
    console.log('📝 Deleting request history records...');
    const historyCount = await prisma.requestHistory.deleteMany({});
    console.log(`✅ Deleted ${historyCount.count} request history records`);

    // 2. Delete RequestApproval records
    console.log('👥 Deleting request approval records...');
    const approvalCount = await prisma.requestApproval.deleteMany({});
    console.log(`✅ Deleted ${approvalCount.count} request approval records`);

    // 3. Delete RequestAssignment records
    console.log('🔧 Deleting request assignment records...');
    const assignmentCount = await prisma.requestAssignment.deleteMany({});
    console.log(`✅ Deleted ${assignmentCount.count} request assignment records`);

    // 4. Delete Request records (main table)
    console.log('📋 Deleting main request records...');
    const requestCount = await prisma.request.deleteMany({});
    console.log(`✅ Deleted ${requestCount.count} main request records`);

    // 5. Optional: Clear attachments if they exist
    try {
      console.log('📎 Deleting attachment records...');
      const attachmentCount = await prisma.attachment.deleteMany({});
      console.log(`✅ Deleted ${attachmentCount.count} attachment records`);
    } catch (error) {
      console.log('ℹ️  No attachment table found or already empty');
    }

    console.log('\n🎉 Successfully cleared all request data!');
    console.log('📊 Summary:');
    console.log(`   - Request History: ${historyCount.count} records`);
    console.log(`   - Request Approvals: ${approvalCount.count} records`);
    console.log(`   - Request Assignments: ${assignmentCount.count} records`);
    console.log(`   - Main Requests: ${requestCount.count} records`);

  } catch (error) {
    console.error('❌ Error clearing request data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
clearAllRequestData()
  .then(() => {
    console.log('✨ Request data cleanup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Request data cleanup failed:', error);
    process.exit(1);
  });
