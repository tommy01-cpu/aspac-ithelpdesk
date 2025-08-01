/*
  Warnings:

  - You are about to drop the column `createdAt` on the `attachments` table. All the data in the column will be lost.
  - You are about to drop the column `filePath` on the `attachments` table. All the data in the column will be lost.
  - You are about to drop the column `storagePath` on the `attachments` table. All the data in the column will be lost.
  - You are about to drop the `break_hours` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `departments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `exclusion_rules` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `holidays` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `incident_catalog_item` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `operational_hours` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `priority_sla` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `requests` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `roles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `service_catalog_item` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `service_category` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `skills` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sla_incident` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sla_service` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sla_service_escalation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `support_groups` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `technician_skills` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `technician_support_groups` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `technicians` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `template` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `template_support_group` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_roles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `working_days` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `fileContent` to the `attachments` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "attachments" DROP CONSTRAINT "attachments_requestId_fkey";

-- DropForeignKey
ALTER TABLE "attachments" DROP CONSTRAINT "attachments_userId_fkey";

-- DropForeignKey
ALTER TABLE "break_hours" DROP CONSTRAINT "break_hours_workingDayId_fkey";

-- DropForeignKey
ALTER TABLE "exclusion_rules" DROP CONSTRAINT "exclusion_rules_operationalHoursId_fkey";

-- DropForeignKey
ALTER TABLE "incident_catalog_item" DROP CONSTRAINT "incident_catalog_item_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "incident_catalog_item" DROP CONSTRAINT "incident_catalog_item_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "incident_catalog_item" DROP CONSTRAINT "incident_catalog_item_templateId_fkey";

-- DropForeignKey
ALTER TABLE "incident_catalog_item" DROP CONSTRAINT "incident_catalog_item_updatedBy_fkey";

-- DropForeignKey
ALTER TABLE "priority_sla" DROP CONSTRAINT "priority_sla_slaIncidentId_fkey";

-- DropForeignKey
ALTER TABLE "requests" DROP CONSTRAINT "requests_userId_fkey";

-- DropForeignKey
ALTER TABLE "service_catalog_item" DROP CONSTRAINT "service_catalog_item_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "service_catalog_item" DROP CONSTRAINT "service_catalog_item_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "service_catalog_item" DROP CONSTRAINT "service_catalog_item_templateId_fkey";

-- DropForeignKey
ALTER TABLE "service_catalog_item" DROP CONSTRAINT "service_catalog_item_updatedBy_fkey";

-- DropForeignKey
ALTER TABLE "service_category" DROP CONSTRAINT "service_category_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "service_category" DROP CONSTRAINT "service_category_updatedBy_fkey";

-- DropForeignKey
ALTER TABLE "sla_incident" DROP CONSTRAINT "sla_incident_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "sla_incident" DROP CONSTRAINT "sla_incident_updatedBy_fkey";

-- DropForeignKey
ALTER TABLE "sla_service" DROP CONSTRAINT "sla_service_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "sla_service" DROP CONSTRAINT "sla_service_updatedBy_fkey";

-- DropForeignKey
ALTER TABLE "sla_service_escalation" DROP CONSTRAINT "sla_service_escalation_slaServiceId_fkey";

-- DropForeignKey
ALTER TABLE "technician_skills" DROP CONSTRAINT "technician_skills_skillId_fkey";

-- DropForeignKey
ALTER TABLE "technician_skills" DROP CONSTRAINT "technician_skills_technicianId_fkey";

-- DropForeignKey
ALTER TABLE "technician_support_groups" DROP CONSTRAINT "technician_support_groups_supportGroupId_fkey";

-- DropForeignKey
ALTER TABLE "technician_support_groups" DROP CONSTRAINT "technician_support_groups_technicianId_fkey";

-- DropForeignKey
ALTER TABLE "technicians" DROP CONSTRAINT "technicians_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "technicians" DROP CONSTRAINT "technicians_reportingToId_fkey";

-- DropForeignKey
ALTER TABLE "template" DROP CONSTRAINT "template_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "template" DROP CONSTRAINT "template_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "template" DROP CONSTRAINT "template_slaServiceId_fkey";

-- DropForeignKey
ALTER TABLE "template" DROP CONSTRAINT "template_updatedBy_fkey";

-- DropForeignKey
ALTER TABLE "template_support_group" DROP CONSTRAINT "template_support_group_supportGroupId_fkey";

-- DropForeignKey
ALTER TABLE "template_support_group" DROP CONSTRAINT "template_support_group_templateId_fkey";

-- DropForeignKey
ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_role_id_fkey";

-- DropForeignKey
ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_user_id_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_departmentHeadId_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_reportingToId_fkey";

-- DropForeignKey
ALTER TABLE "working_days" DROP CONSTRAINT "working_days_operationalHoursId_fkey";

-- AlterTable
ALTER TABLE "attachments" DROP COLUMN "createdAt",
DROP COLUMN "filePath",
DROP COLUMN "storagePath",
ADD COLUMN     "fileContent" BYTEA NOT NULL,
ADD COLUMN     "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "requestId" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT;

-- DropTable
DROP TABLE "break_hours";

-- DropTable
DROP TABLE "departments";

-- DropTable
DROP TABLE "exclusion_rules";

-- DropTable
DROP TABLE "holidays";

-- DropTable
DROP TABLE "incident_catalog_item";

-- DropTable
DROP TABLE "operational_hours";

-- DropTable
DROP TABLE "priority_sla";

-- DropTable
DROP TABLE "requests";

-- DropTable
DROP TABLE "roles";

-- DropTable
DROP TABLE "service_catalog_item";

-- DropTable
DROP TABLE "service_category";

-- DropTable
DROP TABLE "skills";

-- DropTable
DROP TABLE "sla_incident";

-- DropTable
DROP TABLE "sla_service";

-- DropTable
DROP TABLE "sla_service_escalation";

-- DropTable
DROP TABLE "support_groups";

-- DropTable
DROP TABLE "technician_skills";

-- DropTable
DROP TABLE "technician_support_groups";

-- DropTable
DROP TABLE "technicians";

-- DropTable
DROP TABLE "template";

-- DropTable
DROP TABLE "template_support_group";

-- DropTable
DROP TABLE "user_roles";

-- DropTable
DROP TABLE "users";

-- DropTable
DROP TABLE "working_days";

-- DropEnum
DROP TYPE "Priority";
