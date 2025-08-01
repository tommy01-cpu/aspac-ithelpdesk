import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTommyUser() {
  try {
    // Check if user already exists
    const existingUser = await prisma.users.findFirst({
      where: {
        OR: [
          { emp_email: 'tom.mandapat@aspacphils.com.ph' },
          { emp_code: 'A24026' }
        ]
      }
    });

    if (existingUser) {
      console.log('User already exists:', existingUser);
      return existingUser;
    }

    // Create Tommy's user record to match session
    const tommy = await prisma.users.create({
      data: {
        emp_fname: 'JOSE TOMMY',
        emp_lname: 'MANDAPAT',
        emp_email: 'tom.mandapat@aspacphils.com.ph',
        emp_code: 'A24026',
        post_des: 'SOFTWARE DEVELOPER',
        password: '$2b$10$defaultpassword', // Default password
        department: 'Information Technology',
        emp_status: 'active',
        isServiceApprover: false,
        isTechnician: true,
        reportingToId: 2, // Report to Jane Smith
        departmentHeadId: 3, // Alice Johnson as department head
      }
    });

    console.log('Created Tommy user:', tommy);

    // Update the existing request to belong to Tommy
    const updatedRequest = await prisma.request.update({
      where: { id: 1 },
      data: {
        userId: tommy.id,
      }
    });

    console.log('Updated request to belong to Tommy:', updatedRequest);

    // Update approvals to use correct user relationships
    await prisma.requestApproval.updateMany({
      where: { requestId: 1, level: 2 },
      data: {
        approverId: tommy.reportingToId,
        approverName: 'Jane Smith',
        approverEmail: 'jane.smith@example.com',
      }
    });

    await prisma.requestApproval.updateMany({
      where: { requestId: 1, level: 3 },
      data: {
        approverId: tommy.departmentHeadId,
        approverName: 'Alice Johnson',
        approverEmail: 'alice.johnson@example.com',
      }
    });

    // Update history to show Tommy as creator
    await prisma.requestHistory.updateMany({
      where: { requestId: 1, actorType: 'user' },
      data: {
        actorId: tommy.id,
        actorName: 'JOSE TOMMY MANDAPAT',
      }
    });

    console.log('Updated approvals and history for Tommy');

  } catch (error) {
    console.error('Error creating Tommy user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTommyUser();
