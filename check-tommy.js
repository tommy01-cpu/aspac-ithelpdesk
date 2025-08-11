const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTommyUser() {
  try {
    console.log('🔍 Checking Tommy user details...\n');
    
    // Find Tommy/Jose users
    const tommyUsers = await prisma.users.findMany({
      where: {
        OR: [
          { emp_fname: { contains: 'Tommy' } },
          { emp_fname: { contains: 'Jose' } },
          { emp_email: { contains: 'tom.mandapat' } }
        ]
      },
      select: {
        id: true,
        emp_fname: true,
        emp_lname: true,
        emp_email: true,
        department: true,
        departmentHeadId: true,
        departmentHead: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true
          }
        }
      }
    });
    
    console.log(`Found ${tommyUsers.length} users:`);
    tommyUsers.forEach(user => {
      console.log(`\n👤 User: ${user.emp_fname} ${user.emp_lname} (ID: ${user.id})`);
      console.log(`   Email: ${user.emp_email}`);
      console.log(`   Department: ${user.department}`);
      console.log(`   Department Head ID: ${user.departmentHeadId}`);
      if (user.departmentHead) {
        console.log(`   Department head: ${user.departmentHead.emp_fname} ${user.departmentHead.emp_lname}`);
      } else {
        console.log(`   Department head: ❌ Not assigned`);
      }
    });
    
    // Check IT department specifically
    console.log('\n🔍 Checking Information Technology department...\n');
    
    const itDepartment = await prisma.department.findFirst({
      where: { name: 'Information Technology' },
      include: {
        departmentHead: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true
          }
        }
      }
    });
    
    if (itDepartment) {
      console.log(`🏢 IT Department (ID: ${itDepartment.id})`);
      console.log(`   Head ID: ${itDepartment.departmentHeadId}`);
      if (itDepartment.departmentHead) {
        console.log(`   Head: ${itDepartment.departmentHead.emp_fname} ${itDepartment.departmentHead.emp_lname} (ID: ${itDepartment.departmentHead.id})`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTommyUser();
