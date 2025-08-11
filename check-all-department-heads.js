const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "mysql://root:@localhost:3306/it_helpdesk"
    }
  }
});

async function checkAllDepartmentHeads() {
  try {
    console.log('🔍 Checking departmentHeadId for all users...\n');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        emp_fname: true,
        emp_lname: true,
        department: true,
        departmentHeadId: true,
        reportingToId: true
      },
      orderBy: [
        { department: 'asc' },
        { emp_fname: 'asc' }
      ]
    });
    
    console.log('📊 Users by department:');
    console.log('========================\n');
    
    const byDepartment = {};
    users.forEach(user => {
      const dept = user.department || 'No Department';
      if (!byDepartment[dept]) {
        byDepartment[dept] = [];
      }
      byDepartment[dept].push(user);
    });
    
    for (const [dept, deptUsers] of Object.entries(byDepartment)) {
      console.log(`🏢 ${dept}:`);
      
      const usersWithoutHead = deptUsers.filter(u => !u.departmentHeadId);
      const usersWithHead = deptUsers.filter(u => u.departmentHeadId);
      
      if (usersWithoutHead.length > 0) {
        console.log(`   ❌ Users without department head (${usersWithoutHead.length}):`);
        usersWithoutHead.forEach(user => {
          console.log(`      - ${user.emp_fname} ${user.emp_lname} (ID: ${user.id})`);
        });
      }
      
      if (usersWithHead.length > 0) {
        console.log(`   ✅ Users with department head (${usersWithHead.length}):`);
        const headIds = [...new Set(usersWithHead.map(u => u.departmentHeadId))];
        for (const headId of headIds) {
          const headUser = await prisma.user.findUnique({
            where: { id: headId },
            select: { emp_fname: true, emp_lname: true }
          });
          const usersUnderHead = usersWithHead.filter(u => u.departmentHeadId === headId);
          console.log(`      - Head: ${headUser?.emp_fname} ${headUser?.emp_lname} (ID: ${headId})`);
          console.log(`        Users: ${usersUnderHead.map(u => `${u.emp_fname} ${u.emp_lname}`).join(', ')}`);
        }
      }
      
      console.log('');
    }
    
    const totalWithoutHead = users.filter(u => !u.departmentHeadId).length;
    console.log(`\n📈 Summary: ${totalWithoutHead} out of ${users.length} users need department head assignment`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllDepartmentHeads();
