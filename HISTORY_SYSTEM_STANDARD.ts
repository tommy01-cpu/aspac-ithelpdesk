/**
 * 🎯 STANDARDIZED HISTORY SYSTEM - IMPLEMENTATION GUIDE
 * 
 * This file contains all standardized history entry formats based on the images provided.
 * Each entry follows the exact format and should be used consistently across the system.
 * 
 * ✅ FEATURES:
 * - Date grouping in UI (handled by frontend)
 * - Standardized action names and details format
 * - Consistent icons and styling per activity type
 * - Priority-based sorting within dates
 */

import { prisma } from './lib/prisma';

// =============================================================================
// 📝 1. REQUEST CREATED (Image 1) - Priority 1
// =============================================================================
// WHEN: Immediately after request creation in /api/requests (POST)
// LOCATION: app/api/requests/route.ts
async function createRequestCreatedHistory(requestId: number, requestUser: any) {
  await prisma.requestHistory.create({
    data: {
      requestId: requestId,
      action: "Created",
      actorName: `${requestUser.emp_fname} ${requestUser.emp_lname}`,
      actorType: "user",
      details: `From Host/IP Address : 192.168.1.157`,
      actorId: requestUser.id,
      timestamp: new Date()
    }
  });
}

// =============================================================================
// 📧 2. APPROVALS INITIATED (Image 2 & 4) - Priority 2
// =============================================================================
// WHEN: After approval workflow creation (Level 1) and after each approval (subsequent levels)
// LOCATION: app/api/requests/route.ts (Level 1), app/api/approvals/action/route.ts (subsequent levels)
async function createApprovalsInitiatedHistory(requestId: number, approverNames: string[], levelName: string) {
  await prisma.requestHistory.create({
    data: {
      requestId: requestId,
      action: "Approvals Initiated", 
      actorName: "System",
      actorType: "system",
      details: `Approver(s) : ${approverNames.join(', ')}\nLevel : ${levelName}`,
      timestamp: new Date()
    }
  });
}

// =============================================================================
// ✅ 3. APPROVED (Image 3) - Priority 10
// =============================================================================
// WHEN: When an approval is granted
// LOCATION: app/api/approvals/action/route.ts
async function createApprovedHistory(requestId: number, approver: any, comments?: string) {
  await prisma.requestHistory.create({
    data: {
      requestId: requestId,
      action: "Approved",
      actorName: `${approver.emp_fname} ${approver.emp_lname}`,
      actorType: "approver",
      details: comments || "Approval level completed",
      actorId: approver.id,
      timestamp: new Date()
    }
  });
}

// =============================================================================
// ❌ 4. REJECTED - Priority 10
// =============================================================================
// WHEN: When an approval is rejected
// LOCATION: app/api/approvals/action/route.ts
async function createRejectedHistory(requestId: number, approver: any, comments: string) {
  await prisma.requestHistory.create({
    data: {
      requestId: requestId,
      action: "Rejected",
      actorName: `${approver.emp_fname} ${approver.emp_lname}`,
      actorType: "approver", 
      details: comments || "Request rejected",
      actorId: approver.id,
      timestamp: new Date()
    }
  });
}

// =============================================================================
// ❓ 5. REQUESTED CLARIFICATION - Priority 10
// =============================================================================
// WHEN: When an approver requests clarification
// LOCATION: app/api/approvals/action/route.ts
async function createClarificationHistory(requestId: number, approver: any, message: string) {
  await prisma.requestHistory.create({
    data: {
      requestId: requestId,
      action: "Requested Clarification",
      actorName: `${approver.emp_fname} ${approver.emp_lname}`,
      actorType: "approver",
      details: message,
      actorId: approver.id,
      timestamp: new Date()
    }
  });
}

// =============================================================================
// ⚙️ 6. STATUS UPDATED (Image 5) - Priority 20
// =============================================================================
// WHEN: When request status changes (for_approval -> open, etc.)
// LOCATION: Any API that changes request status
async function createStatusUpdatedHistory(requestId: number, fromStatus: string, toStatus: string) {
  await prisma.requestHistory.create({
    data: {
      requestId: requestId,
      action: "Updated",
      actorName: "System",
      actorType: "system",
      details: `Status Change - from ${fromStatus} to ${toStatus}`,
      timestamp: new Date()
    }
  });
}

// =============================================================================
// ⏱️ 7. START TIMER (Image 6) - Priority 20  
// =============================================================================
// WHEN: When SLA timer starts (usually when status changes to 'open')
// LOCATION: Background job or status change API
async function createStartTimerHistory(requestId: number, status: string) {
  await prisma.requestHistory.create({
    data: {
      requestId: requestId,
      action: "Start Timer",
      actorName: "System", 
      actorType: "system",
      details: `Status - ${status}`,
      timestamp: new Date()
    }
  });
}

// =============================================================================
// 📝 8. WORKLOG ADDED (Image 7) - Priority 30
// =============================================================================
// WHEN: When technician adds work log entry
// LOCATION: app/api/requests/[id]/worklog/route.ts (or similar)
async function createWorkLogHistory(requestId: number, technician: any, timeSpent: string, owner: string) {
  await prisma.requestHistory.create({
    data: {
      requestId: requestId,
      action: "WorkLog Added",
      actorName: `${technician.emp_fname} ${technician.emp_lname}`,
      actorType: "technician",
      details: `Owner : ${owner}\nTime Spent : ${timeSpent}`,
      actorId: technician.id,
      timestamp: new Date()
    }
  });
}

// =============================================================================
// ✅ 9. RESOLVED (Image 8) - Priority 40
// =============================================================================
// WHEN: When request is marked as resolved
// LOCATION: app/api/requests/[id]/resolve/route.ts (or similar)
async function createResolvedHistory(requestId: number, resolver: any, resolutionDetails: string, closureComments?: string) {
  await prisma.requestHistory.create({
    data: {
      requestId: requestId,
      action: "Resolved",
      actorName: `${resolver.emp_fname} ${resolver.emp_lname}`,
      actorType: "technician",
      details: `Resolution : ${resolutionDetails}\nStatus changed from Open to Resolved${closureComments ? `\nRequest Closure Comments : ${closureComments}` : ''}`,
      actorId: resolver.id,
      timestamp: new Date()
    }
  });
}

// =============================================================================
// 📋 10. ASSIGNED - Priority 15
// =============================================================================
// WHEN: When request is assigned to technician/group
// LOCATION: Assignment API
async function createAssignedHistory(requestId: number, technician: any, supportGroup: any, assigner?: any) {
  await prisma.requestHistory.create({
    data: {
      requestId: requestId,
      action: "Assigned",
      actorName: assigner ? `${assigner.emp_fname} ${assigner.emp_lname}` : "System",
      actorType: assigner ? "user" : "system",
      details: `Assigned to : ${technician.displayName || `${technician.emp_fname} ${technician.emp_lname}`}\nGroup : ${supportGroup.name}`,
      actorId: assigner?.id,
      timestamp: new Date()
    }
  });
}

// =============================================================================
// 🔄 11. REOPENED - Priority 20
// =============================================================================
// WHEN: When resolved/closed request is reopened
// LOCATION: Reopen API
async function createReopenedHistory(requestId: number, user: any, reason?: string) {
  await prisma.requestHistory.create({
    data: {
      requestId: requestId,
      action: "Reopened",
      actorName: `${user.emp_fname} ${user.emp_lname}`,
      actorType: "user",
      details: `Request reopened${reason ? `\nReason : ${reason}` : ''}`,
      actorId: user.id,
      timestamp: new Date()
    }
  });
}

// =============================================================================
// 🔒 12. CLOSED - Priority 40
// =============================================================================
// WHEN: When request is closed (final state)
// LOCATION: Closure API or auto-close job
async function createClosedHistory(requestId: number, closer: any, closureReason: string, isAutoClose = false) {
  await prisma.requestHistory.create({
    data: {
      requestId: requestId,
      action: "Closed",
      actorName: isAutoClose ? "System" : `${closer.emp_fname} ${closer.emp_lname}`,
      actorType: isAutoClose ? "system" : "user",
      details: `Closure Reason : ${closureReason}${isAutoClose ? '\nAuto-closed after resolution timeout' : ''}`,
      actorId: isAutoClose ? null : closer.id,
      timestamp: new Date()
    }
  });
}

// =============================================================================
// 🔧 IMPLEMENTATION CHECKLIST
// =============================================================================
/*
✅ COMPLETED:
- [x] Request Created (app/api/requests/route.ts)  
- [x] Approvals Initiated - Level 1 (app/api/requests/route.ts)

🚀 TODO - IMPLEMENT IN THESE FILES:
- [ ] Approved/Rejected/Clarification (app/api/approvals/action/route.ts)
- [ ] Approvals Initiated - Next Level (app/api/approvals/action/route.ts) 
- [ ] Status Updated (status change APIs)
- [ ] Start Timer (SLA/timer APIs)
- [ ] WorkLog Added (worklog APIs)
- [ ] Resolved (resolution APIs) 
- [ ] Assigned (assignment APIs)
- [ ] Reopened (reopen APIs)
- [ ] Closed (closure APIs)

📋 UI IMPLEMENTATION:
- [ ] Update history display to group by date
- [ ] Add proper icons for each action type
- [ ] Implement priority-based sorting within dates
- [ ] Style according to provided images

🎨 ICONS MAPPING:
- Created: Blue dot in circle
- Approvals Initiated: Orange mail icon  
- Approved: Green check circle
- Rejected: Red X circle
- Clarification: Orange question circle
- Updated: Purple settings icon
- Start Timer: Clock icon
- WorkLog: Edit/pencil icon
- Resolved: Green check circle
- Assigned: User icon
- Reopened: Refresh icon
- Closed: Lock icon
*/

export {
  createRequestCreatedHistory,
  createApprovalsInitiatedHistory, 
  createApprovedHistory,
  createRejectedHistory,
  createClarificationHistory,
  createStatusUpdatedHistory,
  createStartTimerHistory,
  createWorkLogHistory,
  createResolvedHistory,
  createAssignedHistory,
  createReopenedHistory,
  createClosedHistory
};
