function parseCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

export function isAdminFromClaims(input: {
  email?: string | null;
  roles?: unknown;
  groups?: unknown;
}): boolean {
  const email = input.email?.trim() || '';
  const adminEmails = parseCsv(process.env.ADMIN_EMAILS);
  const adminGroups = parseCsv(process.env.ADMIN_GROUPS);
  const roles = Array.isArray(input.roles) ? input.roles : [];
  const groups = Array.isArray(input.groups) ? input.groups : [];

  return (
    (email !== '' && adminEmails.includes(email)) ||
    groups.some((group) => adminGroups.includes(String(group))) ||
    roles.includes('Admin')
  );
}

/**
 * Access Manager = Admin OR AccessManager role OR ACCESS_MANAGER_EMAILS/GROUPS.
 */
export function isAccessManagerFromClaims(input: {
  email?: string | null;
  roles?: unknown;
  groups?: unknown;
}): boolean {
  if (isAdminFromClaims(input)) return true;

  const email = input.email?.trim() || '';
  const emails = parseCsv(process.env.ACCESS_MANAGER_EMAILS);
  const groupAllow = parseCsv(process.env.ACCESS_MANAGER_GROUPS);
  const roles = Array.isArray(input.roles) ? input.roles : [];
  const groups = Array.isArray(input.groups) ? input.groups : [];

  return (
    (email !== '' && emails.includes(email)) ||
    groups.some((group) => groupAllow.includes(String(group))) ||
    roles.includes('AccessManager')
  );
}
