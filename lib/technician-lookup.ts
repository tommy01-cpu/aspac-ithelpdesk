import { prisma } from './prisma';

/**
 * Helper function to get technician name from user ID
 * Used to dynamically look up technician names instead of storing them
 */
export async function getAssignedTechnicianName(technicianId: string | number | null): Promise<string | null> {
  if (!technicianId) return null;
  
  try {
    const userId = typeof technicianId === 'string' ? parseInt(technicianId) : technicianId;
    
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { 
        emp_fname: true, 
        emp_lname: true
      }
    });
    
    if (user) {
      return `${user.emp_fname} ${user.emp_lname}`.trim();
    }
  } catch (error) {
    console.error('Error looking up technician name for ID:', technicianId, error);
  }
  
  return null;
}

/**
 * Helper function to get full technician info from user ID
 * Returns both name and email for efficiency
 */
export async function getAssignedTechnicianInfo(technicianId: string | number | null): Promise<{
  name: string | null;
  email: string | null;
} | null> {
  if (!technicianId) return null;
  
  try {
    const userId = typeof technicianId === 'string' ? parseInt(technicianId) : technicianId;
    
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { 
        emp_fname: true, 
        emp_lname: true,
        emp_email: true 
      }
    });
    
    if (user) {
      const name = `${user.emp_fname} ${user.emp_lname}`.trim();
      return {
        name,
        email: user.emp_email || null
      };
    }
  } catch (error) {
    console.error('Error looking up technician info for ID:', technicianId, error);
  }
  
  return null;
}