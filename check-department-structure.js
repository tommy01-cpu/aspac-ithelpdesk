const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDepartmentStructure() {
  try {
    console.log('🔍 Checking Department table structure...\n');
    
    // Get all departments with their head information
    const departments = await prisma.department.findMany({
      include: {
        departmentHead: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true,
            emp_email: true
          }
        }
      }
    });
    
    console.log('📋 Departments found:', departments.length);
    
    departments.forEach(dept => {
      console.log(`\n🏢 Department: ${dept.name}`);
      console.log(`   ID: ${dept.id}`);
      console.log(`   Head ID: ${dept.departmentHeadId}`);
      
      if (dept.departmentHead) {
        console.log(`   Head: ${dept.departmentHead.emp_fname} ${dept.departmentHead.emp_lname} (ID: ${dept.departmentHead.id})`);
      } else {
        console.log('   Head: ❌ No department head assigned');
      }
    });
    
    // Get users by department and check their department head relationships
    console.log('\n🔍 Checking users department relationships...\n');
    
    const testUsers = await prisma.users.findMany({
      where: {
        OR: [
          { emp_fname: 'Tommy' },
          { emp_fname: 'Jose' },
          { emp_fname: 'Angelbert' }
        ]
      },
      select: {
        id: true,
        emp_fname: true,
        emp_lname: true,
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
    
    testUsers.forEach(user => {
      console.log(`👤 User: ${user.emp_fname} ${user.emp_lname} (ID: ${user.id})`);
      console.log(`   Department field: ${user.department}`);
      console.log(`   Department Head ID: ${user.departmentHeadId}`);
      if (user.departmentHead) {
        console.log(`   Department head: ${user.departmentHead.emp_fname} ${user.departmentHead.emp_lname} (ID: ${user.departmentHead.id})`);
      } else {
        console.log(`   Department head: ❌ Not assigned`);
      }
    });
    
    // Now let's find the department head for each user by their department name
    console.log('\n🔄 Finding department heads by department name...\n');
    
    for (const user of testUsers) {
      if (user.department) {
        const department = await prisma.department.findFirst({
          where: { name: user.department },
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
        
        if (department) {
          console.log(`👤 ${user.emp_fname} ${user.emp_lname} -> Department: ${department.name}`);
          if (department.departmentHead) {
            console.log(`   ✅ Department head found: ${department.departmentHead.emp_fname} ${department.departmentHead.emp_lname} (ID: ${department.departmentHead.id})`);
          } else {
            console.log(`   ❌ No department head configured for ${department.name}`);
          }
        } else {
          console.log(`👤 ${user.emp_fname} ${user.emp_lname} -> ❌ Department "${user.department}" not found in departments table`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDepartmentStructure();
