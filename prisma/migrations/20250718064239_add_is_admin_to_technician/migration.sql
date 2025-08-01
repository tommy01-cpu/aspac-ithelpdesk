-- CreateEnum
CREATE TYPE "TemplateStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'TOP');

-- CreateEnum
CREATE TYPE "RequestMode" AS ENUM ('SELF_SERVICE_PORTAL', 'PHONE_CALL', 'CHAT', 'EMAIL');

-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('SERVICE', 'INCIDENT');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('FOR_APPROVAL', 'CANCELLED', 'OPEN', 'ON_HOLD', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING_APPROVAL', 'PENDING_CLARIFICATION', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ApproverType" AS ENUM ('REPORTING_TO', 'DEPARTMENT_HEAD', 'SPECIFIC_APPROVER');

-- CreateEnum
CREATE TYPE "ApprovalAction" AS ENUM ('PENDING_APPROVAL', 'PENDING_CLARIFICATION', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "middle_name" VARCHAR(100),
    "last_name" VARCHAR(100) NOT NULL,
    "suffix" VARCHAR(20),
    "employee_id" VARCHAR(50),
    "job_title" VARCHAR(100),
    "corporate_email" VARCHAR(150),
    "corporate_mobile_no" VARCHAR(20),
    "password" TEXT NOT NULL,
    "status" VARCHAR(20) DEFAULT 'active',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "department" TEXT,
    "reportingToId" INTEGER,
    "departmentHeadId" INTEGER,
    "isServiceApprover" BOOLEAN NOT NULL DEFAULT false,
    "isTechnician" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technician_profiles" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "displayName" VARCHAR(200) NOT NULL,
    "vipUser" BOOLEAN NOT NULL DEFAULT false,
    "phone" VARCHAR(50),
    "mobile" VARCHAR(50),
    "secondaryEmail" VARCHAR(150),
    "smsMailId" VARCHAR(150),
    "enableTelephony" BOOLEAN NOT NULL DEFAULT false,
    "sipUser" VARCHAR(100),
    "extensions" VARCHAR(100),
    "costPerHour" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "allowedToViewCostPerHour" BOOLEAN NOT NULL DEFAULT false,
    "serviceRequestApprover" BOOLEAN NOT NULL DEFAULT false,
    "purchaseApprover" BOOLEAN NOT NULL DEFAULT false,
    "enableLogin" BOOLEAN NOT NULL DEFAULT false,
    "loginName" VARCHAR(100),
    "description" TEXT,
    "reportingTo" VARCHAR(200),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "technician_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_groups" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_group_members" (
    "id" SERIAL NOT NULL,
    "supportGroupId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "isLead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slas" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "responseTime" INTEGER NOT NULL,
    "resolutionTime" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "slas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_templates" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "status" "TemplateStatus" NOT NULL DEFAULT 'ACTIVE',
    "categoryId" INTEGER NOT NULL,
    "slaId" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "technicianViewConfig" JSONB,
    "userViewConfig" JSONB,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "allApproversMustApprove" BOOLEAN NOT NULL DEFAULT false,
    "sendAutoNotification" BOOLEAN NOT NULL DEFAULT true,
    "assignAfterApproval" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_templates" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "status" "TemplateStatus" NOT NULL DEFAULT 'ACTIVE',
    "categoryId" INTEGER NOT NULL,
    "slaId" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "technicianViewConfig" JSONB,
    "userViewConfig" JSONB,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incident_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_template_groups" (
    "id" SERIAL NOT NULL,
    "serviceTemplateId" INTEGER NOT NULL,
    "supportGroupId" INTEGER NOT NULL,

    CONSTRAINT "service_template_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_template_groups" (
    "id" SERIAL NOT NULL,
    "incidentTemplateId" INTEGER NOT NULL,
    "supportGroupId" INTEGER NOT NULL,

    CONSTRAINT "incident_template_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_levels" (
    "id" SERIAL NOT NULL,
    "serviceTemplateId" INTEGER NOT NULL,
    "levelNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "approval_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "level_approvers" (
    "id" SERIAL NOT NULL,
    "approvalLevelId" INTEGER NOT NULL,
    "approverType" "ApproverType" NOT NULL,
    "specificApproverId" INTEGER,

    CONSTRAINT "level_approvers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requests" (
    "id" SERIAL NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "requestType" "RequestType" NOT NULL,
    "serviceTemplateId" INTEGER,
    "incidentTemplateId" INTEGER,
    "categoryId" INTEGER NOT NULL,
    "requesterId" INTEGER NOT NULL,
    "assignedTechnicianId" INTEGER,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "mode" "RequestMode" NOT NULL DEFAULT 'SELF_SERVICE_PORTAL',
    "status" "RequestStatus" NOT NULL DEFAULT 'FOR_APPROVAL',
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "emailNotifications" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approvals" (
    "id" SERIAL NOT NULL,
    "requestId" INTEGER NOT NULL,
    "approvalLevelId" INTEGER NOT NULL,
    "approverId" INTEGER NOT NULL,
    "action" "ApprovalAction" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "comments" TEXT,
    "actionDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_attachments" (
    "id" SERIAL NOT NULL,
    "requestId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_comments" (
    "id" SERIAL NOT NULL,
    "requestId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holidays" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technicians" (
    "id" SERIAL NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "middleName" VARCHAR(100),
    "lastName" VARCHAR(100) NOT NULL,
    "displayName" VARCHAR(200) NOT NULL,
    "employeeId" VARCHAR(50) NOT NULL,
    "primaryEmail" VARCHAR(150),
    "secondaryEmail" VARCHAR(150),
    "phone" VARCHAR(50),
    "mobile" VARCHAR(50),
    "smsMailId" VARCHAR(150),
    "jobTitle" VARCHAR(100),
    "departmentId" INTEGER,
    "reportingToId" INTEGER,
    "vipUser" BOOLEAN NOT NULL DEFAULT false,
    "enableTelephony" BOOLEAN NOT NULL DEFAULT false,
    "sipUser" VARCHAR(100),
    "extensions" VARCHAR(100),
    "costPerHour" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "allowedToViewCostPerHour" BOOLEAN NOT NULL DEFAULT false,
    "serviceRequestApprover" BOOLEAN NOT NULL DEFAULT false,
    "purchaseApprover" BOOLEAN NOT NULL DEFAULT false,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "enableLogin" BOOLEAN NOT NULL DEFAULT false,
    "loginName" VARCHAR(100),
    "description" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "technicians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technician_support_groups" (
    "id" SERIAL NOT NULL,
    "technicianId" INTEGER NOT NULL,
    "supportGroupId" INTEGER NOT NULL,
    "isLead" BOOLEAN NOT NULL DEFAULT false,
    "assignedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "technician_support_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technician_skills" (
    "id" SERIAL NOT NULL,
    "technicianId" INTEGER NOT NULL,
    "skillId" INTEGER NOT NULL,
    "proficiencyLevel" TEXT NOT NULL DEFAULT 'beginner',
    "yearsOfExperience" INTEGER,
    "certifications" TEXT,
    "notes" TEXT,
    "assignedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "technician_skills_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "technician_profiles_userId_key" ON "technician_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "service_categories_name_key" ON "service_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "support_groups_name_key" ON "support_groups"("name");

-- CreateIndex
CREATE UNIQUE INDEX "support_group_members_supportGroupId_userId_key" ON "support_group_members"("supportGroupId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "slas_name_key" ON "slas"("name");

-- CreateIndex
CREATE UNIQUE INDEX "service_templates_name_categoryId_key" ON "service_templates"("name", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "incident_templates_name_categoryId_key" ON "incident_templates"("name", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "service_template_groups_serviceTemplateId_supportGroupId_key" ON "service_template_groups"("serviceTemplateId", "supportGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "incident_template_groups_incidentTemplateId_supportGroupId_key" ON "incident_template_groups"("incidentTemplateId", "supportGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "approval_levels_serviceTemplateId_levelNumber_key" ON "approval_levels"("serviceTemplateId", "levelNumber");

-- CreateIndex
CREATE UNIQUE INDEX "requests_requestNumber_key" ON "requests"("requestNumber");

-- CreateIndex
CREATE UNIQUE INDEX "approvals_requestId_approvalLevelId_approverId_key" ON "approvals"("requestId", "approvalLevelId", "approverId");

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "skills_name_key" ON "skills"("name");

-- CreateIndex
CREATE UNIQUE INDEX "technicians_employeeId_key" ON "technicians"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "technicians_loginName_key" ON "technicians"("loginName");

-- CreateIndex
CREATE UNIQUE INDEX "technician_support_groups_technicianId_supportGroupId_key" ON "technician_support_groups"("technicianId", "supportGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "technician_skills_technicianId_skillId_key" ON "technician_skills"("technicianId", "skillId");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_reportingToId_fkey" FOREIGN KEY ("reportingToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_departmentHeadId_fkey" FOREIGN KEY ("departmentHeadId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technician_profiles" ADD CONSTRAINT "technician_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_categories" ADD CONSTRAINT "service_categories_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_group_members" ADD CONSTRAINT "support_group_members_supportGroupId_fkey" FOREIGN KEY ("supportGroupId") REFERENCES "support_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_group_members" ADD CONSTRAINT "support_group_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_templates" ADD CONSTRAINT "service_templates_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "service_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_templates" ADD CONSTRAINT "service_templates_slaId_fkey" FOREIGN KEY ("slaId") REFERENCES "slas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_templates" ADD CONSTRAINT "service_templates_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_templates" ADD CONSTRAINT "incident_templates_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "service_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_templates" ADD CONSTRAINT "incident_templates_slaId_fkey" FOREIGN KEY ("slaId") REFERENCES "slas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_templates" ADD CONSTRAINT "incident_templates_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_template_groups" ADD CONSTRAINT "service_template_groups_serviceTemplateId_fkey" FOREIGN KEY ("serviceTemplateId") REFERENCES "service_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_template_groups" ADD CONSTRAINT "service_template_groups_supportGroupId_fkey" FOREIGN KEY ("supportGroupId") REFERENCES "support_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_template_groups" ADD CONSTRAINT "incident_template_groups_incidentTemplateId_fkey" FOREIGN KEY ("incidentTemplateId") REFERENCES "incident_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_template_groups" ADD CONSTRAINT "incident_template_groups_supportGroupId_fkey" FOREIGN KEY ("supportGroupId") REFERENCES "support_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_levels" ADD CONSTRAINT "approval_levels_serviceTemplateId_fkey" FOREIGN KEY ("serviceTemplateId") REFERENCES "service_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "level_approvers" ADD CONSTRAINT "level_approvers_approvalLevelId_fkey" FOREIGN KEY ("approvalLevelId") REFERENCES "approval_levels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "level_approvers" ADD CONSTRAINT "level_approvers_specificApproverId_fkey" FOREIGN KEY ("specificApproverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_assignedTechnicianId_fkey" FOREIGN KEY ("assignedTechnicianId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "service_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_serviceTemplateId_fkey" FOREIGN KEY ("serviceTemplateId") REFERENCES "service_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_incidentTemplateId_fkey" FOREIGN KEY ("incidentTemplateId") REFERENCES "incident_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_approvalLevelId_fkey" FOREIGN KEY ("approvalLevelId") REFERENCES "approval_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_attachments" ADD CONSTRAINT "request_attachments_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_comments" ADD CONSTRAINT "request_comments_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_comments" ADD CONSTRAINT "request_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technicians" ADD CONSTRAINT "technicians_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technicians" ADD CONSTRAINT "technicians_reportingToId_fkey" FOREIGN KEY ("reportingToId") REFERENCES "technicians"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technician_support_groups" ADD CONSTRAINT "technician_support_groups_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "technicians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technician_support_groups" ADD CONSTRAINT "technician_support_groups_supportGroupId_fkey" FOREIGN KEY ("supportGroupId") REFERENCES "support_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technician_skills" ADD CONSTRAINT "technician_skills_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "technicians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technician_skills" ADD CONSTRAINT "technician_skills_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
