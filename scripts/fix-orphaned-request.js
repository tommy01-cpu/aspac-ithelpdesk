/**
 * Fix Orphaned Request Script
 * 
 * This script handles cases where a request was created but due to connection errors,
 * the related operations (approvals, history, emails) were not completed.
 * 
 * Usage: node scripts/fix-orphaned-request.js <requestId>
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Import required modules
const { addHistory } = require('../lib/history');
const { notifyRequestCreated, notifyApprovalRequired } = require('../lib/notifications');

// Constants from the main API
const REQUEST_STATUS = {
  FOR_APPROVAL: 'for_approval',
  CANCELLED: 'cancelled',
  OPEN: 'open',
  ON_HOLD: 'on_hold',
  RESOLVED: 'resolved',
  CLOSED: 'closed'
};

const APPROVAL_STATUS = {
  PENDING_APPROVAL: 'pending_approval',
  FOR_CLARIFICATION: 'for_clarification', 
  REJECTED: 'rejected',
  APPROVED: 'approved',
};

function formatTimestampForHistory(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Manila'
  });
}

async function fixOrphanedRequest(requestId) {
  try {
    console.log(`🔧 Starting repair for request #${requestId}`);
    
    // 1. Fetch the request with all related data
    const request = await prisma.request.findUnique({
      where: { id: parseInt(requestId) },
      include: {
        user: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true,
            emp_email: true,
            department: true,
            departmentId: true,
            reportingToId: true,
            reportingTo: {
              select: {
                id: true,
                emp_fname: true,
                emp_lname: true,
                emp_email: true,
              }
            },
            userDepartment: {
              select: {
                id: true,
                name: true,
                departmentHead: {
                  select: {
                    id: true,
                    emp_fname: true,
                    emp_lname: true,
                    emp_email: true,
                  }
                }
              }
            }
          }
        },
        approvals: {
          include: {
            approver: {
              select: {
                id: true,
                emp_fname: true,
                emp_lname: true,
                emp_email: true,
              }
            }
          },
          orderBy: [
            { level: 'asc' },
            { createdAt: 'asc' }
          ]
        }
      }
    });

    if (!request) {
      console.error(`❌ Request #${requestId} not found`);
      return false;
    }

    console.log(`📋 Found request #${requestId}:`, {
      status: request.status,
      userId: request.userId,
      templateId: request.templateId,
      approvalsCount: request.approvals.length,
      createdAt: request.createdAt
    });

    // 2. Fetch the template
    const template = await prisma.template.findUnique({
      where: { id: parseInt(request.templateId) },
      select: {
        id: true,
        name: true,
        type: true,
        approvalWorkflow: true,
      }
    });

    if (!template) {
      console.error(`❌ Template #${request.templateId} not found`);
      return false;
    }

    // 3. Check what's missing and repair each component

    // 3.1 Check history entries
    const historyEntries = await prisma.history.findMany({
      where: { requestId: parseInt(requestId) },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`📜 Found ${historyEntries.length} history entries`);
    
    const hasCreatedEntry = historyEntries.some(h => h.action === 'Created');
    const hasApprovalsInitiatedEntry = historyEntries.some(h => h.action === 'Approvals Initiated');

    // 3.2 Create missing history entries
    if (!hasCreatedEntry) {
      console.log('🔧 Creating missing "Created" history entry...');
      const actorName = `${request.user.emp_fname} ${request.user.emp_lname}`;
      
      await addHistory(prisma, {
        requestId: request.id,
        action: "Created",
        actorName: actorName,
        actorType: "user",
        details: actorName,
        actorId: request.user.id,
        createdAt: request.createdAt // Use the original request creation time
      });
      console.log('✅ Created missing "Created" history entry');
    }

    // 3.3 Handle approval workflow if it's missing
    if (template.approvalWorkflow && request.approvals.length === 0) {
      console.log('🔧 Creating missing approval workflow...');
      
      const approvalConfig = template.approvalWorkflow;
      const philippineTime = request.createdAt; // Use original creation time
      
      if (approvalConfig.levels && Array.isArray(approvalConfig.levels)) {
        const templateLevels = approvalConfig.levels;
        
        // Get form data for additional approvers
        const formData = request.formData || {};
        const additionalApprovers = formData['12'] || []; // Field ID 12 is "Select Approvers"
        
        console.log(`📋 Processing ${templateLevels.length} approval levels`);
        
        for (let i = 0; i < templateLevels.length; i++) {
          const level = templateLevels[i];
          const levelNumber = i + 1;
          let levelApproverNames = [];
          
          // For Level 1, check for selected approvers
          if (levelNumber === 1) {
            const processedApproverIds = new Set();
            const hasSelectedApprovers = Array.isArray(additionalApprovers) && additionalApprovers.length > 0;
            
            if (hasSelectedApprovers) {
              console.log('📧 Processing selected approvers for Level 1...');
              
              for (const approverId of additionalApprovers) {
                const numericApproverId = typeof approverId === 'string' ? parseInt(approverId) : approverId;
                
                if (isNaN(numericApproverId) || numericApproverId <= 0 || processedApproverIds.has(numericApproverId)) {
                  continue;
                }
                
                processedApproverIds.add(numericApproverId);
                
                const selectedApprover = await prisma.users.findUnique({
                  where: { id: numericApproverId },
                  select: {
                    id: true,
                    emp_fname: true,
                    emp_lname: true,
                    emp_email: true,
                  }
                });
                
                if (selectedApprover) {
                  const createdApproval = await prisma.requestApproval.create({
                    data: {
                      requestId: request.id,
                      level: levelNumber,
                      name: level.displayName || `Level ${levelNumber}`,
                      approverId: selectedApprover.id,
                      approverName: `${selectedApprover.emp_fname} ${selectedApprover.emp_lname}`,
                      approverEmail: selectedApprover.emp_email,
                      status: APPROVAL_STATUS.PENDING_APPROVAL,
                      sentOn: philippineTime,
                      createdAt: philippineTime,
                      updatedAt: philippineTime,
                    }
                  });
                  
                  levelApproverNames.push(`${selectedApprover.emp_fname} ${selectedApprover.emp_lname}`);
                  console.log(`✅ Created approval for ${selectedApprover.emp_fname} ${selectedApprover.emp_lname}`);
                  
                  // Send notification
                  try {
                    await notifyApprovalRequired(request, template, selectedApprover, createdApproval.id);
                    console.log(`📧 Sent approval notification to ${selectedApprover.emp_fname} ${selectedApprover.emp_lname}`);
                  } catch (notificationError) {
                    console.error(`❌ Failed to send notification to ${selectedApprover.emp_fname} ${selectedApprover.emp_lname}:`, notificationError);
                  }
                }
              }
            } else {
              // Use template approvers for Level 1
              console.log('📧 Processing template approvers for Level 1...');
              
              if (level.approvers && level.approvers.length > 0) {
                for (const approver of level.approvers) {
                  let actualApproverId = null;
                  let approverName = '';
                  
                  const approverValue = String(approver.id || approver.name || approver).toLowerCase();
                  const approverNumericId = parseInt(approver.id || approver.name || approver);
                  
                  // Skip department_head for Level 1 (as per original logic)
                  if (approverValue === 'department_head' || 
                      approverValue.includes('department') && approverValue.includes('head') ||
                      approverNumericId === -2) {
                    continue;
                  }
                  
                  if (approverValue === 'reporting_to' || 
                      approverValue.includes('reporting') || 
                      approverNumericId === -1) {
                    if (request.user && request.user.reportingToId) {
                      actualApproverId = request.user.reportingToId;
                      if (request.user.reportingTo) {
                        approverName = `${request.user.reportingTo.emp_fname} ${request.user.reportingTo.emp_lname}`;
                      }
                    } else {
                      continue;
                    }
                  } else {
                    let userIdToCheck = approver.id;
                    if (typeof userIdToCheck === 'string' && !isNaN(parseInt(userIdToCheck))) {
                      userIdToCheck = parseInt(userIdToCheck);
                    }
                    
                    if (userIdToCheck < 0 && userIdToCheck !== -1 && userIdToCheck !== -2) {
                      continue;
                    }
                    
                    actualApproverId = userIdToCheck;
                    const templateApprover = await prisma.users.findUnique({
                      where: { id: actualApproverId },
                      select: {
                        id: true,
                        emp_fname: true,
                        emp_lname: true,
                        emp_email: true,
                      }
                    });
                    
                    if (templateApprover) {
                      approverName = `${templateApprover.emp_fname} ${templateApprover.emp_lname}`;
                    } else {
                      continue;
                    }
                  }
                  
                  if (actualApproverId && !processedApproverIds.has(actualApproverId)) {
                    processedApproverIds.add(actualApproverId);
                    
                    const approverUser = await prisma.users.findUnique({
                      where: { id: actualApproverId },
                      select: {
                        emp_email: true,
                        emp_fname: true,
                        emp_lname: true,
                      }
                    });
                    
                    const createdApproval = await prisma.requestApproval.create({
                      data: {
                        requestId: request.id,
                        level: levelNumber,
                        name: level.displayName || `Level ${levelNumber}`,
                        approverId: actualApproverId,
                        approverName: approverName,
                        approverEmail: approverUser?.emp_email,
                        status: APPROVAL_STATUS.PENDING_APPROVAL,
                        sentOn: philippineTime,
                        createdAt: philippineTime,
                        updatedAt: philippineTime,
                      }
                    });
                    
                    levelApproverNames.push(approverName);
                    console.log(`✅ Created approval for ${approverName}`);
                    
                    // Send notification
                    try {
                      if (approverUser) {
                        const fullApproverUser = {
                          id: actualApproverId,
                          emp_fname: approverUser.emp_fname,
                          emp_lname: approverUser.emp_lname,
                          emp_email: approverUser.emp_email,
                        };
                        
                        await notifyApprovalRequired(request, template, fullApproverUser, createdApproval.id);
                        console.log(`📧 Sent approval notification to ${approverName}`);
                      }
                    } catch (notificationError) {
                      console.error(`❌ Failed to send notification to ${approverName}:`, notificationError);
                    }
                  }
                }
              }
            }
            
            // Create "Approvals Initiated" history entry for Level 1
            if (levelApproverNames.length > 0) {
              await addHistory(prisma, {
                requestId: request.id,
                action: "Approvals Initiated",
                actorName: "System",
                actorType: "system",
                details: `Approver(s) : ${levelApproverNames.join(', ')}\nLevel : ${level.displayName || `Level ${levelNumber}`}`,
                createdAt: philippineTime
              });
              console.log(`✅ Created "Approvals Initiated" history entry for Level ${levelNumber}`);
            }
          } else {
            // For levels > 1, create dormant approvals (no immediate emails)
            console.log(`🔧 Creating dormant approvals for Level ${levelNumber}...`);
            
            if (level.approvers && level.approvers.length > 0) {
              for (const approver of level.approvers) {
                let actualApproverId = null;
                let approverName = '';
                
                const approverValue = String(approver.id || approver.name || approver).toLowerCase();
                const approverNumericId = parseInt(approver.id || approver.name || approver);
                
                if (approverValue === 'reporting_to' || approverNumericId === -1) {
                  if (request.user && request.user.reportingToId) {
                    actualApproverId = request.user.reportingToId;
                    if (request.user.reportingTo) {
                      approverName = `${request.user.reportingTo.emp_fname} ${request.user.reportingTo.emp_lname}`;
                    }
                  } else {
                    continue;
                  }
                } else if (approverValue === 'department_head' || approverNumericId === -2) {
                  if (request.user && request.user.userDepartment?.departmentHead) {
                    const departmentHead = request.user.userDepartment.departmentHead;
                    actualApproverId = departmentHead.id;
                    approverName = `${departmentHead.emp_fname} ${departmentHead.emp_lname}`;
                  } else {
                    continue;
                  }
                } else {
                  let userIdToCheck = approver.id;
                  if (typeof userIdToCheck === 'string' && !isNaN(parseInt(userIdToCheck))) {
                    userIdToCheck = parseInt(userIdToCheck);
                  }
                  
                  if (userIdToCheck < 0 && userIdToCheck !== -1 && userIdToCheck !== -2) {
                    continue;
                  }
                  
                  actualApproverId = userIdToCheck;
                  const templateApprover = await prisma.users.findUnique({
                    where: { id: actualApproverId },
                    select: {
                      id: true,
                      emp_fname: true,
                      emp_lname: true,
                      emp_email: true,
                    }
                  });
                  
                  if (templateApprover) {
                    approverName = `${templateApprover.emp_fname} ${templateApprover.emp_lname}`;
                  } else {
                    continue;
                  }
                }
                
                if (actualApproverId) {
                  const approverUser = await prisma.users.findUnique({
                    where: { id: actualApproverId },
                    select: {
                      emp_fname: true,
                      emp_lname: true,
                      emp_email: true,
                    }
                  });
                  
                  if (!approverName && approverUser) {
                    approverName = `${approverUser.emp_fname} ${approverUser.emp_lname}`;
                  }
                  
                  await prisma.requestApproval.create({
                    data: {
                      requestId: request.id,
                      level: levelNumber,
                      name: level.displayName || `Level ${levelNumber}`,
                      approverId: actualApproverId,
                      approverName: approverName,
                      approverEmail: approverUser?.emp_email,
                      status: APPROVAL_STATUS.PENDING_APPROVAL,
                      createdAt: philippineTime,
                      updatedAt: philippineTime,
                      // Note: No sentOn field for dormant levels
                    }
                  });
                  
                  console.log(`✅ Created dormant approval for Level ${levelNumber}: ${approverName}`);
                }
              }
            }
          }
        }
      }
    }

    // 3.4 Send request creation notifications if they weren't sent
    console.log('📧 Checking if request creation notifications were sent...');
    
    try {
      await notifyRequestCreated(request, template);
      console.log('✅ Sent request creation notifications');
    } catch (notificationError) {
      console.error('❌ Failed to send request creation notifications:', notificationError);
    }

    console.log(`✅ Successfully repaired request #${requestId}`);
    return true;

  } catch (error) {
    console.error(`❌ Error repairing request #${requestId}:`, error);
    return false;
  }
}

// Main execution
async function main() {
  const requestId = process.argv[2];
  
  if (!requestId) {
    console.error('❌ Please provide a request ID');
    console.log('Usage: node scripts/fix-orphaned-request.js <requestId>');
    process.exit(1);
  }

  console.log(`🔧 Starting orphaned request repair for #${requestId}`);
  
  const success = await fixOrphanedRequest(requestId);
  
  if (success) {
    console.log(`✅ Request #${requestId} has been successfully repaired`);
  } else {
    console.log(`❌ Failed to repair request #${requestId}`);
    process.exit(1);
  }
}

// Handle script execution
if (require.main === module) {
  main()
    .catch((error) => {
      console.error('Script error:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { fixOrphanedRequest };
