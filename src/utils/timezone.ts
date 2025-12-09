import { format, formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';
import { format as formatDate } from 'date-fns';

// Default timezone - can be configured per user
const DEFAULT_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

export interface TimezonePreference {
  timezone: string;
  label: string;
}

export const COMMON_TIMEZONES: TimezonePreference[] = [
  { timezone: 'America/New_York', label: 'Eastern Time (ET)' },
  { timezone: 'America/Chicago', label: 'Central Time (CT)' },
  { timezone: 'America/Denver', label: 'Mountain Time (MT)' },
  { timezone: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { timezone: 'Europe/London', label: 'Greenwich Mean Time (GMT)' },
  { timezone: 'Europe/Berlin', label: 'Central European Time (CET)' },
  { timezone: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
  { timezone: 'Asia/Shanghai', label: 'China Standard Time (CST)' },
  { timezone: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' },
];

/**
 * Get the user's detected timezone
 */
export function getDetectedTimezone(): string {
  return DEFAULT_TIMEZONE;
}

/**
 * Get user's timezone preference from localStorage or use detected timezone
 */
export function getUserTimezone(): string {
  if (typeof window === 'undefined') return DEFAULT_TIMEZONE;
  
  const stored = localStorage.getItem('user-timezone');
  return stored || DEFAULT_TIMEZONE;
}

/**
 * Set user's timezone preference
 */
export function setUserTimezone(timezone: string): void {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem('user-timezone', timezone);
}

/**
 * Convert a date to the user's timezone
 */
export function toUserTimezone(date: Date, timezone?: string): Date {
  const userTz = timezone || getUserTimezone();
  return toZonedTime(date, userTz);
}

/**
 * Convert a date from the user's timezone to UTC
 */
export function fromUserTimezone(date: Date, timezone?: string): Date {
  const userTz = timezone || getUserTimezone();
  return fromZonedTime(date, userTz);
}

/**
 * Format a date in the user's timezone
 */
export function formatInUserTimezone(
  date: Date, 
  formatString: string = 'MMM d, yyyy HH:mm',
  timezone?: string
): string {
  const userTz = timezone || getUserTimezone();
  return formatInTimeZone(date, userTz, formatString);
}

/**
 * Get timezone abbreviation (EST, PST, etc.)
 */
export function getTimezoneAbbr(timezone?: string): string {
  const userTz = timezone || getUserTimezone();
  const date = new Date();
  
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: userTz,
      timeZoneName: 'short'
    });
    
    const parts = formatter.formatToParts(date);
    const tzPart = parts.find(part => part.type === 'timeZoneName');
    return tzPart?.value || userTz;
  } catch {
    return userTz;
  }
}

/**
 * Check if two dates are on the same day in the user's timezone
 */
export function isSameDayInTimezone(date1: Date, date2: Date, timezone?: string): boolean {
  const userTz = timezone || getUserTimezone();
  const d1 = formatInTimeZone(date1, userTz, 'yyyy-MM-dd');
  const d2 = formatInTimeZone(date2, userTz, 'yyyy-MM-dd');
  return d1 === d2;
}

/**
 * Get the start of day in user's timezone
 */
export function getStartOfDayInTimezone(date: Date, timezone?: string): Date {
  const userTz = timezone || getUserTimezone();
  const zonedDate = toZonedTime(date, userTz);
  zonedDate.setHours(0, 0, 0, 0);
  return fromZonedTime(zonedDate, userTz);
}

/**
 * Get the end of day in user's timezone
 */
export function getEndOfDayInTimezone(date: Date, timezone?: string): Date {
  const userTz = timezone || getUserTimezone();
  const zonedDate = toZonedTime(date, userTz);
  zonedDate.setHours(23, 59, 59, 999);
  return fromZonedTime(zonedDate, userTz);
}

/**
 * Check if daylight saving time is active
 */
export function isDaylightSavingTime(date: Date, timezone?: string): boolean {
  const userTz = timezone || getUserTimezone();
  
  try {
    const january = new Date(date.getFullYear(), 0, 1);
    const july = new Date(date.getFullYear(), 6, 1);
    
    const janOffset = new Intl.DateTimeFormat('en', {
      timeZone: userTz,
      timeZoneName: 'longOffset'
    }).formatToParts(january).find(part => part.type === 'timeZoneName')?.value;
    
    const julyOffset = new Intl.DateTimeFormat('en', {
      timeZone: userTz,
      timeZoneName: 'longOffset'
    }).formatToParts(july).find(part => part.type === 'timeZoneName')?.value;
    
    const currentOffset = new Intl.DateTimeFormat('en', {
      timeZone: userTz,
      timeZoneName: 'longOffset'
    }).formatToParts(date).find(part => part.type === 'timeZoneName')?.value;
    
    return currentOffset !== janOffset && currentOffset === julyOffset;
  } catch {
    return false;
  }
}

/**
 * Get the current day of week (0-6, Sunday=0) in user's timezone
 */
export function getTodayDayOfWeek(timezone?: string): number {
  const userTz = timezone || getUserTimezone();
  const zonedNow = toZonedTime(new Date(), userTz);
  return zonedNow.getDay();
}

/**
 * Check if a schedule block should show today (in user's timezone)
 */
export function isScheduleBlockToday(dayOfWeek: number, timezone?: string): boolean {
  return dayOfWeek === getTodayDayOfWeek(timezone);
}

/**
 * Get the current date in user's timezone
 */
export function getTodayInTimezone(timezone?: string): Date {
  const userTz = timezone || getUserTimezone();
  return toZonedTime(new Date(), userTz);
}