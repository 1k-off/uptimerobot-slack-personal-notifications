import { AUDIT_ACTOR_SYSTEM, type AuditAction } from '@/lib/db';

const FIELD_LABELS: Record<string, string> = {
  friendlyName: 'display name',
  url: 'URL',
  keyword: 'keyword',
  alertContacts: 'alert contacts',
  group: 'group',
  notificationPreferences: 'notification preferences',
};

export function formatAuditFieldLabels(fields: string[]): string[] {
  return fields.map((field) => FIELD_LABELS[field] || field);
}

export function buildAuditSummary(
  action: AuditAction,
  fields?: string[],
): string {
  if (action === 'created') return 'Monitor created';
  if (action === 'deleted') return 'Monitor deleted';
  if (fields?.length) {
    return `Updated ${formatAuditFieldLabels(fields).join(', ')}`;
  }
  return 'Monitor updated';
}

export { AUDIT_ACTOR_SYSTEM };
