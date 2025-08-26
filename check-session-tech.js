const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSessionTechnician() {
  try {
    console.log('Checking which technician would be logged in...\n');

    // Check users who are technicians
    const technicians = await prisma.technician.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        userId: true,
        displayName: true,
        user: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true,
            emp_email: true,
            isTechnician: true
          }
        }
      }
    });

    console.log('Available technicians for login:');
    technicians.forEach(tech => {
      const techName = tech.displayName || `${tech.user.emp_fname} ${tech.user.emp_lname}`.trim();
      console.log(`- ${techName} (Email: ${tech.user.emp_email}, Technician ID: ${tech.id}, User ID: ${tech.userId}, isTechnician: ${tech.user.isTechnician})`);
    });

    console.log('\nRequest assignments:');
    for (const tech of technicians) {
      const openCount = await prisma.request.count({
        where: {
          OR: [
            {
              formData: {
                path: ['assignedTechnicianId'],
                equals: tech.id
              }
            },
            {
              formData: {
                path: ['assignedTechnicianId'],
                equals: tech.id.toString()
              }
            }
          ],
          status: 'open'
        }
      });

      const techName = tech.displayName || `${tech.user.emp_fname} ${tech.user.emp_lname}`.trim();
      console.log(`- ${techName}: ${openCount} open requests assigned`);
    }

  } catch (error) {
    console.error('Error checking session technician:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSessionTechnician();
