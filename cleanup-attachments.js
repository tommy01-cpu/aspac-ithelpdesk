const { PrismaClient } = require('./node_modules/.prisma/attachments-client');
const prisma = new PrismaClient();

async function cleanupAttachments() {
  try {
    console.log('🧹 Starting attachments cleanup...');
    
    console.log('Deleting all attachments...');
    await prisma.attachment.deleteMany({});
    
    console.log('✅ Attachments cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during attachments cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupAttachments();
