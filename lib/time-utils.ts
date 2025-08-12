/**
 * Philippine Time (PHT) Utility Functions
 * This module provides standardized time handling for the entire application
 * to ensure all timestamps are stored and displayed in Philippine Time.
 */

// Philippine timezone constant
export const PHILIPPINES_TIMEZONE = 'Asia/Manila';

/**
 * Get current Philippine Time as ISO string
 * This should be used when inserting timestamps into the database
 */
export const getPhilippineTimeNow = (): string => {
  const now = new Date();
  // Convert to Philippine time and return as ISO string
  return new Date(now.toLocaleString('en-US', { timeZone: PHILIPPINES_TIMEZONE })).toISOString();
};

/**
 * Convert any timestamp to Philippine Time ISO string
 * Use this when you need to standardize existing timestamps
 */
export const toPhilippineTime = (timestamp: string | Date): string => {
  const date = new Date(timestamp);
  return new Date(date.toLocaleString('en-US', { timeZone: PHILIPPINES_TIMEZONE })).toISOString();
};

/**
 * Format Philippine Time for display
 */
export const formatPhilippineTime = (
  timestamp: string | Date, 
  options?: { 
    dateOnly?: boolean; 
    timeOnly?: boolean; 
    includeSeconds?: boolean;
    shortFormat?: boolean;
    longFormat?: boolean;
  }
): string => {
  if (!timestamp) return '-';
  
  const date = new Date(timestamp);
  
  if (options?.dateOnly) {
    return date.toLocaleDateString('en-PH', {
      timeZone: PHILIPPINES_TIMEZONE,
      year: 'numeric',
      month: options.shortFormat ? 'short' : (options.longFormat ? 'long' : 'short'),
      day: 'numeric'
    });
  }
  
  if (options?.timeOnly) {
    return date.toLocaleTimeString('en-PH', {
      timeZone: PHILIPPINES_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      second: options.includeSeconds ? '2-digit' : undefined,
      hour12: true
    });
  }
  
  // Default: both date and time
  return date.toLocaleString('en-PH', {
    timeZone: PHILIPPINES_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Format timestamp that's already in Philippine Time (no conversion needed)
 * Use this when the timestamp is already stored as Philippine Time in database
 */
export const formatPhilippineTimeDisplay = (
  timestamp: string | Date,
  options?: {
    dateOnly?: boolean;
    timeOnly?: boolean;
    includeSeconds?: boolean;
    shortFormat?: boolean;
    longFormat?: boolean;
  }
): string => {
  // Delegate to the standardized formatter that renders in Asia/Manila.
  // This avoids any manual hour shifting which previously caused an 8-hour offset.
  return formatPhilippineTime(timestamp, options);
};

/**
 * Format Philippine Time for display with relative time (Today, Yesterday, etc.)
 */
export const formatPhilippineTimeRelative = (timestamp: string | Date): string => {
  if (!timestamp) return '-';
  
  const date = new Date(timestamp);
  const now = new Date();
  
  // Convert both to Philippine time for comparison
  const phDate = new Date(date.toLocaleString('en-US', { timeZone: PHILIPPINES_TIMEZONE }));
  const phNow = new Date(now.toLocaleString('en-US', { timeZone: PHILIPPINES_TIMEZONE }));
  
  const diffInDays = Math.floor((phNow.getTime() - phDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) {
    return `Today ${formatPhilippineTime(timestamp, { timeOnly: true })}`;
  } else if (diffInDays === 1) {
    return `Yesterday ${formatPhilippineTime(timestamp, { timeOnly: true })}`;
  } else if (diffInDays < 7) {
    return `${diffInDays} days ago ${formatPhilippineTime(timestamp, { timeOnly: true })}`;
  } else {
    return formatPhilippineTime(timestamp);
  }
};

/**
 * Get Philippine Time for API requests
 * This ensures all API requests send Philippine Time
 */
export const getApiTimestamp = (): string => {
  return getPhilippineTimeNow();
};

/**
 * Validate and convert timestamp to Philippine Time
 * Use this for data received from APIs that might not be in Philippine Time
 */
export const normalizeTimestamp = (timestamp: string | Date): string => {
  try {
    return toPhilippineTime(timestamp);
  } catch (error) {
    console.warn('Invalid timestamp provided:', timestamp);
    return getPhilippineTimeNow();
  }
};

/**
 * Get date only in Philippine Time (for grouping by date)
 */
export const getPhilippineDateOnly = (timestamp: string | Date): string => {
  const date = new Date(timestamp);
  const phDate = new Date(date.toLocaleString('en-US', { timeZone: PHILIPPINES_TIMEZONE }));
  return phDate.toISOString().split('T')[0]; // YYYY-MM-DD format
};

/**
 * Check if two timestamps are on the same day in Philippine Time
 */
export const isSameDayPhilippine = (date1: string | Date, date2: string | Date): boolean => {
  return getPhilippineDateOnly(date1) === getPhilippineDateOnly(date2);
};
