const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugCurrentUser() {
  try {
    // Check the current session user (the one that shows up in logs)
    const sessionUser = await prisma.users.findFirst({
      where: { emp_email: 'tom.mandapat@aspacphils.com.ph' },
      select: {
        id: true,
        emp_fname: true,
        emp_lname: true,
        emp_email: true,
        isServiceApprover: true,
        isTechnician: true
      }
    });
    console.log('Session user data:', JSON.stringify(sessionUser, null, 2));
    
    // Check if there are multiple users with the same email
    const allUsersWithEmail = await prisma.users.findMany({
      where: { emp_email: 'tom.mandapat@aspacphils.com.ph' }
    });
    console.log('All users with this email:', allUsersWithEmail.length);
    
    // Check user ID 1 specifically (since that's what shows in session)
    const userOne = await prisma.users.findUnique({
      where: { id: 1 },
      select: {
        id: true,
        emp_fname: true,
        emp_lname: true,
        emp_email: true,
        isServiceApprover: true,
        isTechnician: true
      }
    });
    console.log('User ID 1 data:', JSON.stringify(userOne, null, 2));
    
    // Check approvals for user ID 1
    const approvalsForUser1 = await prisma.requestApproval.findMany({
      where: { approverId: 1 }
    });
    console.log('Approvals for user ID 1:', approvalsForUser1.length);
    
    // Check approvals for user ID 2
    const approvalsForUser2 = await prisma.requestApproval.findMany({
      where: { approverId: 2 }
    });
    console.log('Approvals for user ID 2:', approvalsForUser2.length);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugCurrentUser();
