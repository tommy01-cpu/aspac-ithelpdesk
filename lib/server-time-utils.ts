/**
 * Server-side Philippine Time Utility Functions
 * This module provides standardized time handling for server-side operations
 * to ensure all timestamps are stored in Philippine Time.
 */

// Philippine timezone constant
export const PHILIPPINES_TIMEZONE = 'Asia/Manila';

/**
 * Get current Philippine Time as Date object
 * This should be used when inserting timestamps into the database
 */
export const getPhilippineTimeNow = (): Date => {
  const now = new Date();
  // Convert to Philippine time
  const phTime = new Date(now.toLocaleString('en-US', { timeZone: PHILIPPINES_TIMEZONE }));
  return phTime;
};

/**
 * Convert any timestamp to Philippine Time Date object
 * Use this when you need to standardize existing timestamps
 */
export const toPhilippineTime = (timestamp: string | Date): Date => {
  const date = new Date(timestamp);
  return new Date(date.toLocaleString('en-US', { timeZone: PHILIPPINES_TIMEZONE }));
};

/**
 * Get Philippine Time for database operations
 * This ensures all database timestamps are in Philippine Time
 */
export const getDatabaseTimestamp = (): Date => {
  // Store timestamps in UTC; handle display-timezone on the client.
  return new Date();
};

/**
 * Convert client timestamp to Philippine Time for database storage
 * Use this when receiving timestamps from frontend
 */
export const normalizeClientTimestamp = (clientTimestamp?: string): Date => {
  // If client sends a timestamp (usually ISO UTC), trust it; otherwise use now (UTC).
  if (clientTimestamp) {
    try {
      return new Date(clientTimestamp);
    } catch (error) {
      console.warn('Invalid client timestamp provided:', clientTimestamp);
    }
  }
  return new Date();
};
