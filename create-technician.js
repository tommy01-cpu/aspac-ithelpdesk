const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTechnician() {
  try {
    console.log('=== Creating Technician Record ===');
    
    const userEmail = process.argv[2];
    
    if (!userEmail) {
      console.log('Usage: node create-technician.js <email>');
      console.log('Example: node create-technician.js tom.mandapat@aspacphils.com.ph');
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
    
    // Check if technician record already exists
    const existingTechnician = await prisma.technician.findUnique({
      where: { userId: user.id }
    });
    
    if (existingTechnician) {
      console.log('✅ Technician record already exists');
      console.log(`Technician ID: ${existingTechnician.id}`);
      console.log(`Display Name: ${existingTechnician.displayName}`);
      console.log(`Status: ${existingTechnician.status}`);
      console.log(`Is Active: ${existingTechnician.isActive}`);
      return;
    }
    
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
    console.log(`${user.emp_fname} ${user.emp_lname} is now a technician`);
    
  } catch (error) {
    console.error('❌ Error creating technician:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTechnician();
