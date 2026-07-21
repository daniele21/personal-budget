/**
 * Formats a Date for an HTML date input using the user's local calendar day.
 * This intentionally avoids toISOString(), which converts to UTC first.
 */
export function getLocalDateInputValue(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
