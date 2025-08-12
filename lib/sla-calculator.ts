import { prisma } from './prisma';
import fs from 'fs';
import path from 'path';
import { PHILIPPINES_TIMEZONE } from './time-utils';

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

// Holiday support: read from config/holidays.json if present
function getHolidaySet(): Set<string> {
  try {
    const file = path.resolve(process.cwd(), 'config', 'holidays.json');
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf8');
      const json = JSON.parse(raw || '{}');
      const list: string[] = Array.isArray(json?.holidays) ? json.holidays : [];
      return new Set(list.map(d => String(d).slice(0, 10)));
    }
  } catch (e) {
    console.warn('Failed to read holidays.json; continuing without holidays');
  }
  return new Set<string>();
}

const HOLIDAYS = getHolidaySet();

function toPHT(date: Date): Date {
  // Convert to Asia/Manila wall-clock date
  return new Date(date.toLocaleString('en-US', { timeZone: PHILIPPINES_TIMEZONE }));
}

function isHoliday(date: Date): boolean {
  const pht = toPHT(date);
  const y = pht.getFullYear();
  const m = (pht.getMonth() + 1).toString().padStart(2, '0');
  const d = pht.getDate().toString().padStart(2, '0');
  const key = `${y}-${m}-${d}`;
  return HOLIDAYS.has(key);
}

/**
 * Compute the number of working minutes in a typical working day based on the
 * configured operational hours. If schedules vary by day, this returns the
 * average across enabled working days. Breaks are subtracted. If round-clock,
 * returns 24h worth of minutes.
 */
export function getDailyWorkingMinutes(operationalHours: OperationalHours): number {
  if (operationalHours.workingTimeType === 'round-clock') {
    return 24 * 60;
  }

  // Helper to compute minutes between two HH:MM strings
  const spanMinutes = (start: string, end: string): number => {
    const [sh, sm] = start.split(':').map((n) => parseInt(n, 10));
    const [eh, em] = end.split(':').map((n) => parseInt(n, 10));
    return (eh * 60 + em) - (sh * 60 + sm);
  };

  const enabledDays = (operationalHours.workingDays || []).filter(
    (d) => d.isEnabled && d.scheduleType !== 'not-set'
  );
  if (enabledDays.length === 0) {
    // Fallback to 8h if nothing configured
    return 8 * 60;
  }

  const minutesPerDay: number[] = enabledDays.map((day) => {
    const start = day.scheduleType === 'custom'
      ? (day.customStartTime || operationalHours.standardStartTime || '08:00')
      : (operationalHours.standardStartTime || '08:00');
    const end = day.scheduleType === 'custom'
      ? (day.customEndTime || operationalHours.standardEndTime || '18:00')
      : (operationalHours.standardEndTime || '18:00');

    let minutes = Math.max(0, spanMinutes(start, end));
    const breaks = day.breakHours || [];
    for (const b of breaks) {
      minutes -= Math.max(0, spanMinutes(b.startTime, b.endTime));
    }
    return Math.max(0, minutes);
  });

  // Average across enabled days to represent a typical day
  const sum = minutesPerDay.reduce((a, b) => a + b, 0);
  return sum / minutesPerDay.length;
}

/**
 * Convert a (days, hours, minutes) SLA specification to total working hours,
 * using the operational-hours-based working day length. If round-clock, days
 * are treated as 24h each.
 */
export function componentsToWorkingHours(
  days: number,
  hours: number,
  minutes: number,
  operationalHours: OperationalHours
): number {
  const dailyMinutes = getDailyWorkingMinutes(operationalHours);
  const totalMinutes = Math.max(0, days) * dailyMinutes + Math.max(0, hours) * 60 + Math.max(0, minutes);
  return totalMinutes / 60;
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
  // Holidays are always non-working days unless round-clock
  if (operationalHours.workingTimeType !== 'round-clock' && isHoliday(date)) {
    return false;
  }
  const pht = toPHT(date);
  const dayOfWeek = pht.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
  const timeString = pht.toTimeString().slice(0, 5); // "HH:MM"

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
  if (operationalHours.workingTimeType === 'round-clock') {
    return currentDate;
  }
  // Step minute-by-minute until we hit a working minute (respects holidays via isWithinWorkingHours)
  const maxMinutes = 60 * 24 * 14; // up to 2 weeks
  let steps = 0;
  while (!isWithinWorkingHours(currentDate, operationalHours) && steps < maxMinutes) {
    currentDate.setMinutes(currentDate.getMinutes() + 1);
    steps++;
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
  slaHours: number,
  options?: { useOperationalHours?: boolean }
): Promise<Date> {
  // If explicitly told to ignore operational hours, treat as round-the-clock
  if (options?.useOperationalHours === false) {
    const due = new Date(ticketCreatedDate);
    due.setHours(due.getHours() + slaHours);
    return due;
  }
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
