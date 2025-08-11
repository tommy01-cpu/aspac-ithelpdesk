const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateDepartmentStructure() {
  try {
    console.log('🔍 Starting department structure migration...\n');
    
    // Step 1: Show current data before migration
    console.log('📊 Current users with department names:');
    const usersWithDepartments = await prisma.users.findMany({
      where: {
        department: { not: null }
      },
      select: {
        id: true,
        emp_fname: true,
        emp_lname: true,
        department: true,
        departmentId: true // This might not exist yet
      },
      orderBy: { department: 'asc' }
    });
    
    console.log(`Found ${usersWithDepartments.length} users with departments:`);
    usersWithDepartments.forEach(user => {
      console.log(`  👤 ${user.emp_fname} ${user.emp_lname} -> ${user.department} (departmentId: ${user.departmentId || 'null'})`);
    });
    
    // Step 2: Show current departments
    console.log('\n🏢 Available departments:');
    const departments = await prisma.department.findMany({
      select: {
        id: true,
        name: true
      },
      orderBy: { name: 'asc' }
    });
    
    departments.forEach(dept => {
      console.log(`  🏢 ${dept.name} (ID: ${dept.id})`);
    });
    
    // Step 3: Check if departmentId field exists
    console.log('\n🔍 Checking if departmentId field exists in users table...');
    try {
      const testUser = await prisma.users.findFirst({
        select: { departmentId: true }
      });
      console.log('✅ departmentId field already exists!');
    } catch (error) {
      console.log('❌ departmentId field does not exist - need to add it via Prisma migration');
      console.log('📝 Please add this to your users model in schema.prisma:');
      console.log('   departmentId          Int?');
      console.log('   userDepartment        Department?  @relation("DepartmentMembers", fields: [departmentId], references: [id])');
      console.log('\n📝 And add this to your Department model:');
      console.log('   members               users[]      @relation("DepartmentMembers")');
      return;
    }
    
    // Step 4: If departmentId exists, populate it based on department names
    console.log('\n🔄 Updating departmentId based on department names...');
    
    let updatedCount = 0;
    for (const user of usersWithDepartments) {
      if (user.department && !user.departmentId) {
        // Find matching department
        const department = await prisma.department.findFirst({
          where: { name: user.department }
        });
        
        if (department) {
          await prisma.users.update({
            where: { id: user.id },
            data: { departmentId: department.id }
          });
          console.log(`  ✅ ${user.emp_fname} ${user.emp_lname}: "${user.department}" -> departmentId: ${department.id}`);
          updatedCount++;
        } else {
          console.log(`  ❌ ${user.emp_fname} ${user.emp_lname}: No department found for "${user.department}"`);
        }
      }
    }
    
    console.log(`\n✅ Migration completed! Updated ${updatedCount} users.`);
    
    // Step 5: Verify the migration
    console.log('\n🔍 Verifying migration results...');
    const verifyUsers = await prisma.users.findMany({
      where: {
        department: { not: null }
      },
      include: {
        userDepartment: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { department: 'asc' }
    });
    
    verifyUsers.forEach(user => {
      const match = user.userDepartment?.name === user.department ? '✅' : '❌';
      console.log(`  ${match} ${user.emp_fname} ${user.emp_lname}:`);
      console.log(`     department: "${user.department}"`);
      console.log(`     departmentId: ${user.departmentId}`);
      console.log(`     userDepartment: ${user.userDepartment?.name || 'null'}`);
    });
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateDepartmentStructure();
