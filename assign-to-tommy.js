const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function assignRequestToTommy() {
  try {
    console.log('Assigning a request to JOSE TOMMY MANDAPAT for testing...\n');

    // Find JOSE TOMMY's technician record
    const tommy = await prisma.technician.findFirst({
      where: {
        user: {
          emp_fname: 'JOSE TOMMY',
          emp_lname: 'MANDAPAT'
        }
      },
      select: {
        id: true,
        displayName: true,
        user: {
          select: {
            emp_fname: true,
            emp_lname: true,
            emp_email: true
          }
        }
      }
    });

    if (!tommy) {
      console.log('JOSE TOMMY not found in technician table');
      return;
    }

    console.log(`Found Tommy - Technician ID: ${tommy.id}, Name: ${tommy.displayName}`);

    // Find an open request that's not assigned to anyone
    const unassignedRequest = await prisma.request.findFirst({
      where: {
        status: 'open',
        OR: [
          {
            formData: {
              path: ['assignedTechnicianId'],
              equals: null
            }
          },
          {
            NOT: {
              formData: {
                path: ['assignedTechnicianId'],
                not: null
              }
            }
          }
        ]
      },
      select: {
        id: true,
        formData: true,
        status: true
      }
    });

    if (unassignedRequest) {
      console.log(`Found unassigned request #${unassignedRequest.id}`);
      
      // Update the request to assign it to Tommy
      const updatedFormData = {
        ...unassignedRequest.formData,
        assignedTechnicianId: tommy.id,
        assignedTechnician: tommy.displayName,
        assignedTechnicianEmail: tommy.user.emp_email,
        assignedDate: new Date().toISOString()
      };

      await prisma.request.update({
        where: {
          id: unassignedRequest.id
        },
        data: {
          formData: updatedFormData
        }
      });

      console.log(`✅ Assigned request #${unassignedRequest.id} to Tommy`);
    } else {
      // Create a new test request if no unassigned ones exist
      console.log('No unassigned requests found, creating a new test request...');
      
      const newRequest = await prisma.request.create({
        data: {
          status: 'open',
          formData: {
            1: 'Test request for Tommy',
            2: 'This is a test request to demonstrate the dashboard',
            3: 'Normal',
            4: 'Hardware',
            5: 'Computer Issues',
            6: 'Test request created for dashboard testing',
            assignedTechnicianId: tommy.id,
            assignedTechnician: tommy.displayName,
            assignedTechnicianEmail: tommy.user.emp_email,
            assignedDate: new Date().toISOString()
          }
        }
      });

      console.log(`✅ Created new test request #${newRequest.id} assigned to Tommy`);
    }

    // Verify the assignment
    const tommyRequests = await prisma.request.count({
      where: {
        OR: [
          {
            formData: {
              path: ['assignedTechnicianId'],
              equals: tommy.id
            }
          },
          {
            formData: {
              path: ['assignedTechnicianId'],
              equals: tommy.id.toString()
            }
          }
        ],
        status: 'open'
      }
    });

    console.log(`\n📊 Tommy now has ${tommyRequests} open request(s) assigned`);

  } catch (error) {
    console.error('Error assigning request:', error);
  } finally {
    await prisma.$disconnect();
  }
}

assignRequestToTommy();
