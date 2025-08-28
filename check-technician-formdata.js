const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTechnicianFormData() {
  try {
    console.log('=== CHECKING TECHNICIAN DATA IN FORMDATA ===');
    
    // Get a few recent requests to check their formData
    const requests = await prisma.requests.findMany({
      take: 10,
      orderBy: { id: 'desc' },
      select: {
        id: true,
        formData: true,
        assignedTechnician: true
      }
    });
    
    console.log(`Found ${requests.length} recent requests:`);
    console.log('');
    
    requests.forEach((request, index) => {
      console.log(`Request #${request.id}:`);
      console.log(`  assignedTechnician field: ${request.assignedTechnician}`);
      
      if (request.formData) {
        const formData = JSON.parse(request.formData);
        console.log('  FormData technician fields:');
        
        // Check various possible technician field names
        const techFields = [
          'assigned_technician',
          'assignedTechnician', 
          'assignedTechnicianName',
          'technician',
          'assignedTo',
          'assigned_to'
        ];
        
        techFields.forEach(field => {
          if (formData[field] !== undefined) {
            console.log(`    ${field}: ${JSON.stringify(formData[field])}`);
          }
        });
        
        // Show all formData keys that might contain technician info
        const allKeys = Object.keys(formData);
        const techRelatedKeys = allKeys.filter(key => 
          key.toLowerCase().includes('tech') || 
          key.toLowerCase().includes('assign') ||
          key.toLowerCase().includes('responsible')
        );
        
        if (techRelatedKeys.length > 0) {
          console.log(`  Other technician-related keys:`, techRelatedKeys.map(key => 
            `${key}: ${JSON.stringify(formData[key])}`
          ).join(', '));
        }
      } else {
        console.log('  No formData found');
      }
      console.log('  ---');
    });
    
  } catch (error) {
    console.error('Error checking technician formData:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTechnicianFormData();
