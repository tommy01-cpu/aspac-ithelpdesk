import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Sample users
  await prisma.users.createMany({
    data: [
      {
        emp_code: 'EMP001',
        emp_fname: 'John',
        emp_mid: 'A',
        emp_lname: 'Doe',
        emp_suffix: '',
        emp_email: 'john.doe@example.com',
        emp_cell: '09171234567',
        post_des: 'Technician',
        department: 'IT',
        emp_status: 'active',
        password: 'defaultPassword123',
      },
      {
        emp_code: 'EMP002',
        emp_fname: 'Jane',
        emp_mid: 'B',
        emp_lname: 'Smith',
        emp_suffix: '',
        emp_email: 'jane.smith@example.com',
        emp_cell: '09179876543',
        post_des: 'Technician',
        department: 'HR',
        emp_status: 'active',
        password: 'defaultPassword123',
      },
      {
        emp_code: 'EMP003',
        emp_fname: 'Alice',
        emp_mid: 'C',
        emp_lname: 'Johnson',
        emp_suffix: '',
        emp_email: 'alice.johnson@example.com',
        emp_cell: '09172345678',
        post_des: 'Technician',
        department: 'Finance',
        emp_status: 'active',
        password: 'defaultPassword123',
      },
    ],
    skipDuplicates: true,
  });

  console.log('Sample users inserted!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
