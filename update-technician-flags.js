/**
 * Update isTechnician field for users with technician records
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateTechnicianFlags() {
  console.log('🔧 Updating isTechnician flags...\n');

  try {
    // Get all technician records
    const technicians = await prisma.technician.findMany({
      include: {
        user: true
      }
    });

    console.log(`📊 Found ${technicians.length} technician records\n`);

    for (const tech of technicians) {
      if (!tech.user.isTechnician) {
        console.log(`✅ Updating ${tech.user.emp_fname} ${tech.user.emp_lname} (${tech.user.emp_code})`);
        
        await prisma.users.update({
          where: { id: tech.userId },
          data: { isTechnician: true }
        });
        
        console.log(`   ✓ Set isTechnician = true for user ID ${tech.userId}`);
      } else {
        console.log(`⏭️  ${tech.user.emp_fname} ${tech.user.emp_lname} already has isTechnician = true`);
      }
    }

    console.log('\n🎉 Finished updating technician flags!');
    
    // Verify the updates
    console.log('\n📋 Verification - Users with technician records:');
    const updatedUsers = await prisma.users.findMany({
      where: {
        technician: {
          isNot: null
        }
      },
      include: {
        technician: true
      }
    });

    updatedUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.emp_fname} ${user.emp_lname}`);
      console.log(`   isTechnician: ${user.isTechnician}`);
      console.log(`   isAdmin: ${user.technician?.isAdmin}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updateTechnicianFlags().catch(console.error);
