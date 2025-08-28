const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTechnicians() {
  try {
    console.log('=== CHECKING TECHNICIAN TABLE ===');
    
    // Check technician table structure and data
    const technicians = await prisma.technician.findMany({
      include: {
        user: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true,
            emp_code: true,
            emp_email: true,
            emp_status: true,
            post_des: true,
            department: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        user: {
          emp_fname: 'asc'
        }
      }
    });
    
    console.log(`Found ${technicians.length} technicians in technician table:`);
    console.log('');
    
    technicians.forEach((tech, index) => {
      console.log(`${index + 1}. ID: ${tech.id} | User ID: ${tech.userId}`);
      console.log(`   Name: ${tech.user.emp_fname} ${tech.user.emp_lname}`);
      console.log(`   Employee Code: ${tech.user.emp_code}`);
      console.log(`   Email: ${tech.user.emp_email}`);
      console.log(`   Position: ${tech.user.post_des || 'N/A'}`);
      console.log(`   Department: ${tech.user.department?.name || 'N/A'}`);
      console.log(`   Status: ${tech.user.emp_status}`);
      console.log(`   Technician Active: ${tech.isActive}`);
      console.log(`   Is Admin: ${tech.isAdmin}`);
      console.log('   ---');
    });
    
    console.log('');
    console.log('=== ACTIVE TECHNICIANS ONLY ===');
    const activeTechs = technicians.filter(t => t.isActive && t.user.emp_status === 'active');
    console.log(`Active technicians: ${activeTechs.length}`);
    
    activeTechs.forEach((tech, index) => {
      console.log(`${index + 1}. ${tech.user.emp_fname} ${tech.user.emp_lname} (${tech.user.emp_code}) - ${tech.user.department?.name || 'N/A'}${tech.isAdmin ? ' [Admin]' : ''}`);
    });
    
    console.log('');
    console.log('=== COMPARISON WITH CURRENT API QUERY ===');
    
    // This is what the current API query does
    const currentApiQuery = await prisma.users.findMany({
      where: {
        emp_status: 'active',
        technician: {
          isActive: true
        }
      },
      select: {
        id: true,
        emp_fname: true,
        emp_lname: true,
        emp_email: true,
        emp_code: true,
        post_des: true,
        department: {
          select: {
            name: true
          }
        },
        technician: {
          select: {
            id: true,
            isActive: true,
            isAdmin: true
          }
        }
      },
      orderBy: [
        { emp_fname: 'asc' },
        { emp_lname: 'asc' }
      ]
    });
    
    console.log(`Current API query returns: ${currentApiQuery.length} technicians`);
    currentApiQuery.forEach((user, index) => {
      console.log(`${index + 1}. ${user.emp_fname} ${user.emp_lname} (${user.emp_code}) - ${user.department?.name || 'N/A'}${user.technician?.isAdmin ? ' [Admin]' : ''}`);
    });
    
  } catch (error) {
    console.error('Error checking technicians:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTechnicians();
