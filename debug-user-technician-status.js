/**
 * Debug User Technician Status
 * This script checks the technician status for a specific user
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUserTechnicianStatus() {
  console.log('🔍 Checking user technician status...\n');

  try {
    // Get all users and their technician status
    const users = await prisma.users.findMany({
      include: {
        technician: true,
        user_roles: {
          include: {
            roles: true
          }
        }
      },
      take: 10 // Limit to first 10 users
    });

    console.log(`📊 Found ${users.length} users:\n`);

    users.forEach((user, index) => {
      console.log(`${index + 1}. User: ${user.emp_fname} ${user.emp_lname} (${user.emp_code})`);
      console.log(`   Email: ${user.emp_email}`);
      console.log(`   isTechnician field: ${user.isTechnician}`);
      console.log(`   Has technician record: ${!!user.technician}`);
      console.log(`   Technician isAdmin: ${user.technician?.isAdmin ?? 'N/A'}`);
      console.log(`   Roles: ${user.user_roles.map(ur => ur.roles.name).join(', ') || 'None'}`);
      console.log(`   Should show Technician View: ${user.isTechnician || !!user.technician}`);
      console.log(`   Should show Admin View: ${user.technician?.isAdmin ?? false}`);
      console.log('');
    });

    // Also check specifically for technicians
    console.log('\n🔧 All technician records:');
    const technicians = await prisma.technician.findMany({
      include: {
        user: true
      }
    });

    console.log(`Found ${technicians.length} technician records:\n`);

    technicians.forEach((tech, index) => {
      console.log(`${index + 1}. Technician: ${tech.user.emp_fname} ${tech.user.emp_lname}`);
      console.log(`   User ID: ${tech.userId}`);
      console.log(`   Display Name: ${tech.displayName}`);
      console.log(`   Is Admin: ${tech.isAdmin}`);
      console.log(`   Is Active: ${tech.isActive}`);
      console.log(`   User isTechnician flag: ${tech.user.isTechnician}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkUserTechnicianStatus().catch(console.error);
