/*
  Warnings:

  - You are about to drop the column `uploadedAt` on the `attachments` table. All the data in the column will be lost.
  - The `requestId` column on the `attachments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `userId` on the `attachments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('Low', 'Medium', 'High', 'Top');

-- AlterTable
ALTER TABLE "attachments" DROP COLUMN "uploadedAt",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
DROP COLUMN "requestId",
ADD COLUMN     "requestId" INTEGER,
DROP COLUMN "userId",
ADD COLUMN     "userId" INTEGER NOT NULL;

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
    "profile_image" VARCHAR(255),
    "department" TEXT,
    "reportingToId" INTEGER,
    "departmentHeadId" INTEGER,
    "isServiceApprover" BOOLEAN NOT NULL DEFAULT false,
    "isTechnician" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "departmentHeadId" INTEGER,
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
CREATE TABLE "technicians" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "displayName" VARCHAR(200) NOT NULL,
    "secondaryEmail" VARCHAR(150),
    "phone" VARCHAR(50),
    "mobile" VARCHAR(50),
    "smsMailId" VARCHAR(150),
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
    "reportingToId" INTEGER,
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

-- CreateTable
CREATE TABLE "operational_hours" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER,
    "workingTimeType" TEXT NOT NULL DEFAULT 'standard',
    "standardStartTime" VARCHAR(5),
    "standardEndTime" VARCHAR(5),
    "standardBreakStart" VARCHAR(5),
    "standardBreakEnd" VARCHAR(5),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operational_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "working_days" (
    "id" SERIAL NOT NULL,
    "operationalHoursId" INTEGER NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "scheduleType" TEXT NOT NULL DEFAULT 'standard',
    "customStartTime" VARCHAR(5),
    "customEndTime" VARCHAR(5),

    CONSTRAINT "working_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "break_hours" (
    "id" SERIAL NOT NULL,
    "workingDayId" INTEGER NOT NULL,
    "startTime" VARCHAR(5) NOT NULL,
    "endTime" VARCHAR(5) NOT NULL,

    CONSTRAINT "break_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exclusion_rules" (
    "id" SERIAL NOT NULL,
    "operationalHoursId" INTEGER NOT NULL,
    "excludeOn" VARCHAR(50) NOT NULL,
    "weekSelection" VARCHAR(50),
    "monthSelection" VARCHAR(50) NOT NULL,

    CONSTRAINT "exclusion_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sla_service" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "priority" VARCHAR(20) NOT NULL,
    "category" VARCHAR(100),
    "responseTime" INTEGER NOT NULL,
    "resolutionTime" INTEGER NOT NULL,
    "operationalHours" BOOLEAN NOT NULL DEFAULT true,
    "autoEscalate" BOOLEAN NOT NULL DEFAULT false,
    "escalationTime" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    "matchCriteria" VARCHAR(20) NOT NULL DEFAULT 'ALL',
    "excludeHolidays" BOOLEAN NOT NULL DEFAULT true,
    "excludeWeekends" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "sla_service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sla_service_escalation" (
    "id" SERIAL NOT NULL,
    "slaServiceId" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "timeToEscalate" INTEGER NOT NULL,
    "escalationGroup" VARCHAR(255) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "timing" VARCHAR(100),
    "escalateType" VARCHAR(20),
    "escalateTo" TEXT,

    CONSTRAINT "sla_service_escalation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sla_incident" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "priority" "Priority" NOT NULL DEFAULT 'Medium',
    "resolutionDays" INTEGER NOT NULL DEFAULT 0,
    "resolutionHours" INTEGER NOT NULL DEFAULT 8,
    "resolutionMinutes" INTEGER NOT NULL DEFAULT 0,
    "responseDays" INTEGER NOT NULL DEFAULT 0,
    "responseHours" INTEGER NOT NULL DEFAULT 2,
    "responseMinutes" INTEGER NOT NULL DEFAULT 0,
    "operationalHoursEnabled" BOOLEAN NOT NULL DEFAULT false,
    "excludeHolidays" BOOLEAN NOT NULL DEFAULT false,
    "excludeWeekends" BOOLEAN NOT NULL DEFAULT false,
    "responseEscalationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "responseEscalationPriority" "Priority",
    "resolutionEscalationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "escalateTo" JSONB,
    "escalateType" VARCHAR(20),
    "escalateDays" INTEGER NOT NULL DEFAULT 0,
    "escalateHours" INTEGER NOT NULL DEFAULT 0,
    "escalateMinutes" INTEGER NOT NULL DEFAULT 0,
    "level2Enabled" BOOLEAN NOT NULL DEFAULT false,
    "level2EscalateTo" JSONB,
    "level2Days" INTEGER NOT NULL DEFAULT 0,
    "level2Hours" INTEGER NOT NULL DEFAULT 0,
    "level2Minutes" INTEGER NOT NULL DEFAULT 0,
    "level3Enabled" BOOLEAN NOT NULL DEFAULT false,
    "level3EscalateTo" JSONB,
    "level3Days" INTEGER NOT NULL DEFAULT 0,
    "level3Hours" INTEGER NOT NULL DEFAULT 0,
    "level3Minutes" INTEGER NOT NULL DEFAULT 0,
    "level4Enabled" BOOLEAN NOT NULL DEFAULT false,
    "level4EscalateTo" JSONB,
    "level4Days" INTEGER NOT NULL DEFAULT 0,
    "level4Hours" INTEGER NOT NULL DEFAULT 0,
    "level4Minutes" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    "matchCriteria" VARCHAR(20) NOT NULL DEFAULT 'all',

    CONSTRAINT "sla_incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_support_group" (
    "id" SERIAL NOT NULL,
    "templateId" INTEGER NOT NULL,
    "supportGroupId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "loadBalanceType" VARCHAR(20) NOT NULL DEFAULT 'round_robin',
    "priority" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "template_support_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "type" VARCHAR(20) NOT NULL,
    "categoryId" INTEGER,
    "icon" TEXT,
    "fields" JSONB NOT NULL,
    "approvalWorkflow" JSONB,
    "slaServiceId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "priority_sla" (
    "id" SERIAL NOT NULL,
    "priority" VARCHAR(20) NOT NULL,
    "slaIncidentId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "priority_sla_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_category" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "icon" VARCHAR(255),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "serviceCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "service_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_catalog_item" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "categoryId" INTEGER NOT NULL,
    "templateId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "service_catalog_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requests" (
    "id" SERIAL NOT NULL,
    "templateId" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'open',
    "priority" VARCHAR(50) NOT NULL DEFAULT 'medium',
    "userId" INTEGER NOT NULL,
    "formData" JSONB NOT NULL,
    "attachments" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_approvals" (
    "id" SERIAL NOT NULL,
    "requestId" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'not_sent',
    "approverId" INTEGER,
    "approverName" VARCHAR(200),
    "approverEmail" VARCHAR(200),
    "sentOn" TIMESTAMP(3),
    "actedOn" TIMESTAMP(3),
    "comments" TEXT,
    "isAutoApproval" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "request_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_history" (
    "id" SERIAL NOT NULL,
    "requestId" INTEGER NOT NULL,
    "action" VARCHAR(200) NOT NULL,
    "details" TEXT,
    "actorId" INTEGER,
    "actorName" VARCHAR(200) NOT NULL,
    "actorType" VARCHAR(50) NOT NULL DEFAULT 'user',
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_catalog_item" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "categoryId" INTEGER NOT NULL,
    "templateId" INTEGER,
    "priority" "Priority" NOT NULL DEFAULT 'Medium',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "incident_catalog_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_employee_id_key" ON "users"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "skills_name_key" ON "skills"("name");

-- CreateIndex
CREATE UNIQUE INDEX "support_groups_name_key" ON "support_groups"("name");

-- CreateIndex
CREATE UNIQUE INDEX "technicians_userId_key" ON "technicians"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "technicians_loginName_key" ON "technicians"("loginName");

-- CreateIndex
CREATE UNIQUE INDEX "technician_support_groups_technicianId_supportGroupId_key" ON "technician_support_groups"("technicianId", "supportGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "technician_skills_technicianId_skillId_key" ON "technician_skills"("technicianId", "skillId");

-- CreateIndex
CREATE UNIQUE INDEX "working_days_operationalHoursId_dayOfWeek_key" ON "working_days"("operationalHoursId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "sla_service_escalation_slaServiceId_level_key" ON "sla_service_escalation"("slaServiceId", "level");

-- CreateIndex
CREATE UNIQUE INDEX "template_support_group_templateId_supportGroupId_key" ON "template_support_group"("templateId", "supportGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "priority_sla_priority_key" ON "priority_sla"("priority");

-- CreateIndex
CREATE INDEX "requests_userId_idx" ON "requests"("userId");

-- CreateIndex
CREATE INDEX "requests_templateId_idx" ON "requests"("templateId");

-- CreateIndex
CREATE INDEX "requests_status_idx" ON "requests"("status");

-- CreateIndex
CREATE INDEX "request_approvals_requestId_idx" ON "request_approvals"("requestId");

-- CreateIndex
CREATE INDEX "request_approvals_approverId_idx" ON "request_approvals"("approverId");

-- CreateIndex
CREATE INDEX "request_approvals_status_idx" ON "request_approvals"("status");

-- CreateIndex
CREATE INDEX "request_history_requestId_idx" ON "request_history"("requestId");

-- CreateIndex
CREATE INDEX "request_history_actorId_idx" ON "request_history"("actorId");

-- CreateIndex
CREATE INDEX "request_history_timestamp_idx" ON "request_history"("timestamp");

-- CreateIndex
CREATE INDEX "attachments_requestId_idx" ON "attachments"("requestId");

-- CreateIndex
CREATE INDEX "attachments_userId_idx" ON "attachments"("userId");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_reportingToId_fkey" FOREIGN KEY ("reportingToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_departmentHeadId_fkey" FOREIGN KEY ("departmentHeadId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_departmentHeadId_fkey" FOREIGN KEY ("departmentHeadId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technicians" ADD CONSTRAINT "technicians_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "working_days" ADD CONSTRAINT "working_days_operationalHoursId_fkey" FOREIGN KEY ("operationalHoursId") REFERENCES "operational_hours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "break_hours" ADD CONSTRAINT "break_hours_workingDayId_fkey" FOREIGN KEY ("workingDayId") REFERENCES "working_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exclusion_rules" ADD CONSTRAINT "exclusion_rules_operationalHoursId_fkey" FOREIGN KEY ("operationalHoursId") REFERENCES "operational_hours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sla_service" ADD CONSTRAINT "sla_service_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sla_service" ADD CONSTRAINT "sla_service_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sla_service_escalation" ADD CONSTRAINT "sla_service_escalation_slaServiceId_fkey" FOREIGN KEY ("slaServiceId") REFERENCES "sla_service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sla_incident" ADD CONSTRAINT "sla_incident_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sla_incident" ADD CONSTRAINT "sla_incident_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_support_group" ADD CONSTRAINT "template_support_group_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_support_group" ADD CONSTRAINT "template_support_group_supportGroupId_fkey" FOREIGN KEY ("supportGroupId") REFERENCES "support_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template" ADD CONSTRAINT "template_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "service_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template" ADD CONSTRAINT "template_slaServiceId_fkey" FOREIGN KEY ("slaServiceId") REFERENCES "sla_service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template" ADD CONSTRAINT "template_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template" ADD CONSTRAINT "template_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "priority_sla" ADD CONSTRAINT "priority_sla_slaIncidentId_fkey" FOREIGN KEY ("slaIncidentId") REFERENCES "sla_incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_category" ADD CONSTRAINT "service_category_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_category" ADD CONSTRAINT "service_category_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_catalog_item" ADD CONSTRAINT "service_catalog_item_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "service_category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_catalog_item" ADD CONSTRAINT "service_catalog_item_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_catalog_item" ADD CONSTRAINT "service_catalog_item_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_catalog_item" ADD CONSTRAINT "service_catalog_item_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_approvals" ADD CONSTRAINT "request_approvals_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_approvals" ADD CONSTRAINT "request_approvals_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_history" ADD CONSTRAINT "request_history_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_history" ADD CONSTRAINT "request_history_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_catalog_item" ADD CONSTRAINT "incident_catalog_item_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "service_category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_catalog_item" ADD CONSTRAINT "incident_catalog_item_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_catalog_item" ADD CONSTRAINT "incident_catalog_item_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_catalog_item" ADD CONSTRAINT "incident_catalog_item_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
