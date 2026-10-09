import { glpiFetch } from './client';
import type { GlpiUser } from './types';

export type GlpiUserOrg = 'ukad' | 'compent' | 'other';

/** Service / built-in GLPI accounts hidden from Access management user list. */
export const HIDDEN_GLPI_USERNAMES = new Set([
  'glpi',
  'normal',
  'post-only',
  'svc-ucc',
  'tech',
]);

function escapeRsql(value: string): string {
  return value.replace(/([\\*"'=<>!()])/g, '\\$1');
}

export function isHiddenGlpiUser(user: GlpiUser): boolean {
  const username = user.username?.trim().toLowerCase();
  return Boolean(username && HIDDEN_GLPI_USERNAMES.has(username));
}

export function formatGlpiUserDisplayName(user: GlpiUser): string {
  const full = [user.firstname, user.realname].filter(Boolean).join(' ').trim();
  if (full) return full;
  return user.username || `User #${user.id}`;
}

export function getGlpiUserEmail(user: GlpiUser): string | null {
  const email = user.emails?.find((e) => e.email)?.email;
  return email?.trim() || null;
}

/**
 * Classify by email domain in username (or email fallback).
 * ukad-* → ukad, *compent* → compent, else other.
 */
export function classifyGlpiUserOrg(
  username?: string | null,
  email?: string | null,
): GlpiUserOrg {
  const source = `${username || ''} ${email || ''}`.toLowerCase();
  const domainMatch = source.match(/@([a-z0-9.-]+)/);
  const domain = domainMatch?.[1] || '';

  if (domain.includes('ukad') || source.includes('@ukad')) return 'ukad';
  if (domain.includes('compent') || source.includes('@compent')) return 'compent';
  return 'other';
}

export async function searchGlpiUsers(q?: string, limit = 500): Promise<GlpiUser[]> {
  const filters = ['is_active==true', 'is_deleted==false'];
  if (q?.trim()) {
    // username contains — client also filters display name/email below
    filters.push(`username=like=*${escapeRsql(q.trim())}*`);
  }

  let users = await glpiFetch<GlpiUser[]>('/Administration/User', {
    query: {
      filter: filters.join(';'),
      limit: Math.max(limit, 500),
      sort: 'username',
    },
  });

  if (!Array.isArray(users)) users = [];
  users = users.filter((user) => !isHiddenGlpiUser(user));

  if (q?.trim()) {
    const term = q.trim().toLowerCase();
    // Broaden: also match name/email locally (and re-fetch without username filter if needed)
    const localMatch = (user: GlpiUser) => {
      if (isHiddenGlpiUser(user)) return false;
      const hay = [
        user.username,
        user.realname,
        user.firstname,
        formatGlpiUserDisplayName(user),
        getGlpiUserEmail(user),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(term);
    };

    let matched = users.filter(localMatch);
    if (matched.length === 0) {
      const allActive = await glpiFetch<GlpiUser[]>('/Administration/User', {
        query: {
          filter: 'is_active==true;is_deleted==false',
          limit: 500,
          sort: 'username',
        },
      });
      matched = (Array.isArray(allActive) ? allActive : [])
        .filter((user) => !isHiddenGlpiUser(user))
        .filter(localMatch);
    }
    return matched.slice(0, limit);
  }

  return users.slice(0, limit);
}

export async function getGlpiUser(id: number): Promise<GlpiUser> {
  return glpiFetch<GlpiUser>(`/Administration/User/${id}`);
}
