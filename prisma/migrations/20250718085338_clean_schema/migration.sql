/*
  Warnings:

  - You are about to drop the `approval_levels` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `approvals` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `incident_template_groups` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `incident_templates` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `level_approvers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `request_attachments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `request_comments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `requests` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `service_categories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `service_template_groups` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `service_templates` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `slas` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `support_group_members` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `technician_profiles` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "approval_levels" DROP CONSTRAINT "approval_levels_serviceTemplateId_fkey";

-- DropForeignKey
ALTER TABLE "approvals" DROP CONSTRAINT "approvals_approvalLevelId_fkey";

-- DropForeignKey
ALTER TABLE "approvals" DROP CONSTRAINT "approvals_approverId_fkey";

-- DropForeignKey
ALTER TABLE "approvals" DROP CONSTRAINT "approvals_requestId_fkey";

-- DropForeignKey
ALTER TABLE "incident_template_groups" DROP CONSTRAINT "incident_template_groups_incidentTemplateId_fkey";

-- DropForeignKey
ALTER TABLE "incident_template_groups" DROP CONSTRAINT "incident_template_groups_supportGroupId_fkey";

-- DropForeignKey
ALTER TABLE "incident_templates" DROP CONSTRAINT "incident_templates_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "incident_templates" DROP CONSTRAINT "incident_templates_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "incident_templates" DROP CONSTRAINT "incident_templates_slaId_fkey";

-- DropForeignKey
ALTER TABLE "level_approvers" DROP CONSTRAINT "level_approvers_approvalLevelId_fkey";

-- DropForeignKey
ALTER TABLE "level_approvers" DROP CONSTRAINT "level_approvers_specificApproverId_fkey";

-- DropForeignKey
ALTER TABLE "request_attachments" DROP CONSTRAINT "request_attachments_requestId_fkey";

-- DropForeignKey
ALTER TABLE "request_comments" DROP CONSTRAINT "request_comments_requestId_fkey";

-- DropForeignKey
ALTER TABLE "request_comments" DROP CONSTRAINT "request_comments_userId_fkey";

-- DropForeignKey
ALTER TABLE "requests" DROP CONSTRAINT "requests_assignedTechnicianId_fkey";

-- DropForeignKey
ALTER TABLE "requests" DROP CONSTRAINT "requests_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "requests" DROP CONSTRAINT "requests_incidentTemplateId_fkey";

-- DropForeignKey
ALTER TABLE "requests" DROP CONSTRAINT "requests_requesterId_fkey";

-- DropForeignKey
ALTER TABLE "requests" DROP CONSTRAINT "requests_serviceTemplateId_fkey";

-- DropForeignKey
ALTER TABLE "service_categories" DROP CONSTRAINT "service_categories_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "service_template_groups" DROP CONSTRAINT "service_template_groups_serviceTemplateId_fkey";

-- DropForeignKey
ALTER TABLE "service_template_groups" DROP CONSTRAINT "service_template_groups_supportGroupId_fkey";

-- DropForeignKey
ALTER TABLE "service_templates" DROP CONSTRAINT "service_templates_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "service_templates" DROP CONSTRAINT "service_templates_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "service_templates" DROP CONSTRAINT "service_templates_slaId_fkey";

-- DropForeignKey
ALTER TABLE "support_group_members" DROP CONSTRAINT "support_group_members_supportGroupId_fkey";

-- DropForeignKey
ALTER TABLE "support_group_members" DROP CONSTRAINT "support_group_members_userId_fkey";

-- DropForeignKey
ALTER TABLE "technician_profiles" DROP CONSTRAINT "technician_profiles_userId_fkey";

-- DropTable
DROP TABLE "approval_levels";

-- DropTable
DROP TABLE "approvals";

-- DropTable
DROP TABLE "incident_template_groups";

-- DropTable
DROP TABLE "incident_templates";

-- DropTable
DROP TABLE "level_approvers";

-- DropTable
DROP TABLE "request_attachments";

-- DropTable
DROP TABLE "request_comments";

-- DropTable
DROP TABLE "requests";

-- DropTable
DROP TABLE "service_categories";

-- DropTable
DROP TABLE "service_template_groups";

-- DropTable
DROP TABLE "service_templates";

-- DropTable
DROP TABLE "slas";

-- DropTable
DROP TABLE "support_group_members";

-- DropTable
DROP TABLE "technician_profiles";

-- DropEnum
DROP TYPE "ApprovalAction";

-- DropEnum
DROP TYPE "ApprovalStatus";

-- DropEnum
DROP TYPE "ApproverType";

-- DropEnum
DROP TYPE "Priority";

-- DropEnum
DROP TYPE "RequestMode";

-- DropEnum
DROP TYPE "RequestStatus";

-- DropEnum
DROP TYPE "RequestType";

-- DropEnum
DROP TYPE "TemplateStatus";
