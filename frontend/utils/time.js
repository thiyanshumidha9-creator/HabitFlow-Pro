import { settingsService } from '../services/settings-service.js';

/**
 * Format a date/time object, string, or number into a time-only string (e.g., "9:15 PM" or "21:15").
 * @param {Date|string|number} value
 * @returns {string}
 */
export function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '';
  
  const settings = settingsService.get();
  const use12 = settings.timeFormat !== '24';
  
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: use12
  });
}

/**
 * Format a date/time object, string, or number into a full date-time string (e.g., "Jul 31, 2026, 9:15 PM").
 * @param {Date|string|number} value
 * @returns {string}
 */
export function formatDateTime(value) {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (isNaN(date.getTime())) return 'Not available';
  
  const settings = settingsService.get();
  const use12 = settings.timeFormat !== '24';
  
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: use12
  });
}
