import { prisma } from './prisma';

export interface OperationalHours {
  id: number;
  workingTimeType: string;
  standardStartTime?: string | null;
  standardEndTime?: string | null;
  standardBreakStart?: string | null;
  standardBreakEnd?: string | null;
  workingDays: WorkingDay[];
  exclusionRules: ExclusionRule[];
}

export interface WorkingDay {
  id: number;
  dayOfWeek: number;
  isEnabled: boolean;
  scheduleType: string;
  customStartTime?: string | null;
  customEndTime?: string | null;
  breakHours: BreakHour[];
}

export interface BreakHour {
  id: number;
  startTime: string;
  endTime: string;
}

export interface ExclusionRule {
  id: number;
  excludeOn: string;
  weekSelection?: string | null;
  monthSelection: string;
}

/**
 * Get active operational hours configuration
 */
export async function getOperationalHours(): Promise<OperationalHours | null> {
  try {
    const operationalHours = await prisma.operationalHours.findFirst({
      where: { isActive: true },
      include: {
        workingDays: {
          include: {
            breakHours: true,
          },
          orderBy: {
            dayOfWeek: 'asc',
          },
        },
        exclusionRules: true,
      },
    });

    return operationalHours as OperationalHours | null;
  } catch (error) {
    console.error('Error fetching operational hours:', error);
    return null;
  }
}

/**
 * Check if a given date and time is within working hours
 */
export function isWithinWorkingHours(
  date: Date,
  operationalHours: OperationalHours
): boolean {
  const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
  const timeString = date.toTimeString().slice(0, 5); // "HH:MM"

  // If it's round-the-clock, always return true
  if (operationalHours.workingTimeType === 'round-clock') {
    return true;
  }

  // Find working day configuration
  const workingDay = operationalHours.workingDays.find(
    (day) => day.dayOfWeek === dayOfWeek
  );

  // If day is not enabled, it's not working hours
  if (!workingDay || !workingDay.isEnabled || workingDay.scheduleType === 'not-set') {
    return false;
  }

  // Get working hours for the day
  let startTime: string;
  let endTime: string;

  if (workingDay.scheduleType === 'custom') {
    startTime = workingDay.customStartTime || '08:00';
    endTime = workingDay.customEndTime || '18:00';
  } else {
    startTime = operationalHours.standardStartTime || '08:00';
    endTime = operationalHours.standardEndTime || '18:00';
  }

  // Check if current time is within working hours
  if (timeString < startTime || timeString >= endTime) {
    return false;
  }

  // Check if current time is within break hours
  const breakHours = workingDay.breakHours || [];
  for (const breakHour of breakHours) {
    if (timeString >= breakHour.startTime && timeString < breakHour.endTime) {
      return false;
    }
  }

  return true;
}

/**
 * Calculate the next working datetime from a given datetime
 */
export function getNextWorkingDateTime(
  fromDate: Date,
  operationalHours: OperationalHours
): Date {
  let currentDate = new Date(fromDate);

  // If it's round-the-clock, return the same time
  if (operationalHours.workingTimeType === 'round-clock') {
    return currentDate;
  }

  // Find next working time
  let maxIterations = 14; // Max 2 weeks to prevent infinite loops
  
  while (maxIterations > 0 && !isWithinWorkingHours(currentDate, operationalHours)) {
    const dayOfWeek = currentDate.getDay();
    const workingDay = operationalHours.workingDays.find(
      (day) => day.dayOfWeek === dayOfWeek
    );

    if (workingDay && workingDay.isEnabled && workingDay.scheduleType !== 'not-set') {
      // Get working hours for the day
      let startTime: string;
      if (workingDay.scheduleType === 'custom') {
        startTime = workingDay.customStartTime || '08:00';
      } else {
        startTime = operationalHours.standardStartTime || '08:00';
      }

      const [startHour, startMinute] = startTime.split(':').map(Number);
      const dayStart = new Date(currentDate);
      dayStart.setHours(startHour, startMinute, 0, 0);

      // If we're before the start of working hours today, jump to start time
      if (currentDate < dayStart) {
        currentDate = dayStart;
        continue;
      }
    }

    // Move to next day at start of working hours
    currentDate.setDate(currentDate.getDate() + 1);
    const nextDayOfWeek = currentDate.getDay();
    const nextWorkingDay = operationalHours.workingDays.find(
      (day) => day.dayOfWeek === nextDayOfWeek
    );

    if (nextWorkingDay && nextWorkingDay.isEnabled && nextWorkingDay.scheduleType !== 'not-set') {
      let startTime: string;
      if (nextWorkingDay.scheduleType === 'custom') {
        startTime = nextWorkingDay.customStartTime || '08:00';
      } else {
        startTime = operationalHours.standardStartTime || '08:00';
      }

      const [startHour, startMinute] = startTime.split(':').map(Number);
      currentDate.setHours(startHour, startMinute, 0, 0);
    } else {
      currentDate.setHours(0, 0, 0, 0);
    }

    maxIterations--;
  }

  return currentDate;
}

/**
 * Calculate working hours between two dates
 * This is useful for SLA calculations
 */
export function calculateWorkingHours(
  startDate: Date,
  endDate: Date,
  operationalHours: OperationalHours
): number {
  if (operationalHours.workingTimeType === 'round-clock') {
    return (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
  }

  let totalHours = 0;
  let currentDate = new Date(startDate);

  while (currentDate < endDate) {
    if (isWithinWorkingHours(currentDate, operationalHours)) {
      totalHours += 1/60; // Add 1 minute
    }
    currentDate.setMinutes(currentDate.getMinutes() + 1);
  }

  return totalHours;
}

/**
 * Calculate SLA due date based on operational hours
 */
export async function calculateSLADueDate(
  ticketCreatedDate: Date,
  slaHours: number
): Promise<Date> {
  const operationalHours = await getOperationalHours();
  
  if (!operationalHours) {
    // Fallback to business hours if no config
    const dueDate = new Date(ticketCreatedDate);
    dueDate.setHours(dueDate.getHours() + slaHours);
    return dueDate;
  }

  // If round-the-clock, simple calculation
  if (operationalHours.workingTimeType === 'round-clock') {
    const dueDate = new Date(ticketCreatedDate);
    dueDate.setHours(dueDate.getHours() + slaHours);
    return dueDate;
  }

  // Calculate working time
  let remainingHours = slaHours;
  let currentDate = new Date(ticketCreatedDate);

  // Start from next working time if ticket is created outside working hours
  currentDate = getNextWorkingDateTime(currentDate, operationalHours);

  while (remainingHours > 0) {
    if (isWithinWorkingHours(currentDate, operationalHours)) {
      remainingHours -= 1/60; // Subtract 1 minute
    }
    
    if (remainingHours > 0) {
      currentDate.setMinutes(currentDate.getMinutes() + 1);
      
      // Skip to next working day if we hit end of day
      if (!isWithinWorkingHours(currentDate, operationalHours)) {
        currentDate = getNextWorkingDateTime(currentDate, operationalHours);
      }
    }
  }

  return currentDate;
}

/**
 * Check if SLA is breached
 */
export function isSLABreached(
  ticketCreatedDate: Date,
  slaHours: number,
  currentDate: Date = new Date()
): boolean {
  const expectedDueDate = new Date(ticketCreatedDate);
  expectedDueDate.setHours(expectedDueDate.getHours() + slaHours);
  
  return currentDate > expectedDueDate;
}

/**
 * Get SLA status and remaining time
 */
export async function getSLAStatus(
  ticketCreatedDate: Date,
  slaHours: number,
  currentDate: Date = new Date()
): Promise<{
  status: 'on-track' | 'at-risk' | 'breached';
  dueDate: Date;
  remainingHours: number;
  remainingMinutes: number;
}> {
  const dueDate = await calculateSLADueDate(ticketCreatedDate, slaHours);
  const diffMs = dueDate.getTime() - currentDate.getTime();
  const remainingHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
  const remainingMinutes = Math.max(0, Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)));
  
  let status: 'on-track' | 'at-risk' | 'breached';
  
  if (currentDate > dueDate) {
    status = 'breached';
  } else if (remainingHours <= 2) { // At risk if less than 2 hours remaining
    status = 'at-risk';
  } else {
    status = 'on-track';
  }

  return {
    status,
    dueDate,
    remainingHours,
    remainingMinutes,
  };
}
