const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTechnicianData() {
  try {
    console.log('=== CHECKING TECHNICIAN DATA IN REQUESTS ===');
    
    // Get a few requests to see their technician data
    const requests = await prisma.request.findMany({
      take: 10,
      include: {
        requester: {
          select: {
            emp_fname: true,
            emp_lname: true
          }
        }
      },
      orderBy: {
        id: 'desc'
      }
    });
    
    console.log(`Checking ${requests.length} recent requests:\n`);
    
    for (const request of requests) {
      console.log(`Request ID: ${request.id}`);
      console.log(`Requester: ${request.requester.emp_fname} ${request.requester.emp_lname}`);
      console.log(`assignedTechnician: ${request.assignedTechnician}`);
      
      if (request.formData) {
        const formData = typeof request.formData === 'string' 
          ? JSON.parse(request.formData) 
          : request.formData;
          
        console.log(`formData.assigned_technician: ${formData.assigned_technician || 'null'}`);
        console.log(`formData.assignedTechnicianName: ${formData.assignedTechnicianName || 'null'}`);
        console.log(`formData.assignedTechnician: ${formData.assignedTechnician || 'null'}`);
        
        // Check all keys that might contain technician info
        const technicianKeys = Object.keys(formData).filter(key => 
          key.toLowerCase().includes('technician') || 
          key.toLowerCase().includes('assign')
        );
        
        if (technicianKeys.length > 0) {
          console.log('Technician-related formData keys:');
          technicianKeys.forEach(key => {
            console.log(`  ${key}: ${formData[key]}`);
          });
        }
      }
      
      console.log('---\n');
    }
    
    // Also check if there are any request history records with technician assignments
    console.log('=== CHECKING REQUEST HISTORY FOR TECHNICIAN ASSIGNMENTS ===');
    
    const historyWithTechnicians = await prisma.requestHistory.findMany({
      where: {
        details: {
          contains: 'technician'
        }
      },
      take: 5,
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`Found ${historyWithTechnicians.length} history records mentioning technicians:\n`);
    
    historyWithTechnicians.forEach(history => {
      console.log(`Request ID: ${history.requestId}`);
      console.log(`Action: ${history.action}`);
      console.log(`Details: ${history.details}`);
      console.log('---\n');
    });
    
  } catch (error) {
    console.error('Error checking technician data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTechnicianData();
