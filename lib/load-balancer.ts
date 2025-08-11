import { prisma } from './prisma';

export interface LoadBalancingConfig {
  supportGroupId: number;
  loadBalanceType: 'round_robin' | 'least_load' | 'random';
  priority: number;
  isActive: boolean;
}

export interface TechnicianWorkload {
  technicianId: number;
  activeTickets: number;
  assignedTickets: number;
  lastAssigned?: Date;
}

export interface AssignmentResult {
  success: boolean;
  technicianId?: number;
  technicianName?: string;
  technicianEmail?: string;
  supportGroupId?: number;
  supportGroupName?: string;
  loadBalanceType?: string;
  error?: string;
}

/**
 * Get technician workload statistics
 */
export async function getTechnicianWorkload(technicianId: number): Promise<TechnicianWorkload> {
  try {
    // Count active tickets assigned to this technician
    const activeTickets = await prisma.request.count({
      where: {
        formData: {
          path: ['assignedTechnician'],
          string_contains: technicianId.toString()
        },
        status: {
          in: ['open', 'on_hold', 'for_approval']
        }
      }
    });

    // Count all tickets assigned to this technician (historical)
    const assignedTickets = await prisma.request.count({
      where: {
        formData: {
          path: ['assignedTechnician'],
          string_contains: technicianId.toString()
        }
      }
    });

    // Get last assignment timestamp
    const lastAssignedRequest = await prisma.request.findFirst({
      where: {
        formData: {
          path: ['assignedTechnician'],
          string_contains: technicianId.toString()
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
      technicianId,
      activeTickets,
      assignedTickets,
      lastAssigned: lastAssignedRequest?.updatedAt
    };
  } catch (error) {
    console.error(`Error getting technician workload for ${technicianId}:`, error);
    return {
      technicianId,
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
          id: tech.id,
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
 * Round robin assignment logic
 */
export async function assignRoundRobin(supportGroupId: number): Promise<{ id: number; name: string; email: string } | null> {
  try {
    const technicians = await getSupportGroupTechnicians(supportGroupId);
    
    if (technicians.length === 0) {
      return null;
    }

    // Sort by last assigned date (ascending) to get the least recently assigned
    technicians.sort((a, b) => {
      const aTime = a.workload.lastAssigned?.getTime() || 0;
      const bTime = b.workload.lastAssigned?.getTime() || 0;
      return aTime - bTime;
    });

    const selected = technicians[0];
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
      const aTime = a.workload.lastAssigned?.getTime() || 0;
      const bTime = b.workload.lastAssigned?.getTime() || 0;
      return aTime - bTime;
    });

    const selected = technicians[0];
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

    return assignments.map(assignment => ({
      supportGroupId: assignment.supportGroupId,
      loadBalanceType: assignment.loadBalanceType as 'round_robin' | 'least_load' | 'random',
      priority: assignment.priority,
      isActive: assignment.isActive
    }));
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
    // This would come from a global configuration table
    // For now, return a basic configuration based on active support groups
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
      loadBalanceType: 'least_load' as const, // Default to least load
      priority: index + 1,
      isActive: true
    }));
  } catch (error) {
    console.error('Error getting global load balancing config:', error);
    return [];
  }
}

/**
 * Auto-assign technician to a request based on load balancing rules
 */
export async function autoAssignTechnician(requestId: number, templateId?: number): Promise<AssignmentResult> {
  try {
    console.log(`Starting auto-assignment for request ${requestId}, template ${templateId}`);

    // Get load balancing configuration (template-specific or global)
    let loadBalancingConfigs: LoadBalancingConfig[] = [];
    
    if (templateId) {
      loadBalancingConfigs = await getTemplateSupportGroups(templateId);
      console.log(`Found ${loadBalancingConfigs.length} template-specific support groups`);
    }
    
    if (loadBalancingConfigs.length === 0) {
      loadBalancingConfigs = await getGlobalLoadBalancingConfig();
      console.log(`Using global load balancing config with ${loadBalancingConfigs.length} support groups`);
    }

    if (loadBalancingConfigs.length === 0) {
      return {
        success: false,
        error: 'No active support groups configured for load balancing'
      };
    }

    // Try to assign from each support group in priority order
    for (const config of loadBalancingConfigs) {
      if (!config.isActive) continue;

      console.log(`Trying support group ${config.supportGroupId} with ${config.loadBalanceType} strategy`);

      let assignedTechnician: { id: number; name: string; email: string } | null = null;

      // Apply load balancing strategy
      switch (config.loadBalanceType) {
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
          console.warn(`Unknown load balance type: ${config.loadBalanceType}`);
          continue;
      }

      if (assignedTechnician) {
        console.log(`Assigned technician ${assignedTechnician.name} (ID: ${assignedTechnician.id})`);

        // Update the request with the assigned technician
        await prisma.request.update({
          where: { id: requestId },
          data: {
            formData: {
              ...(await prisma.request.findUnique({ where: { id: requestId }, select: { formData: true } }))?.formData as any || {},
              assignedTechnician: assignedTechnician.name,
              assignedTechnicianId: assignedTechnician.id.toString(),
              assignedTechnicianEmail: assignedTechnician.email,
              assignedDate: new Date().toISOString()
            }
          }
        });

        // Add assignment history
        await prisma.requestHistory.create({
          data: {
            requestId: requestId,
            action: 'Assigned',
            actorName: 'System',
            actorType: 'system',
            details: `Request automatically assigned to ${assignedTechnician.name} via ${config.loadBalanceType} load balancing`,
            timestamp: new Date()
          }
        });

        // Get support group name for response
        const supportGroup = await prisma.supportGroup.findUnique({
          where: { id: config.supportGroupId },
          select: { name: true }
        });

        return {
          success: true,
          technicianId: assignedTechnician.id,
          technicianName: assignedTechnician.name,
          technicianEmail: assignedTechnician.email,
          supportGroupId: config.supportGroupId,
          supportGroupName: supportGroup?.name,
          loadBalanceType: config.loadBalanceType
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
