import type { AccessRecord } from '@/types';
import { parseAccessProjectId } from './accesses';
import type { GlpiAccess } from './types';

export function mapGlpiAccessToRecord(
  access: GlpiAccess,
  projectName?: string | null,
): AccessRecord {
  return {
    id: access.id,
    name: access.name,
    userId: access.user?.id ?? 0,
    userName: access.user?.name ?? null,
    projectId: parseAccessProjectId(access),
    projectName: projectName ?? null,
    givenBy: access.custom_fields?.given_by ?? null,
    requestTicket: access.custom_fields?.request_ticket ?? null,
    url: access.custom_fields?.url ?? null,
    dateMod: access.date_mod ?? null,
  };
}
