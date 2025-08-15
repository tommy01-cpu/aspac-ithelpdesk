const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function makeUserTechnician() {
  try {
    console.log('=== Making User a Technician ===');
    
    // Get current user's email (you can change this to your email)
    const userEmail = process.argv[2];
    
    if (!userEmail) {
      console.log('Usage: node make-technician.js <email>');
      console.log('Example: node make-technician.js john.doe@company.com');
      return;
    }
    
    console.log(`Looking for user with email: ${userEmail}`);
    
    // Find the user
    const user = await prisma.users.findFirst({
      where: { emp_email: userEmail }
    });
    
    if (!user) {
      console.log(`❌ User with email ${userEmail} not found`);
      return;
    }
    
    console.log(`Found user: ${user.emp_fname} ${user.emp_lname} (ID: ${user.id})`);
    console.log(`Current isTechnician status: ${user.isTechnician}`);
    
    // Check if user already has a technician record
    const existingTechnician = await prisma.technician.findUnique({
      where: { userId: user.id }
    });
    
    if (existingTechnician) {
      console.log('✅ User already has a technician record');
      console.log(`Technician ID: ${existingTechnician.id}`);
      console.log(`Display Name: ${existingTechnician.displayName}`);
      console.log(`Status: ${existingTechnician.status}`);
      console.log(`Is Active: ${existingTechnician.isActive}`);
      
      if (!user.isTechnician) {
        console.log('🔧 Updating user isTechnician flag to true...');
        await prisma.users.update({
          where: { id: user.id },
          data: { isTechnician: true }
        });
        console.log('✅ User isTechnician flag updated');
      }
      return;
    }
    
    // Update user to be a technician in users table
    const updatedUser = await prisma.users.update({
      where: { id: user.id },
      data: { isTechnician: true }
    });
    
    console.log('✅ User isTechnician flag set to true');
    
    // Create technician record
    const displayName = `${user.emp_fname} ${user.emp_lname}`.trim();
    
    const technician = await prisma.technician.create({
      data: {
        userId: user.id,
        displayName: displayName,
        status: 'active',
        isActive: true,
        enableLogin: true,
        serviceRequestApprover: false,
        purchaseApprover: false,
        isAdmin: false,
        vipUser: false,
        enableTelephony: false,
        costPerHour: 0.00,
        allowedToViewCostPerHour: false
      }
    });
    
    console.log('✅ Technician record created successfully!');
    console.log(`Technician ID: ${technician.id}`);
    console.log(`Display Name: ${technician.displayName}`);
    console.log(`User ID: ${technician.userId}`);
    console.log(`${updatedUser.emp_fname} ${updatedUser.emp_lname} is now a full technician`);
    
  } catch (error) {
    console.error('❌ Error updating user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

makeUserTechnician();
