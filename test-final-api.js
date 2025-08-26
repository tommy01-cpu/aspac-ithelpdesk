const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testFinalAPI() {
  try {
    console.log('Testing FINAL technician dashboard API with on_hold support...\n');

    // Get all technicians
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
            emp_lname: true
          }
        }
      }
    });

    console.log('Testing each technician with correct status values:');
    
    for (const tech of technicians) {
      const techName = tech.displayName || `${tech.user.emp_fname} ${tech.user.emp_lname}`.trim();
      
      const [onHold, open, resolved] = await Promise.all([
        // On-hold requests
        prisma.request.count({
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
            status: 'on_hold'
          }
        }),
        
        // Open requests
        prisma.request.count({
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
        }),
        
        // Resolved requests  
        prisma.request.count({
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
            status: 'resolved'
          }
        })
      ]);

      const activeTotal = onHold + open; // This should be shown in "My Assigned Requests"

      console.log(`${techName}:`);
      console.log(`  - On Hold: ${onHold}`);
      console.log(`  - Open: ${open}`);  
      console.log(`  - Resolved: ${resolved}`);
      console.log(`  - Active Total (My Assigned): ${activeTotal}`);
      console.log('');
    }

    // Show which request is on_hold
    const onHoldRequest = await prisma.request.findFirst({
      where: {
        status: 'on_hold'
      },
      select: {
        id: true,
        formData: true,
        status: true
      }
    });

    if (onHoldRequest) {
      console.log(`Request #${onHoldRequest.id} is on_hold, assigned to technician ID: ${onHoldRequest.formData.assignedTechnicianId}`);
    }

  } catch (error) {
    console.error('Error testing final API:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFinalAPI();
