import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ApprovalStatus, RequestStatus } from '@prisma/client';
import { addHistory } from '@/lib/history';
import { calculateSLADueDate } from '@/lib/sla-calculator';
import { autoAssignTechnician } from '@/lib/load-balancer';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { approvalId, action, comments } = await request.json();

    if (!approvalId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get the user from the database
    const user = await prisma.users.findFirst({
      where: { emp_email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get the approval
    const approval = await prisma.requestApproval.findUnique({
      where: { id: parseInt(approvalId) },
      include: {
        request: true
      }
    });

    if (!approval) {
      return NextResponse.json({ error: 'Approval not found' }, { status: 404 });
    }

    // Check if user is authorized to act on this approval (either by ID or email)
    if (approval.approverId !== user.id && approval.approverEmail !== user.emp_email) {
      return NextResponse.json({ error: 'Not authorized to act on this approval' }, { status: 403 });
    }

    // Map action to approval status using the defined constants
    let newApprovalStatus: ApprovalStatus;
    let historyAction: string;
    let historyDetails: string;

    switch (action) {
      case 'approve':
        newApprovalStatus = ApprovalStatus.approved;
        historyAction = 'Approved';
        historyDetails = comments ? `Request approved by ${user.emp_fname} ${user.emp_lname}. Comments: ${comments}` : `Request approved by ${user.emp_fname} ${user.emp_lname}`;
        break;
      case 'reject':
        newApprovalStatus = ApprovalStatus.rejected;
        historyAction = 'Rejected';
        historyDetails = comments ? `Request rejected by ${user.emp_fname} ${user.emp_lname}. Comments: ${comments}` : `Request rejected by ${user.emp_fname} ${user.emp_lname}`;
        break;
      case 'clarification':
        newApprovalStatus = ApprovalStatus.for_clarification;
        historyAction = 'Requested Clarification';
        historyDetails = comments ? `Clarification requested by ${user.emp_fname} ${user.emp_lname}. Message: ${comments}` : `Clarification requested by ${user.emp_fname} ${user.emp_lname}`;
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Create Philippine time by manually adjusting UTC (same as history.ts)
    const now = new Date();
    const philippineTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));

    // Helper function to format date to Philippine time string
    const formatPhilippineTime = (date: Date) => {
      const phTime = new Date(date.getTime() + (8 * 60 * 60 * 1000));
      return phTime.toISOString().replace('T', ' ').replace('Z', '').substring(0, 19);
    };

    const philippineTimeLocal = new Date(now.getTime() );
    // Format the already-adjusted Philippine time without additional timezone conversion
    const philippineTimeString = philippineTimeLocal.toLocaleString("en-US", {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    // Update the approval with new status
    const updatedApproval = await prisma.requestApproval.update({
      where: { id: parseInt(approvalId) },
      data: {
        status: newApprovalStatus,
        actedOn: philippineTime,
        updatedAt: new Date(now.getTime() + (8 * 60 * 60 * 1000)), // Philippine time (+8 hours)
        comments: comments ? `Request ${action}d by ${user.emp_fname} ${user.emp_lname} on ${philippineTimeString}${comments ? '. Comments: ' + comments : ''}` : `Request ${action}d by ${user.emp_fname} ${user.emp_lname} on ${philippineTimeString}`
      }
    });

    // Add to request history
    await addHistory(prisma, {
      requestId: approval.requestId,
      action: historyAction,
      actorName: `${user.emp_fname} ${user.emp_lname}`,
      actorType: 'approver',
      details: historyDetails,
      actorId: user.id,
    });

    // Handle business logic based on approval action
    if (action === 'reject') {
      // If any approval is rejected, automatically close the request
        await prisma.request.update({
          where: { id: approval.requestId },
          data: { 
            status: RequestStatus.closed,
            updatedAt: philippineTime // Use UTC time for database
          }
        });      await addHistory(prisma, {
        requestId: approval.requestId,
        action: 'Request Closed',
        actorName: 'System',
        actorType: 'system',
        details: 'Request automatically closed due to approval rejection',
      });

    } else if (action === 'approve') {
      // Helper to finalize request if all approvals are approved
      const finalizeIfAllApproved = async () => {
        const allApprovals = await prisma.requestApproval.findMany({ where: { requestId: approval.requestId } });
        const everyoneApproved = allApprovals.length > 0 && allApprovals.every(a => a.status === ApprovalStatus.approved);
        if (!everyoneApproved) return;

        // Avoid duplicate finalization
        const currentReq = await prisma.request.findUnique({ where: { id: approval.requestId } });
        if (!currentReq || currentReq.status === RequestStatus.open) return;

        const finalRequest = await prisma.request.update({
          where: { id: approval.requestId },
          data: {
            status: RequestStatus.open,
            updatedAt: philippineTime, // Use Philippine time (already UTC+8)
            formData: {
              ...(approval.request.formData as any || {}),
              '5': 'approved',
            },
          },
          include: { user: true },
        });

        // Trigger SLA and write consolidated Updated entry
        try {
          const templateId = finalRequest.templateId ? parseInt(finalRequest.templateId) : undefined;
          const origin = new URL(request.url).origin;
          const cookie = request.headers.get('cookie') || '';
          const response = await fetch(`${origin}/api/requests/${approval.requestId}/sla-assignment`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              cookie,
            },
            redirect: 'manual',
            body: JSON.stringify({ requestId: approval.requestId, templateId }),
          });

          const isJson = (response.headers.get('content-type') || '').includes('application/json');
          if (response.ok && isJson) {
            const slaResult = await response.json();
            const prevStatus = approval.request.status;
            const prevDue: string | undefined = (approval.request.formData as any)?.slaDueDate;
            const newDue: string | undefined = slaResult?.results?.sla?.dueDate;
            const assignedTechName: string | undefined = slaResult?.results?.assignment?.technician?.name || undefined;
            const autoAssigned: boolean = !!(slaResult?.results?.assignment?.success && !slaResult?.results?.assignment?.technician?.alreadyAssigned);
            const fmt = (iso?: string) => {
              if (!iso) return '-';
              const d = new Date(iso);
              return d.toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
            };
            const lines: string[] = [];
            if (newDue) {
              if (prevDue) lines.push(`DueBy Date changed from ${fmt(prevDue)} to ${fmt(newDue)}`);
              else lines.push(`DueBy Date set to ${fmt(newDue)}`);
            }
            if (assignedTechName) lines.push(`Technician : ${assignedTechName}`);
            lines.push(`Status changed from ${prevStatus.replace(/_/g, ' ')} to Open`);
            lines.push(`Technician Auto Assign : ${autoAssigned ? 'YES' : 'NO'}`);
            await addHistory(prisma, { requestId: approval.requestId, action: 'Updated', actorName: 'System', actorType: 'system', details: lines.join('\n') });
          } else {
            // Fallback path mirrors Image 1 entries
            const priority = (finalRequest.priority || '').toLowerCase();
            let slaHours = 48; if (priority === 'top') slaHours = 4; else if (priority === 'high') slaHours = 8; else if (priority === 'medium') slaHours = 16;
            
            // SLA should start from approval time, not request creation time
            const currentTime = new Date(); // Same time for both slaStartAt and slaCalculatedAt
            const computedDue = await calculateSLADueDate(currentTime, slaHours, { useOperationalHours: true });
            
            // Convert dates to Philippine time format without Z
            const computedDuePH = formatPhilippineTime(computedDue);
            const slaCalculatedAtPH = formatPhilippineTime(currentTime);
            const slaStartAtPH = formatPhilippineTime(currentTime);
            
            await prisma.request.update({ 
              where: { id: approval.requestId }, 
              data: { 
                formData: { 
                  ...(finalRequest.formData as any || {}), 
                  slaHours: slaHours.toString(), 
                  slaDueDate: computedDuePH,
                  slaCalculatedAt: slaCalculatedAtPH,
                  slaStartAt: slaStartAtPH,
                  slaSource: 'fallback'
                } 
              } 
            });
            await addHistory(prisma, { requestId: approval.requestId, action: 'Start Timer', actorName: 'System', actorType: 'system', details: 'Timer started by System and status set to Open' });
            const prevDue = (approval.request.formData as any)?.slaDueDate as string | undefined;
            const fmt = (iso?: string) => { if (!iso) return '-'; const d = new Date(iso); return d.toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }); };
            const lines: string[] = [];
            if (computedDue) {
              if (prevDue) lines.push(`DueBy Date changed from ${fmt(prevDue)} to ${fmt(computedDuePH)}`);
              else lines.push(`DueBy Date set to ${fmt(computedDuePH)}`);
            }
            lines.push(`Status changed from ${approval.request.status.replace(/_/g, ' ')} to Open`);
            lines.push('Technician Auto Assign : NO');
            await addHistory(prisma, { requestId: approval.requestId, action: 'Updated', actorName: 'System', actorType: 'system', details: lines.join('\n') });
          }
        } catch (e) {
          console.error('Safety finalization failed:', e);
        }
      };
      // Check if all approvals in this level are complete
      const levelApprovals = await prisma.requestApproval.findMany({
        where: {
          requestId: approval.requestId,
          level: approval.level
        }
      });

      // Check if all approvals in the current level are approved (including the one we just updated)
      const allLevelApproved = levelApprovals.every(app => {
        // If this is the current approval being processed, consider it approved
        if (app.id === parseInt(approvalId)) {
          return true;
        }
        // For other approvals in this level, check their actual status
        return app.status === ApprovalStatus.approved;
      });
      
      if (allLevelApproved) {
        // Check if there are more levels
        const nextLevelApprovals = await prisma.requestApproval.findMany({
          where: {
            requestId: approval.requestId,
            level: approval.level + 1
          }
        });

        if (nextLevelApprovals.length > 0) {
          // Update next level approvals to pending_approval
          await prisma.requestApproval.updateMany({
            where: {
              requestId: approval.requestId,
              level: approval.level + 1
            },
            data: {
              status: ApprovalStatus.pending_approval,
              sentOn: philippineTime,
              updatedAt: philippineTime
            }
          });

          // Add history for next level activation
          await addHistory(prisma, {
            requestId: approval.requestId,
            action: 'Next Level Activated',
            actorName: 'System',
            actorType: 'system',
            details: `Level ${approval.level + 1} approvals activated`,
          });

          // Server-side auto-approve ONLY the immediate next level duplicates:
          // If an approver in the next level already approved in any previous level, auto-approve their entry.
          try {
            // Collect approvers who approved in lower levels
            const lowerApproved = await prisma.requestApproval.findMany({
              where: {
                requestId: approval.requestId,
                level: { lt: approval.level + 1 },
                status: ApprovalStatus.approved,
              },
              select: { approverId: true, approverEmail: true }
            });

            const approvedEmailSet = new Set(
              lowerApproved
                .map(a => (a.approverEmail || '').toLowerCase())
                .filter(e => !!e)
            );
            const approvedIdSet = new Set(
              lowerApproved
                .map(a => a.approverId)
                .filter((id): id is number => typeof id === 'number')
            );

            // Find next-level pending approvals that are duplicates of previous approvers
            const nextPending = await prisma.requestApproval.findMany({
              where: {
                requestId: approval.requestId,
                level: approval.level + 1,
                status: ApprovalStatus.pending_approval,
              },
              include: {
                approver: { select: { emp_fname: true, emp_lname: true, emp_email: true } }
              }
            });

            const duplicates = nextPending.filter(a => {
              const email = (a.approverEmail || a.approver?.emp_email || '').toLowerCase();
              return (email && approvedEmailSet.has(email)) || (a.approverId && approvedIdSet.has(a.approverId));
            });

            if (duplicates.length > 0) {
              await Promise.all(
                duplicates.map(async (dup) => {
                  // Approve the duplicate
                  await prisma.requestApproval.update({
                    where: { id: dup.id },
                    data: {
                      status: ApprovalStatus.approved,
                      actedOn: philippineTime,
                      updatedAt: philippineTime,
                      comments: dup.comments || 'Auto approved by System since the approver has already approved in one of the previous levels.'
                    }
                  });

                  // History entry reflecting system auto-approval
                  const approverName = dup.approver
                    ? `${dup.approver.emp_fname} ${dup.approver.emp_lname}`
                    : (dup.approverEmail || 'Approver');
                  await addHistory(prisma, {
                    requestId: approval.requestId,
                    action: 'Approved',
                    actorName: 'System',
                    actorType: 'system',
                    details: `Auto approved by System since the approver (${approverName}) has already approved in one of the previous levels.`,
                  });
                })
              );
            }

            // If after auto-approvals, the entire next level is approved, progress the workflow
            const refreshedNextLevel = await prisma.requestApproval.findMany({
              where: { requestId: approval.requestId, level: approval.level + 1 },
            });
            const allNextApproved = refreshedNextLevel.length > 0 && refreshedNextLevel.every(a => a.status === ApprovalStatus.approved);

            if (allNextApproved) {
              // Check if there is a further level (level + 2)
              const furtherLevel = await prisma.requestApproval.findMany({
                where: { requestId: approval.requestId, level: approval.level + 2 },
              });

              if (furtherLevel.length > 0) {
                // Activate next-next level (do not auto-approve further per rule)
                await prisma.requestApproval.updateMany({
                  where: { requestId: approval.requestId, level: approval.level + 2 },
                  data: { 
                    status: ApprovalStatus.pending_approval, 
                    sentOn: philippineTime,
                    updatedAt: philippineTime
                  }
                });
                await addHistory(prisma, {
                  requestId: approval.requestId,
                  action: 'Next Level Activated',
                  actorName: 'System',
                  actorType: 'system',
                  details: `Level ${approval.level + 2} approvals activated`,
                });
              } else {
                // No further levels; if ALL approvals are approved, finalize: set request OPEN and write Image 1 entries
                const allApprovalsNow = await prisma.requestApproval.findMany({ where: { requestId: approval.requestId } });
                const allApprovedNow = allApprovalsNow.every(a => a.status === ApprovalStatus.approved);

                if (allApprovedNow) {
                  const finalRequest = await prisma.request.update({
                    where: { id: approval.requestId },
                    data: {
                      status: RequestStatus.open,
                      updatedAt: philippineTime, // Use Philippine time (+8 hours)
                      formData: {
                        ...(approval.request.formData as any || {}),
                        '5': 'approved'
                      }
                    },
                    include: { user: true }
                  });

                  try {
                    const templateId = finalRequest.templateId ? parseInt(finalRequest.templateId) : undefined;
                    const origin = new URL(request.url).origin;
                    const cookie = request.headers.get('cookie') || '';
                    const response = await fetch(`${origin}/api/requests/${approval.requestId}/sla-assignment`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        cookie,
                      },
                      redirect: 'manual',
                      body: JSON.stringify({ requestId: approval.requestId, templateId })
                    });

                    const isJson = (response.headers.get('content-type') || '').includes('application/json');
                    if (response.ok && isJson) {
                      const slaResult = await response.json();
                      const prevStatus = approval.request.status;
                      const prevDue: string | undefined = (approval.request.formData as any)?.slaDueDate;
                      const newDue: string | undefined = slaResult?.results?.sla?.dueDate;
                      const assignedTechName: string | undefined = slaResult?.results?.assignment?.technician?.name || undefined;
                      const autoAssigned: boolean = !!(slaResult?.results?.assignment?.success && !slaResult?.results?.assignment?.technician?.alreadyAssigned);
                      const fmt = (iso?: string) => {
                        if (!iso) return '-';
                        const d = new Date(iso);
                        return d.toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
                      };
                      const lines: string[] = [];
                      if (newDue) {
                        if (prevDue) lines.push(`DueBy Date changed from ${fmt(prevDue)} to ${fmt(newDue)}`);
                        else lines.push(`DueBy Date set to ${fmt(newDue)}`);
                      }
                      if (assignedTechName) lines.push(`Technician : ${assignedTechName}`);
                      lines.push(`Status changed from ${prevStatus.replace(/_/g, ' ')} to Open`);
                      lines.push(`Technician Auto Assign : ${autoAssigned ? 'YES' : 'NO'}`);
                      await addHistory(prisma, { requestId: approval.requestId, action: 'Updated', actorName: 'System', actorType: 'system', details: lines.join('\n') });
                    } else {
                      // SLA endpoint failed; fallback
                      const priority = (finalRequest.priority || '').toLowerCase();
                      let slaHours = 48; if (priority === 'top') slaHours = 4; else if (priority === 'high') slaHours = 8; else if (priority === 'medium') slaHours = 16;
                      
                      // SLA should start from approval time, not request creation time
                      const currentTime = new Date(); // Same time for both slaStartAt and slaCalculatedAt
                      const computedDue = await calculateSLADueDate(currentTime, slaHours, { useOperationalHours: true });
                      
                      // Convert dates to Philippine time format without Z
                      const computedDuePH = formatPhilippineTime(computedDue);
                      const slaCalculatedAtPH = formatPhilippineTime(currentTime);
                      const slaStartAtPH = formatPhilippineTime(currentTime);
                      
                      await prisma.request.update({ 
                        where: { id: approval.requestId }, 
                        data: { 
                          formData: { 
                            ...(finalRequest.formData as any || {}), 
                            slaHours: slaHours.toString(), 
                            slaDueDate: computedDuePH,
                            slaCalculatedAt: slaCalculatedAtPH,
                            slaStartAt: slaStartAtPH,
                            slaSource: 'fallback'
                          } 
                        } 
                      });
                      await addHistory(prisma, { requestId: approval.requestId, action: 'Start Timer', actorName: 'System', actorType: 'system', details: 'Timer started by System and status set to Open' });
                      const prevDue = (approval.request.formData as any)?.slaDueDate as string | undefined;
                      const fmt = (iso?: string) => { if (!iso) return '-'; const d = new Date(iso); return d.toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }); };
                      const lines: string[] = [];
                      if (computedDue) {
                        if (prevDue) lines.push(`DueBy Date changed from ${fmt(prevDue)} to ${fmt(computedDuePH)}`);
                        else lines.push(`DueBy Date set to ${fmt(computedDuePH)}`);
                      }
                      lines.push(`Status changed from ${approval.request.status.replace(/_/g, ' ')} to Open`);
                      lines.push('Technician Auto Assign : NO');
                      await addHistory(prisma, { requestId: approval.requestId, action: 'Updated', actorName: 'System', actorType: 'system', details: lines.join('\n') });
                    }
                  } catch (e3) {
                    console.error('Finalize after auto-approval failed (SLA/Updated path):', e3);
                  }
                }
              }
            }
          } catch (autoErr) {
            console.warn('Next-level duplicate auto-approval failed:', autoErr);
          }
  } else {
          // All approval levels complete, check if ALL approvals across all levels are approved
          const allRequestApprovals = await prisma.requestApproval.findMany({
            where: { requestId: approval.requestId }
          });

          // Check if all approvals are approved (including the current one we just updated)
          const allApproved = allRequestApprovals.every(app => {
            // If this is the current approval being processed, consider it approved
            if (app.id === parseInt(approvalId)) {
              return true;
            }
            // For other approvals, check their actual status
            return app.status === ApprovalStatus.approved;
          });

          if (allApproved) {
            
            // All approvals complete, update request status to OPEN and formData approval status
            const updatedRequest = await prisma.request.update({
              where: { id: approval.requestId },
              data: { 
                status: RequestStatus.open,
                updatedAt: philippineTime, // Use Philippine time
                formData: {
                  ...(approval.request.formData as any || {}),
                  '5': 'approved' // Update the approval status field
                }
              },
              include: {
                user: true
              }
            });

            // Note: We intentionally do NOT create the generic
            // 'Request Approved - Ready for Work' history entry.
            // Instead we will create 'Start Timer' (from SLA endpoint)
            // and a consolidated 'Updated' entry (below), matching Image 1.

            // Trigger SLA calculation and technician assignment
            try {
              const templateId = updatedRequest.templateId ? parseInt(updatedRequest.templateId) : undefined;
              
              console.log(`Triggering SLA and assignment for request ${approval.requestId}, template ${templateId}`);
              
              // Call the SLA and assignment API
              const origin = new URL(request.url).origin;
              const response = await fetch(`${origin}/api/requests/${approval.requestId}/sla-assignment`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  requestId: approval.requestId,
                  templateId: templateId
                })
              });

              if (response.ok) {
                const slaResult = await response.json();
                console.log('✅ SLA and assignment processing completed:', slaResult.results);

                // We no longer write a separate 'Auto-Assignment Completed' entry.
                // Assignment info will be included in the consolidated 'Updated' entry below.

                // 🆕 Consolidated "Updated" entry to mirror Image 1
                try {
                  const prevStatus = approval.request.status;
                  const prevDue: string | undefined = (approval.request.formData as any)?.slaDueDate;
                  const newDue: string | undefined = slaResult?.results?.sla?.dueDate;
                  const assignedTechName: string | undefined = slaResult?.results?.assignment?.technician?.name || undefined;
                  const autoAssigned: boolean = !!(slaResult?.results?.assignment?.success && !slaResult?.results?.assignment?.technician?.alreadyAssigned);

                  const fmt = (iso?: string) => {
                    if (!iso) return '-';
                    const d = new Date(iso);
                    return d.toLocaleString('en-US', {
                      month: 'short', day: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit', hour12: true
                    });
                  };

                  const lines: string[] = [];
                  if (newDue) {
                    if (prevDue) lines.push(`DueBy Date changed from ${fmt(prevDue)} to ${fmt(newDue)}`);
                    else lines.push(`DueBy Date set to ${fmt(newDue)}`);
                  }
                  if (assignedTechName) {
                    lines.push(`Technician : ${assignedTechName}`);
                  }
                  lines.push(`Status changed from ${prevStatus.replace(/_/g, ' ')} to Open`);
                  lines.push(`Technician Auto Assign : ${autoAssigned ? 'YES' : 'NO'}`);

                  await addHistory(prisma, {
                    requestId: approval.requestId,
                    action: 'Updated',
                    actorName: 'System',
                    actorType: 'system',
                    details: lines.join('\n'),
                  });
                } catch (e) {
                  console.warn('Failed to add consolidated Updated history entry:', e);
                }
              } else {
                // SLA endpoint failed — replace error entry with Image 1 entries instead.
                const errorText = await response.text().catch(() => 'Unknown error');
                console.error('❌ SLA and assignment processing failed:', errorText);

                try {
                  // Fallback: compute SLA locally and optionally attempt assignment
                  const priority = (updatedRequest.priority || '').toLowerCase();
                  let slaHours = 48; // default low
                  if (priority === 'top') slaHours = 4;
                  else if (priority === 'high') slaHours = 8;
                  else if (priority === 'medium') slaHours = 16;

                  // SLA should start from approval time, not request creation time
                  const currentTime = new Date(); // Same time for both slaStartAt and slaCalculatedAt
                  const computedDue = await calculateSLADueDate(currentTime, slaHours, { useOperationalHours: true });

                  // Convert dates to Philippine time format without Z
                  const computedDuePH = formatPhilippineTime(computedDue);
                  const slaCalculatedAtPH = formatPhilippineTime(currentTime);
                  const slaStartAtPH = formatPhilippineTime(currentTime);

                  // Persist SLA fields in formData
                  await prisma.request.update({
                    where: { id: approval.requestId },
                    data: {
                      formData: {
                        ...(updatedRequest.formData as any || {}),
                        slaHours: slaHours.toString(),
                        slaDueDate: computedDuePH,
                        slaCalculatedAt: slaCalculatedAtPH,
                        slaStartAt: slaStartAtPH,
                        slaSource: 'fallback'
                      },
                    },
                  });

                  // Start Timer entry (as in Image 1)
                  await addHistory(prisma, {
                    requestId: approval.requestId,
                    action: 'Start Timer',
                    actorName: 'System',
                    actorType: 'system',
                    details: 'Timer started by System and status set to Open',
                  });

                  // Try auto-assign directly (best-effort)
                  let assignedTechName: string | undefined;
                  try {
                    const templateId = updatedRequest.templateId ? parseInt(updatedRequest.templateId) : undefined;
                    const assignment = await autoAssignTechnician(approval.requestId, templateId);
                    if (assignment.success && assignment.technicianName) {
                      assignedTechName = assignment.technicianName;
                    }
                  } catch {
                    // ignore
                  }

                  // Consolidated Updated entry
                  const prevDue = (approval.request.formData as any)?.slaDueDate as string | undefined;
                  const fmt = (iso?: string) => {
                    if (!iso) return '-';
                    const d = new Date(iso);
                    return d.toLocaleString('en-US', {
                      month: 'short', day: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit', hour12: true,
                    });
                  };
                  const lines: string[] = [];
                  if (computedDue) {
                    if (prevDue) lines.push(`DueBy Date changed from ${fmt(prevDue)} to ${fmt(computedDuePH)}`);
                    else lines.push(`DueBy Date set to ${fmt(computedDuePH)}`);
                  }
                  if (assignedTechName) lines.push(`Technician : ${assignedTechName}`);
                  lines.push(`Status changed from ${approval.request.status.replace(/_/g, ' ')} to Open`);
                  lines.push(`Technician Auto Assign : ${assignedTechName ? 'YES' : 'NO'}`);

                  await addHistory(prisma, {
                    requestId: approval.requestId,
                    action: 'Updated',
                    actorName: 'System',
                    actorType: 'system',
                    details: lines.join('\n'),
                  });

                } catch (fallbackErr) {
                  console.warn('Fallback SLA/assignment failed to create Image 1 entries:', fallbackErr);
                }
              }
            } catch (slaError) {
              console.error('❌ Error triggering SLA and assignment:', slaError);
              // Replace the error entry by producing Image 1 entries via local fallback
              try {
                const priority = (updatedRequest.priority || '').toLowerCase();
                let slaHours = 48; // default low
                if (priority === 'top') slaHours = 4;
                else if (priority === 'high') slaHours = 8;
                else if (priority === 'medium') slaHours = 16;

                // SLA should start from approval time, not request creation time
                const currentTime = new Date(); // Same time for both slaStartAt and slaCalculatedAt
                const computedDue = await calculateSLADueDate(currentTime, slaHours, { useOperationalHours: true });

                // Convert dates to Philippine time format without Z
                const computedDuePH = formatPhilippineTime(computedDue);
                const slaCalculatedAtPH = formatPhilippineTime(currentTime);
                const slaStartAtPH = formatPhilippineTime(currentTime);

                await prisma.request.update({
                  where: { id: approval.requestId },
                  data: {
                    formData: {
                      ...(updatedRequest.formData as any || {}),
                      slaHours: slaHours.toString(),
                      slaDueDate: computedDuePH,
                      slaCalculatedAt: slaCalculatedAtPH,
                      slaStartAt: slaStartAtPH,
                      slaSource: 'fallback'
                    },
                  },
                });

                await addHistory(prisma, {
                  requestId: approval.requestId,
                  action: 'Start Timer',
                  actorName: 'System',
                  actorType: 'system',
                  details: 'Timer started by System and status set to Open',
                });

                // Best-effort assignment; ignore result if fails
                let assignedTechName: string | undefined;
                try {
                  const templateId = updatedRequest.templateId ? parseInt(updatedRequest.templateId) : undefined;
                  const assignment = await autoAssignTechnician(approval.requestId, templateId);
                  if (assignment.success && assignment.technicianName) {
                    assignedTechName = assignment.technicianName;
                  }
                } catch {}

                const prevDue = (approval.request.formData as any)?.slaDueDate as string | undefined;
                const fmt = (iso?: string) => {
                  if (!iso) return '-';
                  const d = new Date(iso);
                  return d.toLocaleString('en-US', {
                    month: 'short', day: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', hour12: true,
                  });
                };
                const lines: string[] = [];
                if (computedDue) {
                  if (prevDue) lines.push(`DueBy Date changed from ${fmt(prevDue)} to ${fmt(computedDuePH)}`);
                  else lines.push(`DueBy Date set to ${fmt(computedDuePH)}`);
                }
                if (assignedTechName) lines.push(`Technician : ${assignedTechName}`);
                lines.push(`Status changed from ${approval.request.status.replace(/_/g, ' ')} to Open`);
                lines.push(`Technician Auto Assign : ${assignedTechName ? 'YES' : 'NO'}`);

                await addHistory(prisma, {
                  requestId: approval.requestId,
                  action: 'Updated',
                  actorName: 'System',
                  actorType: 'system',
                  details: lines.join('\n'),
                });

              } catch (fallbackErr) {
                console.warn('Fallback SLA/assignment (exception path) failed to create Image 1 entries:', fallbackErr);
              }
            }
          }
        }
      }

      // Final safety check: if everything is approved, ensure we finalize and write history
      await finalizeIfAllApproved();
    } else if (action === 'clarification') {
      // For clarification, we only update the approval status
      // The request status remains unchanged
      
      // Create a conversation entry for clarification  
      if (comments && comments.trim()) {
        try {
          // Create Philippine time by manually adjusting UTC (same as history.ts)
          const conversationNow = new Date();
          const conversationTime = new Date(conversationNow.getTime() + (8 * 60 * 60 * 1000));
          
          // Try to create an approval conversation entry using Prisma
          await prisma.approvalConversation.create({
            data: {
              approvalId: parseInt(approvalId),
              authorId: user.id,
              type: 'technician',
              message: comments.trim(),
              isRead: false,
              createdAt: conversationTime,
              readBy: [user.id],
            }
          });
        } catch (error) {
          console.log('ApprovalConversation table not available, using history instead');
          // Fallback to history if conversation table doesn't exist
          await addHistory(prisma, {
            requestId: approval.requestId,
            action: 'Conversation',
            actorName: `${user.emp_fname} ${user.emp_lname}`,
            actorType: 'approver',
            details: `Clarification message: ${comments}`,
            actorId: user.id,
          });
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Request ${action}d successfully`,
      approval: updatedApproval 
    });
  } catch (error) {
    console.error('Error processing approval action:', error);
    return NextResponse.json(
      { error: 'Failed to process approval action' },
      { status: 500 }
    );
  }
}
