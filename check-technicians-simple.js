const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTechnicians() {
  try {
    console.log('=== CHECKING TECHNICIAN TABLE ===');
    
    // First, let's see the raw technician table
    const technicians = await prisma.technician.findMany({
      orderBy: { id: 'asc' }
    });
    
    console.log(`Found ${technicians.length} records in technician table:`);
    
    for (const tech of technicians) {
      console.log(`Technician ID: ${tech.id}, User ID: ${tech.userId}, Active: ${tech.isActive}, Admin: ${tech.isAdmin}`);
    }
    
    console.log('\n=== GETTING USER DETAILS FOR TECHNICIANS ===');
    
    // Now get user details for each technician
    for (const tech of technicians) {
      try {
        const user = await prisma.users.findUnique({
          where: { id: tech.userId },
          include: {
            department: true
          }
        });
        
        if (user) {
          console.log(`${user.emp_fname} ${user.emp_lname} (${user.emp_code}) - ${user.department?.name || 'No Dept'} - Status: ${user.emp_status}${tech.isActive ? ' [Active Tech]' : ' [Inactive Tech]'}${tech.isAdmin ? ' [Admin]' : ''}`);
        } else {
          console.log(`Technician ${tech.id} references non-existent user ${tech.userId}`);
        }
      } catch (error) {
        console.log(`Error getting user ${tech.userId}:`, error.message);
      }
    }
    
    console.log('\n=== CURRENT API QUERY SIMULATION ===');
    
    // This simulates what the current API does
    const users = await prisma.users.findMany({
      where: {
        emp_status: 'active',
        isTechnician: true
      },
      include: {
        department: true
      },
      orderBy: {
        emp_fname: 'asc'
      }
    });
    
    console.log(`Users with isTechnician=true and active status: ${users.length}`);
    users.forEach(user => {
      console.log(`${user.emp_fname} ${user.emp_lname} (${user.emp_code}) - ${user.department?.name || 'No Dept'}`);
    });
    
  } catch (error) {
    console.error('Error checking technicians:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTechnicians();
