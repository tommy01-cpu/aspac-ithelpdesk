const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');
  
  // Clear existing data (be careful with this in production)
  await prisma.technicianSkill.deleteMany({});
  await prisma.technicianSupportGroup.deleteMany({});
  await prisma.technician.deleteMany({});
  await prisma.supportGroup.deleteMany({});
  await prisma.skill.deleteMany({});
  await prisma.holiday.deleteMany({});
  await prisma.department.deleteMany({});
  await prisma.user_roles.deleteMany({});
  await prisma.users.deleteMany({});
  await prisma.roles.deleteMany({});
  
  console.log('Cleared existing data');

  // Create roles
  const adminRole = await prisma.roles.create({
    data: { name: 'admin' }
  });
  
  const technicianRole = await prisma.roles.create({
    data: { name: 'technician' }
  });
  
  const userRole = await prisma.roles.create({
    data: { name: 'user' }
  });
  
  console.log('Created roles');

  // Create departments
  const departments = await prisma.department.createMany({
    data: [
      {
        name: 'Information Technology',
        description: 'IT Department - Manages all technology infrastructure',
        isActive: true
      },
      {
        name: 'Human Resources',
        description: 'HR Department - Manages employee relations and policies',
        isActive: true
      },
      {
        name: 'Finance',
        description: 'Finance Department - Manages financial operations',
        isActive: true
      },
      {
        name: 'Operations',
        description: 'Operations Department - Manages day-to-day operations',
        isActive: true
      },
      {
        name: 'Sales',
        description: 'Sales Department - Manages sales and customer relations',
        isActive: true
      }
    ]
  });
  
  console.log('Created departments');

  // Get department IDs for reference
  const itDept = await prisma.department.findFirst({ where: { name: 'Information Technology' } });
  const hrDept = await prisma.department.findFirst({ where: { name: 'Human Resources' } });
  const financeDept = await prisma.department.findFirst({ where: { name: 'Finance' } });
  const opsDept = await prisma.department.findFirst({ where: { name: 'Operations' } });
  const salesDept = await prisma.department.findFirst({ where: { name: 'Sales' } });

  // Create sample users
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const users = await prisma.users.createMany({
    data: [
      {
        emp_code: 'ADMIN001',
        emp_fname: 'System',
        emp_lname: 'Administrator',
        emp_email: 'admin@company.com',
        password: hashedPassword,
        emp_status: 'active',
        department: 'Information Technology',
        isTechnician: true,
        isServiceApprover: true,
        post_des: 'System Administrator'
      },
      {
        emp_code: 'IT001',
        emp_fname: 'John',
        emp_mid: 'Michael',
        emp_lname: 'Smith',
        emp_email: 'john.smith@company.com',
        emp_cell: '09171234567',
        password: hashedPassword,
        emp_status: 'active',
        department: 'Information Technology',
        isTechnician: true,
        post_des: 'Senior IT Technician'
      },
      {
        emp_code: 'IT002',
        emp_fname: 'Sarah',
        emp_mid: 'Jane',
        emp_lname: 'Johnson',
        emp_email: 'sarah.johnson@company.com',
        emp_cell: '09187654321',
        password: hashedPassword,
        emp_status: 'active',
        department: 'Information Technology',
        isTechnician: true,
        post_des: 'Network Administrator'
      },
      {
        emp_code: 'IT003',
        emp_fname: 'Mike',
        emp_lname: 'Wilson',
        emp_email: 'mike.wilson@company.com',
        emp_cell: '09198765432',
        password: hashedPassword,
        emp_status: 'active',
        department: 'Information Technology',
        isTechnician: true,
        post_des: 'Help Desk Technician'
      },
      {
        emp_code: 'HR001',
        emp_fname: 'Lisa',
        emp_mid: 'Marie',
        emp_lname: 'Brown',
        emp_email: 'lisa.brown@company.com',
        emp_cell: '09156789012',
        password: hashedPassword,
        emp_status: 'active',
        department: 'Human Resources',
        isTechnician: false,
        post_des: 'HR Manager'
      },
      {
        emp_code: 'FIN001',
        emp_fname: 'David',
        emp_lname: 'Davis',
        emp_email: 'david.davis@company.com',
        emp_cell: '09167890123',
        password: hashedPassword,
        emp_status: 'active',
        department: 'Finance',
        isTechnician: false,
        post_des: 'Financial Analyst'
      },
      {
        emp_code: 'OPS001',
        emp_fname: 'Emma',
        emp_lname: 'Garcia',
        emp_email: 'emma.garcia@company.com',
        emp_cell: '09178901234',
        password: hashedPassword,
        emp_status: 'active',
        department: 'Operations',
        isTechnician: false,
        post_des: 'Operations Manager'
      },
      {
        emp_code: 'SAL001',
        emp_fname: 'Robert',
        emp_mid: 'James',
        emp_lname: 'Miller',
        emp_email: 'robert.miller@company.com',
        emp_cell: '09189012345',
        password: hashedPassword,
        emp_status: 'active',
        department: 'Sales',
        isTechnician: false,
        post_des: 'Sales Representative'
      },
      {
        emp_code: 'IT004',
        emp_fname: 'Anna',
        emp_lname: 'Taylor',
        emp_email: 'anna.taylor@company.com',
        emp_cell: '09190123456',
        password: hashedPassword,
        emp_status: 'active',
        department: 'Information Technology',
        isTechnician: true,
        post_des: 'Security Analyst'
      },
      {
        emp_code: 'IT005',
        emp_fname: 'Chris',
        emp_lname: 'Anderson',
        emp_email: 'chris.anderson@company.com',
        emp_cell: '09123456789',
        password: hashedPassword,
        emp_status: 'active',
        department: 'Information Technology',
        isTechnician: true,
        post_des: 'Database Administrator'
      }
    ]
  });
  
  console.log('Created users');

  // Get user IDs for role assignments
  const adminUser = await prisma.users.findFirst({ where: { emp_code: 'ADMIN001' } });
  const johnUser = await prisma.users.findFirst({ where: { emp_code: 'IT001' } });
  const sarahUser = await prisma.users.findFirst({ where: { emp_code: 'IT002' } });
  const mikeUser = await prisma.users.findFirst({ where: { emp_code: 'IT003' } });
  const lisaUser = await prisma.users.findFirst({ where: { emp_code: 'HR001' } });
  const davidUser = await prisma.users.findFirst({ where: { emp_code: 'FIN001' } });
  const emmaUser = await prisma.users.findFirst({ where: { emp_code: 'OPS001' } });
  const robertUser = await prisma.users.findFirst({ where: { emp_code: 'SAL001' } });
  const annaUser = await prisma.users.findFirst({ where: { emp_code: 'IT004' } });
  const chrisUser = await prisma.users.findFirst({ where: { emp_code: 'IT005' } });

  // Assign roles to users
  await prisma.user_roles.createMany({
    data: [
      { user_id: adminUser.id, role_id: adminRole.id },
      { user_id: johnUser.id, role_id: technicianRole.id },
      { user_id: sarahUser.id, role_id: technicianRole.id },
      { user_id: mikeUser.id, role_id: technicianRole.id },
      { user_id: annaUser.id, role_id: technicianRole.id },
      { user_id: chrisUser.id, role_id: technicianRole.id },
      { user_id: lisaUser.id, role_id: userRole.id },
      { user_id: davidUser.id, role_id: userRole.id },
      { user_id: emmaUser.id, role_id: userRole.id },
      { user_id: robertUser.id, role_id: userRole.id }
    ]
  });
  
  console.log('Assigned roles to users');

  // Create holidays
  const currentYear = new Date().getFullYear();
  await prisma.holiday.createMany({
    data: [
      {
        name: 'New Year\'s Day',
        date: new Date(`${currentYear}-01-01`),
        description: 'New Year\'s Day celebration',
        isRecurring: true,
        isActive: true
      },
      {
        name: 'Independence Day',
        date: new Date(`${currentYear}-06-12`),
        description: 'Philippine Independence Day',
        isRecurring: true,
        isActive: true
      },
      {
        name: 'Christmas Day',
        date: new Date(`${currentYear}-12-25`),
        description: 'Christmas Day celebration',
        isRecurring: true,
        isActive: true
      },
      {
        name: 'Good Friday',
        date: new Date(`${currentYear}-03-29`),
        description: 'Good Friday observance',
        isRecurring: true,
        isActive: true
      },
      {
        name: 'Labor Day',
        date: new Date(`${currentYear}-05-01`),
        description: 'International Labor Day',
        isRecurring: true,
        isActive: true
      },
      {
        name: 'Rizal Day',
        date: new Date(`${currentYear}-12-30`),
        description: 'Dr. José Rizal Day',
        isRecurring: true,
        isActive: true
      },
      {
        name: 'Company Anniversary',
        date: new Date(`${currentYear}-09-15`),
        description: 'Company founding anniversary',
        isRecurring: true,
        isActive: true
      }
    ]
  });
  
  console.log('Created holidays');

  // Create skills
  await prisma.skill.createMany({
    data: [
      {
        name: 'Windows Administration',
        category: 'Operating Systems',
        description: 'Windows server and desktop administration',
        isActive: true
      },
      {
        name: 'Linux Administration',
        category: 'Operating Systems',
        description: 'Linux server administration',
        isActive: true
      },
      {
        name: 'Network Configuration',
        category: 'Networking',
        description: 'Network setup and configuration',
        isActive: true
      },
      {
        name: 'Database Management',
        category: 'Database',
        description: 'Database administration and maintenance',
        isActive: true
      },
      {
        name: 'Security Management',
        category: 'Security',
        description: 'Cybersecurity and system security',
        isActive: true
      },
      {
        name: 'Hardware Troubleshooting',
        category: 'Hardware',
        description: 'Computer hardware diagnosis and repair',
        isActive: true
      },
      {
        name: 'Software Installation',
        category: 'Software',
        description: 'Software deployment and configuration',
        isActive: true
      },
      {
        name: 'Backup Management',
        category: 'Data Management',
        description: 'Data backup and recovery procedures',
        isActive: true
      }
    ]
  });
  
  console.log('Created skills');

  // Create support groups
  await prisma.supportGroup.createMany({
    data: [
      {
        name: 'Help Desk',
        description: 'First-level support for general IT issues',
        isActive: true
      },
      {
        name: 'Network Team',
        description: 'Network infrastructure and connectivity support',
        isActive: true
      },
      {
        name: 'Security Team',
        description: 'Information security and cybersecurity support',
        isActive: true
      },
      {
        name: 'Database Team',
        description: 'Database administration and support',
        isActive: true
      },
      {
        name: 'Server Team',
        description: 'Server infrastructure and maintenance',
        isActive: true
      }
    ]
  });
  
  console.log('Created support groups');

  // Create technicians
  await prisma.technician.createMany({
    data: [
      {
        firstName: 'John',
        middleName: 'Michael',
        lastName: 'Smith',
        displayName: 'John M. Smith',
        employeeId: 'IT001',
        primaryEmail: 'john.smith@company.com',
        mobile: '09171234567',
        jobTitle: 'Senior IT Technician',
        departmentId: itDept.id,
        vipUser: false,
        isAdmin: true,
        enableTelephony: true,
        sipUser: 'john.smith',
        extensions: '101',
        costPerHour: 50.00,
        allowedToViewCostPerHour: true,
        serviceRequestApprover: true,
        purchaseApprover: true,
        enableLogin: true,
        loginName: 'john.smith',
        description: 'Senior IT Technician with expertise in network administration and security',
        isActive: true
      },
      {
        firstName: 'Sarah',
        middleName: 'Jane',
        lastName: 'Johnson',
        displayName: 'Sarah J. Johnson',
        employeeId: 'IT002',
        primaryEmail: 'sarah.johnson@company.com',
        mobile: '09187654321',
        jobTitle: 'Network Administrator',
        departmentId: itDept.id,
        vipUser: false,
        isAdmin: false,
        enableTelephony: true,
        sipUser: 'sarah.johnson',
        extensions: '102',
        costPerHour: 45.00,
        allowedToViewCostPerHour: true,
        serviceRequestApprover: true,
        purchaseApprover: false,
        enableLogin: true,
        loginName: 'sarah.johnson',
        description: 'Network Administrator specializing in network infrastructure and security',
        isActive: true
      },
      {
        firstName: 'Mike',
        lastName: 'Wilson',
        displayName: 'Mike Wilson',
        employeeId: 'IT003',
        primaryEmail: 'mike.wilson@company.com',
        mobile: '09198765432',
        jobTitle: 'Help Desk Technician',
        departmentId: itDept.id,
        vipUser: false,
        isAdmin: false,
        enableTelephony: true,
        sipUser: 'mike.wilson',
        extensions: '103',
        costPerHour: 35.00,
        allowedToViewCostPerHour: false,
        serviceRequestApprover: false,
        purchaseApprover: false,
        enableLogin: true,
        loginName: 'mike.wilson',
        description: 'Help Desk Technician providing first-level support to end users',
        isActive: true
      },
      {
        firstName: 'Anna',
        lastName: 'Taylor',
        displayName: 'Anna Taylor',
        employeeId: 'IT004',
        primaryEmail: 'anna.taylor@company.com',
        mobile: '09190123456',
        jobTitle: 'Security Analyst',
        departmentId: itDept.id,
        vipUser: true,
        isAdmin: false,
        enableTelephony: true,
        sipUser: 'anna.taylor',
        extensions: '104',
        costPerHour: 55.00,
        allowedToViewCostPerHour: true,
        serviceRequestApprover: true,
        purchaseApprover: true,
        enableLogin: true,
        loginName: 'anna.taylor',
        description: 'Security Analyst focused on cybersecurity and risk management',
        isActive: true
      },
      {
        firstName: 'Chris',
        lastName: 'Anderson',
        displayName: 'Chris Anderson',
        employeeId: 'IT005',
        primaryEmail: 'chris.anderson@company.com',
        mobile: '09123456789',
        jobTitle: 'Database Administrator',
        departmentId: itDept.id,
        vipUser: false,
        isAdmin: false,
        enableTelephony: false,
        costPerHour: 60.00,
        allowedToViewCostPerHour: true,
        serviceRequestApprover: false,
        purchaseApprover: false,
        enableLogin: true,
        loginName: 'chris.anderson',
        description: 'Database Administrator managing all database systems and data integrity',
        isActive: true
      }
    ]
  });
  
  console.log('Created technicians');

  // Get technician and skill IDs for relationships
  const johnTech = await prisma.technician.findFirst({ where: { employeeId: 'IT001' } });
  const sarahTech = await prisma.technician.findFirst({ where: { employeeId: 'IT002' } });
  const mikeTech = await prisma.technician.findFirst({ where: { employeeId: 'IT003' } });
  const annaTech = await prisma.technician.findFirst({ where: { employeeId: 'IT004' } });
  const chrisTech = await prisma.technician.findFirst({ where: { employeeId: 'IT005' } });

  const windowsSkill = await prisma.skill.findFirst({ where: { name: 'Windows Administration' } });
  const linuxSkill = await prisma.skill.findFirst({ where: { name: 'Linux Administration' } });
  const networkSkill = await prisma.skill.findFirst({ where: { name: 'Network Configuration' } });
  const databaseSkill = await prisma.skill.findFirst({ where: { name: 'Database Management' } });
  const securitySkill = await prisma.skill.findFirst({ where: { name: 'Security Management' } });
  const hardwareSkill = await prisma.skill.findFirst({ where: { name: 'Hardware Troubleshooting' } });
  const softwareSkill = await prisma.skill.findFirst({ where: { name: 'Software Installation' } });
  const backupSkill = await prisma.skill.findFirst({ where: { name: 'Backup Management' } });

  // Assign skills to technicians
  await prisma.technicianSkill.createMany({
    data: [
      // John's skills
      { technicianId: johnTech.id, skillId: windowsSkill.id, proficiencyLevel: 'expert', yearsOfExperience: 8 },
      { technicianId: johnTech.id, skillId: linuxSkill.id, proficiencyLevel: 'advanced', yearsOfExperience: 6 },
      { technicianId: johnTech.id, skillId: networkSkill.id, proficiencyLevel: 'expert', yearsOfExperience: 7 },
      { technicianId: johnTech.id, skillId: securitySkill.id, proficiencyLevel: 'advanced', yearsOfExperience: 5 },
      
      // Sarah's skills
      { technicianId: sarahTech.id, skillId: networkSkill.id, proficiencyLevel: 'expert', yearsOfExperience: 6 },
      { technicianId: sarahTech.id, skillId: securitySkill.id, proficiencyLevel: 'expert', yearsOfExperience: 5 },
      { technicianId: sarahTech.id, skillId: windowsSkill.id, proficiencyLevel: 'advanced', yearsOfExperience: 4 },
      { technicianId: sarahTech.id, skillId: linuxSkill.id, proficiencyLevel: 'intermediate', yearsOfExperience: 3 },
      
      // Mike's skills
      { technicianId: mikeTech.id, skillId: hardwareSkill.id, proficiencyLevel: 'advanced', yearsOfExperience: 4 },
      { technicianId: mikeTech.id, skillId: softwareSkill.id, proficiencyLevel: 'advanced', yearsOfExperience: 3 },
      { technicianId: mikeTech.id, skillId: windowsSkill.id, proficiencyLevel: 'intermediate', yearsOfExperience: 3 },
      
      // Anna's skills
      { technicianId: annaTech.id, skillId: securitySkill.id, proficiencyLevel: 'expert', yearsOfExperience: 7 },
      { technicianId: annaTech.id, skillId: networkSkill.id, proficiencyLevel: 'advanced', yearsOfExperience: 5 },
      { technicianId: annaTech.id, skillId: windowsSkill.id, proficiencyLevel: 'advanced', yearsOfExperience: 4 },
      { technicianId: annaTech.id, skillId: linuxSkill.id, proficiencyLevel: 'advanced', yearsOfExperience: 4 },
      
      // Chris's skills
      { technicianId: chrisTech.id, skillId: databaseSkill.id, proficiencyLevel: 'expert', yearsOfExperience: 8 },
      { technicianId: chrisTech.id, skillId: backupSkill.id, proficiencyLevel: 'expert', yearsOfExperience: 6 },
      { technicianId: chrisTech.id, skillId: linuxSkill.id, proficiencyLevel: 'advanced', yearsOfExperience: 5 },
      { technicianId: chrisTech.id, skillId: windowsSkill.id, proficiencyLevel: 'intermediate', yearsOfExperience: 3 }
    ]
  });
  
  console.log('Assigned skills to technicians');

  // Get support group IDs
  const helpDeskGroup = await prisma.supportGroup.findFirst({ where: { name: 'Help Desk' } });
  const networkGroup = await prisma.supportGroup.findFirst({ where: { name: 'Network Team' } });
  const securityGroup = await prisma.supportGroup.findFirst({ where: { name: 'Security Team' } });
  const databaseGroup = await prisma.supportGroup.findFirst({ where: { name: 'Database Team' } });
  const serverGroup = await prisma.supportGroup.findFirst({ where: { name: 'Server Team' } });

  // Assign technicians to support groups
  await prisma.technicianSupportGroup.createMany({
    data: [
      { technicianId: johnTech.id, supportGroupId: helpDeskGroup.id, isLead: true },
      { technicianId: johnTech.id, supportGroupId: networkGroup.id, isLead: true },
      { technicianId: sarahTech.id, supportGroupId: networkGroup.id, isLead: false },
      { technicianId: sarahTech.id, supportGroupId: securityGroup.id, isLead: true },
      { technicianId: mikeTech.id, supportGroupId: helpDeskGroup.id, isLead: false },
      { technicianId: annaTech.id, supportGroupId: securityGroup.id, isLead: false },
      { technicianId: chrisTech.id, supportGroupId: databaseGroup.id, isLead: true },
      { technicianId: chrisTech.id, supportGroupId: serverGroup.id, isLead: false }
    ]
  });
  
  console.log('Assigned technicians to support groups');

  console.log('Seed completed successfully!');
  
  // Display summary
  const userCount = await prisma.users.count();
  const technicianCount = await prisma.technician.count();
  const departmentCount = await prisma.department.count();
  const holidayCount = await prisma.holiday.count();
  const skillCount = await prisma.skill.count();
  const supportGroupCount = await prisma.supportGroup.count();
  
  console.log('\n=== SEED SUMMARY ===');
  console.log(`Users created: ${userCount}`);
  console.log(`Technicians created: ${technicianCount}`);
  console.log(`Departments created: ${departmentCount}`);
  console.log(`Holidays created: ${holidayCount}`);
  console.log(`Skills created: ${skillCount}`);
  console.log(`Support Groups created: ${supportGroupCount}`);
  console.log('\n=== LOGIN CREDENTIALS ===');
  console.log('Admin User: admin@company.com / password123');
  console.log('All users have password: password123');
  console.log('\n=== TECHNICIAN ACCOUNTS ===');
  console.log('John Smith (IT001) - Admin privileges');
  console.log('Sarah Johnson (IT002) - Network Administrator');
  console.log('Mike Wilson (IT003) - Help Desk Technician');
  console.log('Anna Taylor (IT004) - Security Analyst (VIP)');
  console.log('Chris Anderson (IT005) - Database Administrator');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
