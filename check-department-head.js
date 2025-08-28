const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDepartmentHead() {
  try {
    console.log('=== Checking user 95-015 ===');
    
    // First, find the user by employee code (emp_code)
    const user = await prisma.users.findFirst({
      where: { emp_code: '95-015' },
      select: {
        id: true,
        emp_code: true,
        emp_fname: true,
        emp_lname: true,
        departmentId: true,
        departmentHeadId: true
      }
    });
    
    console.log('User found:', user);
    
    if (user) {
      console.log('\n=== Checking departments table ===');
      
      // Check if this user is set as department head in any department
      const departmentsAsHead = await prisma.department.findMany({
        where: { departmentHeadId: user.id },
        select: {
          id: true,
          name: true,
          description: true,
          departmentHeadId: true
        }
      });
      
      console.log('Departments where user is head:', departmentsAsHead);
      
      // Check all departments to see structure
      console.log('\n=== All departments structure ===');
      const allDepartments = await prisma.department.findMany({
        select: {
          id: true,
          name: true,
          departmentHeadId: true,
          departmentHead: {
            select: {
              id: true,
              emp_code: true,
              emp_fname: true,
              emp_lname: true
            }
          }
        }
      });
      
      console.log('All departments:', JSON.stringify(allDepartments, null, 2));
      
      // Check the departmentsManaged relationship
      console.log('\n=== Checking departmentsManaged relationship ===');
      const userWithManagedDepts = await prisma.users.findUnique({
        where: { id: user.id },
        include: {
          departmentsManaged: {
            select: {
              id: true,
              name: true,
              description: true
            }
          }
        }
      });
      
      console.log('User with managed departments:', JSON.stringify(userWithManagedDepts?.departmentsManaged, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDepartmentHead();
