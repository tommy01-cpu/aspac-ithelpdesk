-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('Low', 'Medium', 'High', 'Top');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "profile_image" VARCHAR(255);

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

-- CreateIndex
CREATE UNIQUE INDEX "working_days_operationalHoursId_dayOfWeek_key" ON "working_days"("operationalHoursId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "sla_service_escalation_slaServiceId_level_key" ON "sla_service_escalation"("slaServiceId", "level");

-- CreateIndex
CREATE UNIQUE INDEX "template_support_group_templateId_supportGroupId_key" ON "template_support_group"("templateId", "supportGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "priority_sla_priority_key" ON "priority_sla"("priority");

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
ALTER TABLE "template" ADD CONSTRAINT "template_slaServiceId_fkey" FOREIGN KEY ("slaServiceId") REFERENCES "sla_service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template" ADD CONSTRAINT "template_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template" ADD CONSTRAINT "template_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "priority_sla" ADD CONSTRAINT "priority_sla_slaIncidentId_fkey" FOREIGN KEY ("slaIncidentId") REFERENCES "sla_incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
