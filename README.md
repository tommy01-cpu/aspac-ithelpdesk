# Project Prisma Schema Overview

This documentation provides the Prisma schema definitions for the core models used in the application:
- **Department**
- **Holiday**
- **Technician**

All models are defined in `prisma/schema.prisma`.

---

## Department Model

```prisma
model Department {
  id          Int       @id @default(autoincrement())
  name        String    @unique
  description String?
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // Relationships
  technicians Technician[]

  @@map("departments")
}
```

## Holiday Model

```prisma
model Holiday {
  id          Int       @id @default(autoincrement())
  name        String
  date        DateTime  @db.Date
  description String?
  isRecurring Boolean   @default(false)
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@map("holidays")
}
```

## Technician Model

```prisma
model Technician {
  id                    Int         @id @default(autoincrement())
  firstName             String      @db.VarChar(100)
  middleName            String?     @db.VarChar(100)
  lastName              String      @db.VarChar(100)
  displayName           String      @db.VarChar(200)
  employeeId            String      @unique @db.VarChar(50)

  // Contact Information
  primaryEmail          String?     @db.VarChar(150)
  secondaryEmail        String?     @db.VarChar(150)
  phone                 String?     @db.VarChar(50)
  mobile                String?     @db.VarChar(50)
  smsMailId             String?     @db.VarChar(150)

  // Job Information
  jobTitle              String?     @db.VarChar(100)
  departmentId          Int?
  reportingToId         Int?

  // System Settings
  vipUser               Boolean     @default(false)
  enableTelephony       Boolean     @default(false)
  sipUser               String?     @db.VarChar(100)
  extensions            String?     @db.VarChar(100)

  // Financial
  costPerHour           Decimal     @default(0.00) @db.Decimal(10, 2)
  allowedToViewCostPerHour Boolean @default(false)

  // Permissions
  serviceRequestApprover Boolean   @default(false)
  purchaseApprover      Boolean     @default(false)

  // Login Settings
  enableLogin           Boolean     @default(false)
  loginName             String?     @unique @db.VarChar(100)

  // Additional Information
  description           String?
  status                String      @default("active") @db.VarChar(20)
  isActive              Boolean     @default(true)

  // Timestamps
  createdAt             DateTime    @default(now())
  updatedAt             DateTime    @updatedAt

  // Relationships
  department            Department? @relation(fields: [departmentId], references: [id])
  reportingTo           Technician? @relation("TechnicianReporting", fields: [reportingToId], references: [id])
  directReports         Technician[] @relation("TechnicianReporting")
  supportGroupMemberships TechnicianSupportGroup[]
  technicianSkills      TechnicianSkill[]

  @@map("technicians")
}
```

---

*Generated on: July 18, 2025*
