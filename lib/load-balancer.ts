import { prisma } from './prisma';
import { addHistory } from './history';
import fs from 'fs';
import path from 'path';

export interface LoadBalancingConfig {
  supportGroupId: number;
  loadBalanceType: 'round_robin' | 'least_load' | 'random' | 'load_balancing'; // 'load_balancing' is alias of least-load
  priority: number;
  isActive: boolean;
}

export interface TechnicianWorkload {
  technicianId: number; // Note: This is actually the user ID of the technician
  activeTickets: number;
  assignedTickets: number;
  lastAssigned?: Date;
}

export interface AssignmentResult {
  success?: boolean;
  technicianId?: number; // Note: This is actually the user ID of the technician
  technicianName?: string;
  technicianEmail?: string;
  supportGroupId?: number;
  supportGroupName?: string;
  loadBalanceType?: string;
  error?: string;
}

type GlobalStrategy = 'load_balancing' | 'round_robin' | 'random' | 'least_load';

function getAutoAssignConfigPath() {
  const CONFIG_DIR = path.resolve(process.cwd(), 'config');
  const CONFIG_FILE = path.join(CONFIG_DIR, 'auto-assign.json');
  return { CONFIG_DIR, CONFIG_FILE };
}

async function readGlobalStrategyFromDisk(): Promise<Exclude<GlobalStrategy, 'least_load'>> {
  try {
    const { CONFIG_FILE } = getAutoAssignConfigPath();
    if (!fs.existsSync(CONFIG_FILE)) {
      return 'load_balancing';
    }
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
    const json = JSON.parse(raw || '{}');
    const incoming: GlobalStrategy = (json?.strategy || 'load_balancing');
    if (incoming === 'least_load') return 'load_balancing';
    if (incoming === 'round_robin' || incoming === 'random' || incoming === 'load_balancing') return incoming;
    return 'load_balancing';
  } catch (e) {
    console.warn('Failed to read global auto-assign strategy from disk, defaulting to load_balancing:', e);
    return 'load_balancing';
  }
}

/**
 * Get technician workload statistics
 */
export async function getTechnicianWorkload(userId: number): Promise<TechnicianWorkload> {
  try {
    // Count active tickets assigned to this user (technician)
    const activeTickets = await prisma.request.count({
      where: {
        formData: {
          path: ['assignedTechnicianId'],
          // Match the user id stored as a string in JSON
          equals: userId.toString() as any
        },
        status: {
          in: ['open', 'on_hold', 'for_approval']
        }
      }
    });

    // Count all tickets assigned to this user (technician) (historical)
    const assignedTickets = await prisma.request.count({
      where: {
        formData: {
          path: ['assignedTechnicianId'],
          equals: userId.toString() as any
        }
      }
    });

    // Get last assignment timestamp
    const lastAssignedRequest = await prisma.request.findFirst({
      where: {
        formData: {
          path: ['assignedTechnicianId'],
          equals: userId.toString() as any
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      select: {
        updatedAt: true
      }
    });

    return {
      technicianId: userId, // This field name is kept for backward compatibility
      activeTickets,
      assignedTickets,
      lastAssigned: lastAssignedRequest?.updatedAt
    };
  } catch (error) {
    console.error(`Error getting technician workload for user ${userId}:`, error);
    return {
      technicianId: userId, // This field name is kept for backward compatibility
      activeTickets: 0,
      assignedTickets: 0
    };
  }
}

/**
 * Get all active technicians from a support group with their workload
 */
export async function getSupportGroupTechnicians(supportGroupId: number): Promise<Array<{ 
  id: number; 
  name: string; 
  email: string; 
  workload: TechnicianWorkload 
}>> {
  try {
    const technicians = await prisma.technician.findMany({
      where: {
        isActive: true,
        supportGroupMemberships: {
          some: {
            supportGroupId: supportGroupId,
            supportGroup: {
              isActive: true
            }
          }
        }
      },
      include: {
        user: {
          select: {
            id: true,
            emp_fname: true,
            emp_lname: true,
            emp_email: true
          }
        }
      }
    });

    const techniciansWithWorkload = await Promise.all(
      technicians.map(async (tech) => {
        const workload = await getTechnicianWorkload(tech.id);
        return {
          id: tech.user.id, // Use user ID instead of technician ID
          name: `${tech.user.emp_fname} ${tech.user.emp_lname}`.trim(),
          email: tech.user.emp_email || '',
          workload
        };
      })
    );

    return techniciansWithWorkload;
  } catch (error) {
    console.error(`Error getting support group technicians for group ${supportGroupId}:`, error);
    return [];
  }
}

/**
 * Build a map of the last assignment time per technician in a support group, based on formData.assignedDate
 * to avoid biasing on updatedAt and ensure proper round-robin tie breaking.
 */
export async function getLastAssignedMapForGroup(supportGroupId: number): Promise<Record<number, Date>> {
  try {
    // Get user IDs of technicians in this support group (since we store user IDs in assignedTechnicianId)
    const techs = await prisma.technician.findMany({
      where: {
        isActive: true,
        supportGroupMemberships: { some: { supportGroupId, supportGroup: { isActive: true } } },
      },
      include: {
        user: {
          select: { id: true }
        }
      }
    });
    const userIdSet = new Set(techs.map(t => t.user.id.toString()));
    if (userIdSet.size === 0) return {};

    // Fetch recent requests that have assignedTechnicianId in this set
    // Limit to a reasonable window to keep it fast
    const recent = await prisma.request.findMany({
      where: {
        formData: {
          path: ['assignedTechnicianId'],
          not: null as any,
        },
      },
      orderBy: { updatedAt: 'desc' },
      select: { formData: true, updatedAt: true },
      take: 300,
    });

    const map: Record<number, Date> = {};
    for (const r of recent) {
      const fd = (r.formData as any) || {};
      const userIdStr = fd.assignedTechnicianId ? String(fd.assignedTechnicianId) : undefined;
      if (!userIdStr || !userIdSet.has(userIdStr)) continue;
      const userIdNum = parseInt(userIdStr, 10);
      if (map[userIdNum]) continue; // already have the most recent one due to ordering
      // Prefer assignedDate in formData; fall back to updatedAt
      const assignedDateIso: string | undefined = fd.assignedDate ? String(fd.assignedDate) : undefined;
      const d = assignedDateIso ? new Date(assignedDateIso) : new Date(r.updatedAt);
      if (!Number.isNaN(d.getTime())) {
        map[userIdNum] = d;
      }
      // Break early if we already found all
      if (Object.keys(map).length >= userIdSet.size) break;
    }
    return map;
  } catch (err) {
    console.warn('Failed to build last-assigned map for group', supportGroupId, err);
    return {};
  }
}

/**
 * Round robin assignment logic
 */
export async function assignRoundRobin(supportGroupId: number): Promise<{ id: number; name: string; email: string } | null> {
  try {
    const technicians = await getSupportGroupTechnicians(supportGroupId);
    const lastAssignedMap = await getLastAssignedMapForGroup(supportGroupId);
    
    if (technicians.length === 0) {
      return null;
    }

    // Sort by last assigned date (ascending) to get the least recently assigned
    technicians.sort((a, b) => {
      const aLast = lastAssignedMap[a.id] || a.workload.lastAssigned;
      const bLast = lastAssignedMap[b.id] || b.workload.lastAssigned;
      const aTime = aLast ? aLast.getTime() : 0;
      const bTime = bLast ? bLast.getTime() : 0;
      return aTime - bTime;
    });
    // Handle tie: if several have the same earliest lastAssigned, pick randomly among them
    const firstTime = (lastAssignedMap[technicians[0].id] || technicians[0].workload.lastAssigned)?.getTime() || 0;
    const tied = technicians.filter(t => {
      const tLast = lastAssignedMap[t.id] || t.workload.lastAssigned;
      const tTime = tLast ? tLast.getTime() : 0;
      return tTime === firstTime;
    });
    const selected = tied[Math.floor(Math.random() * tied.length)];
    return {
      id: selected.id,
      name: selected.name,
      email: selected.email
    };
  } catch (error) {
    console.error('Error in round robin assignment:', error);
    return null;
  }
}

/**
 * Least load assignment logic
 */
export async function assignLeastLoad(supportGroupId: number): Promise<{ id: number; name: string; email: string } | null> {
  try {
    const technicians = await getSupportGroupTechnicians(supportGroupId);
    const lastAssignedMap = await getLastAssignedMapForGroup(supportGroupId);
    
    if (technicians.length === 0) {
      return null;
    }

    // Sort by active tickets (ascending) to get the one with least load
    technicians.sort((a, b) => {
      // Primary sort: active tickets
      if (a.workload.activeTickets !== b.workload.activeTickets) {
        return a.workload.activeTickets - b.workload.activeTickets;
      }
      // Secondary sort: last assigned (ascending)
      const aLast = lastAssignedMap[a.id] || a.workload.lastAssigned;
      const bLast = lastAssignedMap[b.id] || b.workload.lastAssigned;
      const aTime = aLast ? aLast.getTime() : 0;
      const bTime = bLast ? bLast.getTime() : 0;
      return aTime - bTime;
    });
    // Handle tie: technicians with same minimal activeTickets and lastAssigned
    const minActive = technicians[0].workload.activeTickets;
    const firstTime = (lastAssignedMap[technicians[0].id] || technicians[0].workload.lastAssigned)?.getTime() || 0;
    const tied = technicians.filter(t => {
      const tLast = lastAssignedMap[t.id] || t.workload.lastAssigned;
      const tTime = tLast ? tLast.getTime() : 0;
      return t.workload.activeTickets === minActive && tTime === firstTime;
    });
    const selected = tied[Math.floor(Math.random() * tied.length)];
    return {
      id: selected.id,
      name: selected.name,
      email: selected.email
    };
  } catch (error) {
    console.error('Error in least load assignment:', error);
    return null;
  }
}

/**
 * Random assignment logic
 */
export async function assignRandom(supportGroupId: number): Promise<{ id: number; name: string; email: string } | null> {
  try {
    const technicians = await getSupportGroupTechnicians(supportGroupId);
    
    if (technicians.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * technicians.length);
    const selected = technicians[randomIndex];
    
    return {
      id: selected.id,
      name: selected.name,
      email: selected.email
    };
  } catch (error) {
    console.error('Error in random assignment:', error);
    return null;
  }
}

/**
 * Get support group assignments for a template (for auto-assignment)
 */
export async function getTemplateSupportGroups(templateId: number): Promise<LoadBalancingConfig[]> {
  try {
    const assignments = await prisma.templateSupportGroup.findMany({
      where: {
        templateId: templateId,
        isActive: true,
        supportGroup: {
          isActive: true
        }
      },
      include: {
        supportGroup: {
          select: {
            id: true,
            name: true,
            isActive: true
          }
        }
      },
      orderBy: {
        priority: 'asc'
      }
    });

    return assignments.map(assignment => {
      // Accept both legacy 'least_load' and preferred 'load_balancing'
      const raw = (assignment.loadBalanceType as string) || 'least_load';
      const mapped: 'round_robin' | 'least_load' | 'random' | 'load_balancing' =
        raw === 'load_balancing' ? 'load_balancing'
        : raw === 'least_load' ? 'load_balancing' // normalize to 'load_balancing'
        : (raw as any);
      return {
        supportGroupId: assignment.supportGroupId,
        loadBalanceType: mapped,
        priority: assignment.priority,
        isActive: assignment.isActive
      };
    });
  } catch (error) {
    console.error(`Error getting template support groups for template ${templateId}:`, error);
    return [];
  }
}

/**
 * Get global load balancing configuration
 */
export async function getGlobalLoadBalancingConfig(): Promise<LoadBalancingConfig[]> {
  try {
    // Build from active support groups. Strategy will be applied later per global setting.
    const supportGroups = await prisma.supportGroup.findMany({
      where: {
        isActive: true,
        technicianMemberships: {
          some: {
            technician: {
              isActive: true
            }
          }
        }
      },
      orderBy: {
        id: 'asc'
      }
    });

    return supportGroups.map((group, index) => ({
      supportGroupId: group.id,
      loadBalanceType: 'load_balancing' as const, // default normalized alias
      priority: index + 1,
      isActive: true
    }));
  } catch (error) {
    console.error('Error getting global load balancing config:', error);
    return [];
  }
}

/**
 * Check for active backup technician configuration for a given technician
 */
async function getActiveBackupTechnician(originalTechnicianUserId: number): Promise<{ backupTechnicianId: number; backupTechnicianUserId: number; backupTechnicianName: string; backupTechnicianEmail: string } | null> {
  try {
    console.log(`🔍 Checking for active backup technician for user ID: ${originalTechnicianUserId}`);
    
    console.log(`🔍 Checking for backup configuration for user ID ${originalTechnicianUserId}...`);
    
    const now = new Date();
    
    // Create date range to handle same-day configurations properly
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    
    console.log(`🔍 Checking backup configs active between ${todayStart.toISOString()} and ${todayEnd.toISOString()}`);
    
    const activeBackup = await (prisma as any).backup_technicians.findFirst({
      where: {
        original_technician_id: originalTechnicianUserId, // Use user ID directly since relations are to users table
        is_active: true,
        // Configuration is active if current time falls within the backup period
        AND: [
          {
            OR: [
              { start_date: { lte: now } },
              { start_date: { lte: todayEnd } } // Handle same-day configs
            ]
          },
          {
            OR: [
              { end_date: { gte: now } },
              { end_date: { gte: todayStart } } // Handle same-day configs  
            ]
          }
        ]
      },
      include: {
        backup_technician: true // backup_technician is the users table relation
      }
    });

    if (activeBackup) {
      const backupUser = activeBackup.backup_technician;
      const backupTechName = `${backupUser.emp_fname} ${backupUser.emp_lname}`.trim();

      console.log(`✅ Found active backup: ${backupTechName} backing up for user ID ${originalTechnicianUserId}`);

      return {
        backupTechnicianId: activeBackup.backup_technician_id, // This is the user ID
        backupTechnicianUserId: activeBackup.backup_technician_id,
        backupTechnicianName: backupTechName,
        backupTechnicianEmail: backupUser.emp_email || ''
      };
    }

    console.log(`ℹ️ No active backup found for user ID: ${originalTechnicianUserId}`);
    return null;
  } catch (error) {
    console.error('❌ Error checking backup technician:', error);
    return null;
  }
}

/**
 * Auto-assign technician to a request based on load balancing rules
 */
export async function autoAssignTechnician(
  requestId: number,
  templateId?: number,
  options?: { writeHistory?: boolean }
): Promise<AssignmentResult> {
  try {
    console.log(`Starting auto-assignment for request ${requestId}, template ${templateId}`);
    const writeHistory = options?.writeHistory !== false;

  // Get load balancing configuration (template-specific or global)
    let loadBalancingConfigs: LoadBalancingConfig[] = [];
  let globalStrategy: 'round_robin' | 'least_load' | 'random' | 'load_balancing' = 'load_balancing';
  let usedGlobalFallback = false;
    
    if (templateId) {
      loadBalancingConfigs = await getTemplateSupportGroups(templateId);
      console.log(`Found ${loadBalancingConfigs.length} template-specific support groups`);
    }
    
    if (loadBalancingConfigs.length === 0) {
      loadBalancingConfigs = await getGlobalLoadBalancingConfig();
      console.log(`Using global load balancing config with ${loadBalancingConfigs.length} support groups`);
      usedGlobalFallback = true;
    }

    if (loadBalancingConfigs.length === 0) {
      return {
        success: false,
        error: 'No active support groups configured for load balancing'
      };
    }

    // Read global strategy directly from the same config used by the admin page
    try {
      const s = await readGlobalStrategyFromDisk();
      // s is already normalized to exclude legacy 'least_load'
      globalStrategy = s as any;
    } catch (e) {
      console.warn('Unable to read global auto-assign strategy from disk, defaulting to load_balancing');
    }

    // Try to assign from each support group in priority order
    for (const config of loadBalancingConfigs) {
      if (!config.isActive) continue;

    // If template has explicit loadBalanceType per group, use it; otherwise apply the global strategy.
    // When using the global fallback config, force the chosen strategy to the global strategy.
  const chosen = (usedGlobalFallback ? globalStrategy : (config.loadBalanceType || globalStrategy)) as 'round_robin' | 'least_load' | 'random' | 'load_balancing';
  // Normalize alias to implementation names
  const strategy = (chosen === 'load_balancing' ? 'least_load' : chosen) as 'round_robin' | 'least_load' | 'random';
  console.log(`Trying support group ${config.supportGroupId} with ${strategy} strategy`);

      let assignedTechnician: { id: number; name: string; email: string } | null = null;

      // Apply load balancing strategy
      switch (strategy) {
        case 'round_robin':
          assignedTechnician = await assignRoundRobin(config.supportGroupId);
          break;
        case 'least_load':
          assignedTechnician = await assignLeastLoad(config.supportGroupId);
          break;
        case 'random':
          assignedTechnician = await assignRandom(config.supportGroupId);
          break;
        default:
          console.warn(`Unknown load balance type: ${strategy}`);
          continue;
      }

      if (assignedTechnician) {
        console.log(`Assigned technician ${assignedTechnician.name} (ID: ${assignedTechnician.id})`);

        // Get the user ID from the technician record to check for backup
        const technicianRecord = await prisma.technician.findFirst({
          where: { id: assignedTechnician.id }
        });

        // Check for active backup technician configuration using user ID
        let backupConfig = null;
        if (technicianRecord) {
          backupConfig = await getActiveBackupTechnician(technicianRecord.userId);
        }

        let finalTechnicianId = assignedTechnician.id;
        let finalTechnicianUserId = technicianRecord?.userId || assignedTechnician.id;
        let finalTechnicianName = assignedTechnician.name;
        let finalTechnicianEmail = assignedTechnician.email;
        let backupRedirected = false;

        if (backupConfig) {
          console.log(`Found active backup configuration: ${assignedTechnician.name} → ${backupConfig.backupTechnicianName}`);
          
          // Use backup technician details
          finalTechnicianId = backupConfig.backupTechnicianId;
          finalTechnicianUserId = backupConfig.backupTechnicianUserId;
          finalTechnicianName = backupConfig.backupTechnicianName;
          finalTechnicianEmail = backupConfig.backupTechnicianEmail;
          backupRedirected = true;
          console.log(`Redirecting assignment to backup technician: ${finalTechnicianName}`);
        }

        // Convert assignedDate to Philippine time format without Z
        const assignedDatePH = new Date().toLocaleString('en-PH', { 
          timeZone: 'Asia/Manila',
          year: 'numeric',
          month: '2-digit', 
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).replace(/(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2}):(\d{2})/, '$3-$1-$2 $4:$5:$6');

        // Update the request with the assigned (or redirected) technician
        // NOTE: Do NOT update userId - that's the requester, not the assigned technician
        await prisma.request.update({
          where: { id: requestId },
          data: {
            formData: {
              ...(await prisma.request.findUnique({ where: { id: requestId }, select: { formData: true } }))?.formData as any || {},
              assignedTechnicianId: finalTechnicianUserId, // Use user ID, not technician ID
              assignedTechnicianEmail: finalTechnicianEmail,
              assignedDate: assignedDatePH,
              ...(backupRedirected && {
                originalAssignedTechnician: assignedTechnician.name,
                originalAssignedTechnicianId: technicianRecord?.userId || assignedTechnician.id, // Use original user ID
                backupRedirectedAt: new Date().toISOString()
              })
            }
          }
        });

        // Add assignment history unless suppressed (PH-local timestamp)
        if (writeHistory) {
          const historyDetails = backupRedirected
            ? `Request assigned to ${assignedTechnician.name} via load balancing, redirected to backup technician ${finalTechnicianName}`
            : `Request automatically assigned to ${finalTechnicianName} via load balancing`;
            
          await addHistory(prisma as any, {
            requestId,
            action: 'Assigned',
            actorName: 'System',
            actorType: 'system',
            details: historyDetails,
          });
        }

        // Get support group name for response
        const supportGroup = await prisma.supportGroup.findUnique({
          where: { id: config.supportGroupId },
          select: { name: true }
        });

        return {
          success: true,
          technicianId: finalTechnicianId,
          technicianName: finalTechnicianName,
          technicianEmail: finalTechnicianEmail,
          supportGroupId: config.supportGroupId,
          supportGroupName: supportGroup?.name,
          loadBalanceType: chosen,
          ...(backupRedirected && {
            originalTechnicianId: assignedTechnician.id,
            originalTechnicianName: assignedTechnician.name,
            backupRedirected: true
          })
        };
      }
    }

    return {
      success: false,
      error: 'No available technicians found in any configured support group'
    };

  } catch (error) {
    console.error('Error in auto-assignment:', error);
    return {
      success: false,
      error: `Auto-assignment failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
