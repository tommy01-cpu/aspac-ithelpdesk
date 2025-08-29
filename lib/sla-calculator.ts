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

// Holiday support: fetch from database holiday table
async function getHolidaySetFromDB(): Promise<Set<string>> {
  try {
    const holidays = await prisma.holiday.findMany({
      where: {
        isActive: true
      },
      select: {
        date: true
      }
    });
    
    const holidayDates = holidays.map(h => {
      // Convert date to YYYY-MM-DD format
      if (h.date instanceof Date) {
        return h.date.toISOString().split('T')[0];
      }
      return String(h.date).slice(0, 10);
    });
    
    console.log('📅 Loaded holidays from database:', holidayDates);
    return new Set(holidayDates);
  } catch (e) {
    console.warn('Failed to fetch holidays from database; falling back to holidays.json');
    
    // Fallback to JSON file if database fails
    try {
      const file = path.resolve(process.cwd(), 'config', 'holidays.json');
      if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, 'utf8');
        const json = JSON.parse(raw || '{}');
        const list: string[] = Array.isArray(json?.holidays) ? json.holidays : [];
        return new Set(list.map(d => String(d).slice(0, 10)));
      }
    } catch (fallbackError) {
      console.warn('Failed to read holidays.json fallback; continuing without holidays');
    }
    
    return new Set<string>();
  }
}

// Cache holidays to avoid repeated database calls
let HOLIDAYS_CACHE: Set<string> | null = null;
let HOLIDAYS_CACHE_TIMESTAMP = 0;
const HOLIDAYS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getHolidaySet(): Promise<Set<string>> {
  const now = Date.now();
  
  // Return cached holidays if still valid
  if (HOLIDAYS_CACHE && (now - HOLIDAYS_CACHE_TIMESTAMP) < HOLIDAYS_CACHE_TTL) {
    return HOLIDAYS_CACHE;
  }
  
  // Fetch fresh holidays from database
  HOLIDAYS_CACHE = await getHolidaySetFromDB();
  HOLIDAYS_CACHE_TIMESTAMP = now;
  
  return HOLIDAYS_CACHE;
}

function toPHT(date: Date): Date {
  // Simple UTC+8 conversion for Philippine Time
  return new Date(date.getTime() + (8 * 60 * 60 * 1000));
}

async function isHoliday(date: Date): Promise<boolean> {
  const pht = toPHT(date);
  const y = pht.getFullYear();
  const m = (pht.getMonth() + 1).toString().padStart(2, '0');
  const d = pht.getDate().toString().padStart(2, '0');
  const key = `${y}-${m}-${d}`;
  
  const holidays = await getHolidaySet();
  return holidays.has(key);
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
 * using a standard 9-hour working day. For precise SLA calculations,
 * use calculateSLADueDate which accounts for the actual sequence of days.
 * If round-clock, days are treated as 24h each.
 */
export function componentsToWorkingHours(
  days: number,
  hours: number,
  minutes: number,
  operationalHours: OperationalHours
): number {
  if (operationalHours.workingTimeType === 'round-clock') {
    const totalMinutes = Math.max(0, days) * 24 * 60 + Math.max(0, hours) * 60 + Math.max(0, minutes);
    return totalMinutes / 60;
  }

  // Use standard 9-hour working day for SLA calculations (not averaged, not break-adjusted)
  const standardDailyHours = 9;
  const totalMinutes = Math.max(0, days) * standardDailyHours * 60 + Math.max(0, hours) * 60 + Math.max(0, minutes);
  return totalMinutes / 60;
}

/**
 * Calculate working minutes for a specific working day
 */
function getWorkingMinutesForDay(
  workingDay: WorkingDay,
  operationalHours: OperationalHours
): number {
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

  // Calculate total working minutes
  const [sh, sm] = startTime.split(':').map(n => parseInt(n, 10));
  const [eh, em] = endTime.split(':').map(n => parseInt(n, 10));
  let minutes = (eh * 60 + em) - (sh * 60 + sm);

  // Subtract breaks
  const breaks = workingDay.breakHours || [];
  for (const b of breaks) {
    const [bsh, bsm] = b.startTime.split(':').map(n => parseInt(n, 10));
    const [beh, bem] = b.endTime.split(':').map(n => parseInt(n, 10));
    minutes -= Math.max(0, (beh * 60 + bem) - (bsh * 60 + bsm));
  }

  return Math.max(0, minutes);
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
export async function isWithinWorkingHours(
  date: Date,
  operationalHours: OperationalHours
): Promise<boolean> {
  // Holidays are always non-working days unless round-clock
  if (operationalHours.workingTimeType !== 'round-clock' && await isHoliday(date)) {
    return false;
  }
  // For SLA calculations, the input date is already in Philippine time from the API
  const pht = new Date(date);
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
export async function getNextWorkingDateTime(
  fromDate: Date,
  operationalHours: OperationalHours
): Promise<Date> {
  let currentDate = new Date(fromDate);
  if (operationalHours.workingTimeType === 'round-clock') {
    return currentDate;
  }
  // Step minute-by-minute until we hit a working minute (respects holidays via isWithinWorkingHours)
  const maxMinutes = 60 * 24 * 14; // up to 2 weeks
  let steps = 0;
  while (!await isWithinWorkingHours(currentDate, operationalHours) && steps < maxMinutes) {
    currentDate.setMinutes(currentDate.getMinutes() + 1);
    steps++;
  }
  return currentDate;
}

/**
 * Calculate working hours between two dates
 * This is useful for SLA calculations
 */
export async function calculateWorkingHours(
  startDate: Date,
  endDate: Date,
  operationalHours: OperationalHours
): Promise<number> {
  if (operationalHours.workingTimeType === 'round-clock') {
    return (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
  }

  let totalHours = 0;
  let currentDate = new Date(startDate);

  while (currentDate < endDate) {
  if (await isWithinWorkingHours(currentDate, operationalHours)) {
      totalHours += 1/60; // Add 1 minute
    }
    currentDate.setMinutes(currentDate.getMinutes() + 1);
  }

  return totalHours;
}

/**
 * Get working hours for a specific day of the week
 */
function getWorkingHoursForDay(
  dayOfWeek: number,
  operationalHours: OperationalHours
): number {
  const workingDay = operationalHours.workingDays.find(
    (day) => day.dayOfWeek === dayOfWeek
  );

  if (!workingDay || !workingDay.isEnabled || workingDay.scheduleType === 'not-set') {
    return 0;
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

  // Calculate total working minutes
  const [sh, sm] = startTime.split(':').map(n => parseInt(n, 10));
  const [eh, em] = endTime.split(':').map(n => parseInt(n, 10));
  let minutes = (eh * 60 + em) - (sh * 60 + sm);

  // Subtract breaks
  const breaks = workingDay.breakHours || [];
  for (const b of breaks) {
    const [bsh, bsm] = b.startTime.split(':').map(n => parseInt(n, 10));
    const [beh, bem] = b.endTime.split(':').map(n => parseInt(n, 10));
    minutes -= Math.max(0, (beh * 60 + bem) - (bsh * 60 + bsm));
  }

  return Math.max(0, minutes) / 60; // Convert to hours
}

/**
 * Get working hours remaining in the current day from a specific time
 */
function getRemainingWorkingHoursInDay(
  date: Date,
  operationalHours: OperationalHours
): number {
  // For SLA calculations, the input date is already in Philippine time
  const pht = new Date(date);
  const dayOfWeek = pht.getDay();
  const currentTime = pht.toTimeString().slice(0, 5); // "HH:MM"

  const workingDay = operationalHours.workingDays.find(
    (day) => day.dayOfWeek === dayOfWeek
  );

  if (!workingDay || !workingDay.isEnabled || workingDay.scheduleType === 'not-set') {
    return 0;
  }

  // Get end time for the day
  let endTime: string;
  if (workingDay.scheduleType === 'custom') {
    endTime = workingDay.customEndTime || '18:00';
  } else {
    endTime = operationalHours.standardEndTime || '18:00';
  }

  // If current time is past end time, no remaining hours
  if (currentTime >= endTime) {
    return 0;
  }

  // Calculate remaining minutes until end of day
  const [ch, cm] = currentTime.split(':').map(n => parseInt(n, 10));
  const [eh, em] = endTime.split(':').map(n => parseInt(n, 10));
  let remainingMinutes = (eh * 60 + em) - (ch * 60 + cm);

  // Subtract any upcoming breaks
  const breaks = workingDay.breakHours || [];
  for (const b of breaks) {
    if (currentTime < b.startTime) {
      // Break is in the future, subtract it
      const [bsh, bsm] = b.startTime.split(':').map(n => parseInt(n, 10));
      const [beh, bem] = b.endTime.split(':').map(n => parseInt(n, 10));
      const breakMinutes = (beh * 60 + bem) - (bsh * 60 + bsm);
      remainingMinutes -= Math.max(0, breakMinutes);
    } else if (currentTime >= b.startTime && currentTime < b.endTime) {
      // Currently in a break, adjust start time to end of break
      const [beh, bem] = b.endTime.split(':').map(n => parseInt(n, 10));
      remainingMinutes = (eh * 60 + em) - (beh * 60 + bem);
    }
  }

  return Math.max(0, remainingMinutes) / 60; // Convert to hours
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

  let remainingHours = slaHours;
  
  // Work with Philippine time directly - input is already in PHT from database
  let currentPHT = new Date(ticketCreatedDate);
  
  // CRITICAL FIX: If the ticket is created outside working hours, 
  // move to the next working day start time immediately
  if (!await isWithinWorkingHours(currentPHT, operationalHours)) {
    // Move to next working day at start time
    currentPHT = await getNextWorkingDayStart(currentPHT, operationalHours);
  }
  
  // Process day by day until we've consumed all SLA hours
  while (remainingHours > 0) {
    const dayOfWeek = currentPHT.getDay();
    
    // Check if this is a holiday or non-working day
    if (await isHoliday(currentPHT) || !isWorkingDay(dayOfWeek, operationalHours)) {
      // Move to next day at 8 AM
      currentPHT.setDate(currentPHT.getDate() + 1);
      currentPHT.setHours(8, 0, 0, 0);
      continue;
    }
    
    // Get working hours available for this day
    const workingHoursInDay = getWorkingHoursForDay(dayOfWeek, operationalHours);
    
    if (workingHoursInDay === 0) {
      // Not a working day, move to next day
      currentPHT.setDate(currentPHT.getDate() + 1);
      currentPHT.setHours(8, 0, 0, 0);
      continue;
    }
    
    // Get working hours remaining in this specific day from current time
    const remainingInDay = getRemainingWorkingHoursInDayPHT(currentPHT, operationalHours);
    
    if (remainingHours <= remainingInDay) {
      // SLA will complete within this day
      // Add the remaining hours to current time (accounting for breaks)
      currentPHT = addWorkingHoursToTimePHT(currentPHT, remainingHours, operationalHours);
      remainingHours = 0;
    } else {
      // Use all remaining hours in this day and continue to next working day
      remainingHours -= remainingInDay;
      
      // Move to next working day at start time (8 AM)
      currentPHT.setDate(currentPHT.getDate() + 1);
      currentPHT.setHours(8, 0, 0, 0);
    }
  }

  // Return the result directly as Philippine Time
  return currentPHT;
}

/**
 * Get the start time of the next working day
 */
async function getNextWorkingDayStart(
  phtDate: Date,
  operationalHours: OperationalHours
): Promise<Date> {
  let nextDay = new Date(phtDate);
  
  // If it's after working hours today, try next day
  // If it's before working hours today, use today
  // If it's during working hours today, use current time (shouldn't happen in this context)
  
  const currentTime = phtDate.toTimeString().slice(0, 5); // "HH:MM"
  const dayOfWeek = phtDate.getDay();
  
  const workingDay = operationalHours.workingDays.find(
    (day) => day.dayOfWeek === dayOfWeek
  );
  
  let startTime = '08:00';
  if (workingDay && workingDay.isEnabled && workingDay.scheduleType !== 'not-set') {
    if (workingDay.scheduleType === 'custom') {
      startTime = workingDay.customStartTime || '08:00';
    } else {
      startTime = operationalHours.standardStartTime || '08:00';
    }
    
    // If it's before working hours today and today is a working day, use today
    if (currentTime < startTime) {
      const [sh, sm] = startTime.split(':').map(n => parseInt(n, 10));
      nextDay.setHours(sh, sm, 0, 0);
      return nextDay;
    }
  }
  
  // Otherwise, find next working day
  for (let i = 1; i <= 7; i++) {
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayOfWeek = nextDay.getDay();
    
    if (await isHoliday(nextDay)) {
      continue;
    }
    
    const nextWorkingDay = operationalHours.workingDays.find(
      (day) => day.dayOfWeek === nextDayOfWeek
    );
    
    if (nextWorkingDay && nextWorkingDay.isEnabled && nextWorkingDay.scheduleType !== 'not-set') {
      // Found next working day
      if (nextWorkingDay.scheduleType === 'custom') {
        startTime = nextWorkingDay.customStartTime || '08:00';
      } else {
        startTime = operationalHours.standardStartTime || '08:00';
      }
      
      const [sh, sm] = startTime.split(':').map(n => parseInt(n, 10));
      nextDay.setHours(sh, sm, 0, 0);
      return nextDay;
    }
  }
  
  // Fallback to 8 AM next day if no working day found
  nextDay.setHours(8, 0, 0, 0);
  return nextDay;
}

/**
 * Check if a day of week is a working day
 */
function isWorkingDay(dayOfWeek: number, operationalHours: OperationalHours): boolean {
  const workingDay = operationalHours.workingDays.find(
    (day) => day.dayOfWeek === dayOfWeek
  );
  return workingDay?.isEnabled && workingDay.scheduleType !== 'not-set';
}

/**
 * Get working hours remaining in the current day from a specific time (Philippine time)
 */
function getRemainingWorkingHoursInDayPHT(
  phtDate: Date,
  operationalHours: OperationalHours
): number {
  const dayOfWeek = phtDate.getDay();
  const currentTime = phtDate.toTimeString().slice(0, 5); // "HH:MM"

  const workingDay = operationalHours.workingDays.find(
    (day) => day.dayOfWeek === dayOfWeek
  );

  if (!workingDay || !workingDay.isEnabled || workingDay.scheduleType === 'not-set') {
    return 0;
  }

  // Get start and end times for the day
  let startTime: string;
  let endTime: string;
  
  if (workingDay.scheduleType === 'custom') {
    startTime = workingDay.customStartTime || '08:00';
    endTime = workingDay.customEndTime || '18:00';
  } else {
    startTime = operationalHours.standardStartTime || '08:00';
    endTime = operationalHours.standardEndTime || '18:00';
  }

  // If before start time, return full day's working hours
  if (currentTime < startTime) {
    return getWorkingHoursForDay(dayOfWeek, operationalHours);
  }

  // If past end time, no remaining hours
  if (currentTime >= endTime) {
    return 0;
  }

  // Calculate remaining minutes until end of day
  const [ch, cm] = currentTime.split(':').map(n => parseInt(n, 10));
  const [eh, em] = endTime.split(':').map(n => parseInt(n, 10));
  let remainingMinutes = (eh * 60 + em) - (ch * 60 + cm);

  // Subtract any upcoming breaks
  const breaks = workingDay.breakHours || [];
  for (const b of breaks) {
    if (currentTime < b.startTime) {
      // Break is in the future, subtract it
      const [bsh, bsm] = b.startTime.split(':').map(n => parseInt(n, 10));
      const [beh, bem] = b.endTime.split(':').map(n => parseInt(n, 10));
      const breakMinutes = (beh * 60 + bem) - (bsh * 60 + bsm);
      remainingMinutes -= Math.max(0, breakMinutes);
    } else if (currentTime >= b.startTime && currentTime < b.endTime) {
      // Currently in a break, adjust start time to end of break
      const [beh, bem] = b.endTime.split(':').map(n => parseInt(n, 10));
      remainingMinutes = (eh * 60 + em) - (beh * 60 + bem);
    }
  }

  return Math.max(0, remainingMinutes) / 60; // Convert to hours
}

/**
 * Add working hours to a specific time (Philippine time), accounting for breaks
 * Business rule: Breaks PAUSE SLA time - SLA clock stops during lunch breaks
 * This ensures accurate SLA calculations that respect operational hours and breaks
 */
function addWorkingHoursToTimePHT(
  phtDate: Date,
  hoursToAdd: number,
  operationalHours: OperationalHours
): Date {
  let currentPHT = new Date(phtDate);
  let remainingMinutes = hoursToAdd * 60;
  
  // Add time minute by minute, skipping break hours
  while (remainingMinutes > 0) {
    const dayOfWeek = currentPHT.getDay();
    const workingDay = operationalHours.workingDays.find(
      (day) => day.dayOfWeek === dayOfWeek
    );
    
    if (!workingDay || !workingDay.isEnabled) {
      // Move to next working day at start time
      currentPHT.setDate(currentPHT.getDate() + 1);
      currentPHT.setHours(8, 0, 0, 0);
      continue;
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
    
    const currentTime = currentPHT.toTimeString().slice(0, 5);
    
    // If before working hours, move to start of working day
    if (currentTime < startTime) {
      const [sh, sm] = startTime.split(':').map(n => parseInt(n, 10));
      currentPHT.setHours(sh, sm, 0, 0);
      continue;
    }
    
    // If after working hours, move to next working day
    if (currentTime >= endTime) {
      currentPHT.setDate(currentPHT.getDate() + 1);
      currentPHT.setHours(8, 0, 0, 0);
      continue;
    }
    
    // Check if current time is within break hours
    const breakHours = workingDay.breakHours || [];
    let isInBreak = false;
    
    for (const breakHour of breakHours) {
      if (currentTime >= breakHour.startTime && currentTime < breakHour.endTime) {
        // We're in a break, move to end of break
        const [beh, bem] = breakHour.endTime.split(':').map(n => parseInt(n, 10));
        currentPHT.setHours(beh, bem, 0, 0);
        isInBreak = true;
        break;
      }
    }
    
    if (isInBreak) {
      continue;
    }
    
    // Add one minute and continue
    currentPHT.setMinutes(currentPHT.getMinutes() + 1);
    remainingMinutes--;
  }
  
  return currentPHT;
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
