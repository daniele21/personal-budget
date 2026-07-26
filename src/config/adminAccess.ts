export const ADMIN_EMAILS = [
  'danielemoltisanti@gmail.com',
  'staituned.owner@gmail.com',
] as const;

export const PRIMARY_ADMIN_EMAIL = ADMIN_EMAILS[0];

const ADMIN_EMAIL_SET = new Set<string>(ADMIN_EMAILS);

export function normalizeAdminEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAIL_SET.has(normalizeAdminEmail(email));
}
