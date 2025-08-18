const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUnassignedRequests() {
  try {
    const requests = await prisma.request.findMany({
      take: 10,
      include: {
        user: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true,
            emp_email: true,
            department: true
          }
        }
      }
    });
    
    for (const request of requests) {
      console.log(`\n=== Request ${request.id} ===`);
      console.log('Template:', request.templateName);
      console.log('Requester:', `${request.user.emp_fname} ${request.user.emp_lname} (ID: ${request.user.id})`);
      
      const formData = request.formData || {};
      console.log('\nTechnician fields:');
      console.log('  assignedTechnician:', formData.assignedTechnician);
      console.log('  assignedTechnicianId:', formData.assignedTechnicianId);
      console.log('  field 7:', formData['7']);
      
      // Check if there's actually an assigned technician
      let technicianUserId = null;
      if (formData.assignedTechnicianId) {
        technicianUserId = parseInt(formData.assignedTechnicianId);
      } else if (formData['7']) {
        technicianUserId = parseInt(formData['7']);
      }
      
      if (technicianUserId && !isNaN(technicianUserId)) {
        console.log(`  Technician User ID: ${technicianUserId}`);
        console.log(`  Same as requester: ${technicianUserId === request.user.id ? 'YES' : 'NO'}`);
      } else {
        console.log('  No technician assigned');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUnassignedRequests();
