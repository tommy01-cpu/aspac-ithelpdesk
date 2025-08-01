const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

console.log('Available models:', Object.keys(prisma));
console.log('Does approvalConversation exist?', 'approvalConversation' in prisma);
console.log('Models with "approval":', Object.keys(prisma).filter(key => key.toLowerCase().includes('approval')));
