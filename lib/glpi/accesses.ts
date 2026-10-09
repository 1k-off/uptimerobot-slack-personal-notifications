import { glpiFetch } from './client';
import type {
  CreateGlpiAccessInput,
  GlpiAccess,
  UpdateGlpiAccessInput,
} from './types';

function escapeRsql(value: string): string {
  return value.replace(/([\\*"'=<>!()])/g, '\\$1');
}

function buildCustomFields(input: {
  projectId?: number;
  givenBy?: string;
  requestTicket?: string;
  url?: string;
}): Record<string, string> {
  const fields: Record<string, string> = {};
  if (input.projectId !== undefined) {
    fields.projects = String(input.projectId);
  }
  if (input.givenBy !== undefined) {
    fields.given_by = input.givenBy;
  }
  if (input.requestTicket !== undefined) {
    fields.request_ticket = input.requestTicket;
  }
  if (input.url !== undefined) {
    fields.url = input.url;
  }
  return fields;
}

export function parseAccessProjectId(access: GlpiAccess): number | null {
  const raw = access.custom_fields?.projects;
  if (raw === null || raw === undefined || raw === '') return null;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export async function listGlpiAccessesForUser(
  userId: number,
  limit = 500,
): Promise<GlpiAccess[]> {
  // Prefer server-side filter; fall back to client filter if nested path unsupported.
  try {
    const filtered = await glpiFetch<GlpiAccess[]>('/Assets/Custom/Accesses', {
      query: {
        filter: `is_deleted==false;user==${userId}`,
        limit,
        sort: 'name',
      },
    });
    if (Array.isArray(filtered)) {
      const matched = filtered.filter((a) => a.user?.id === userId);
      if (matched.length > 0 || filtered.length === 0) return matched;
    }
  } catch {
    // continue to fallback
  }

  const accesses = await glpiFetch<GlpiAccess[]>('/Assets/Custom/Accesses', {
    query: {
      filter: 'is_deleted==false',
      limit,
      sort: 'name',
    },
  });

  return (Array.isArray(accesses) ? accesses : []).filter(
    (a) => a.user?.id === userId,
  );
}

export async function searchGlpiAccesses(options?: {
  q?: string;
  userId?: number;
  limit?: number;
}): Promise<GlpiAccess[]> {
  const filters = ['is_deleted==false'];
  if (options?.userId) {
    filters.push(`user.id==${options.userId}`);
  }
  if (options?.q?.trim()) {
    filters.push(`name=like=*${escapeRsql(options.q.trim())}*`);
  }

  const accesses = await glpiFetch<GlpiAccess[]>('/Assets/Custom/Accesses', {
    query: {
      filter: filters.join(';'),
      limit: options?.limit ?? 100,
      sort: 'name',
    },
  });

  return Array.isArray(accesses) ? accesses : [];
}

export async function getGlpiAccess(id: number): Promise<GlpiAccess> {
  return glpiFetch<GlpiAccess>(`/Assets/Custom/Accesses/${id}`);
}

export async function createGlpiAccess(
  input: CreateGlpiAccessInput,
): Promise<GlpiAccess> {
  const created = await glpiFetch<{ id: number }>(
    '/Assets/Custom/Accesses',
    {
      method: 'POST',
      body: {
        name: input.name.trim(),
        user: { id: input.userId },
        ...(input.comment !== undefined ? { comment: input.comment } : {}),
        custom_fields: buildCustomFields({
          projectId: input.projectId,
          givenBy: input.givenBy ?? '',
          requestTicket: input.requestTicket ?? '',
          url: input.url ?? '',
        }),
      },
    },
  );

  return getGlpiAccess(created.id);
}

export async function updateGlpiAccess(
  id: number,
  input: UpdateGlpiAccessInput,
): Promise<GlpiAccess> {
  const body: Record<string, unknown> = {};

  if (input.name !== undefined) body.name = input.name.trim();
  if (input.userId !== undefined) body.user = { id: input.userId };
  if (input.comment !== undefined) body.comment = input.comment;

  const customFields = buildCustomFields({
    projectId: input.projectId,
    givenBy: input.givenBy,
    requestTicket: input.requestTicket,
    url: input.url,
  });
  if (Object.keys(customFields).length > 0) {
    body.custom_fields = customFields;
  }

  await glpiFetch(`/Assets/Custom/Accesses/${id}`, {
    method: 'PATCH',
    body,
  });

  return getGlpiAccess(id);
}

/** Soft-delete (trash). Never pass force=true. */
export async function softDeleteGlpiAccess(id: number): Promise<void> {
  await glpiFetch(`/Assets/Custom/Accesses/${id}`, {
    method: 'DELETE',
  });
}
