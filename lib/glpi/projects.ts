import { glpiFetch } from './client';
import type { GlpiProject } from './types';

function escapeRsql(value: string): string {
  return value.replace(/([\\*"'=<>!()])/g, '\\$1');
}

export async function searchGlpiProjects(
  q?: string,
  limit = 200,
): Promise<GlpiProject[]> {
  const filters = ['is_deleted==false'];
  if (q?.trim()) {
    filters.push(`name=like=*${escapeRsql(q.trim())}*`);
  }

  const projects = await glpiFetch<GlpiProject[]>('/Assets/Custom/Projects', {
    query: {
      filter: filters.join(';'),
      limit,
      sort: 'name',
    },
  });

  return Array.isArray(projects) ? projects : [];
}

export async function findGlpiProjectByName(
  name: string,
): Promise<GlpiProject | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  // Prefer contains search then exact match client-side (names may include spaces/brackets).
  const projects = await searchGlpiProjects(trimmed, 50);
  const exact = projects.find(
    (p) => p.name.toLowerCase() === trimmed.toLowerCase(),
  );
  return exact || null;
}

export async function createGlpiProject(name: string): Promise<GlpiProject> {
  const created = await glpiFetch<{ id: number; href?: string }>(
    '/Assets/Custom/Projects',
    {
      method: 'POST',
      body: { name: name.trim() },
    },
  );

  return getGlpiProject(created.id);
}

export async function getGlpiProject(id: number): Promise<GlpiProject> {
  return glpiFetch<GlpiProject>(`/Assets/Custom/Projects/${id}`);
}

/** Find existing project by name (case-insensitive) or create it. */
export async function findOrCreateGlpiProject(
  name: string,
): Promise<GlpiProject> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Project name is required');
  }

  const existing = await findGlpiProjectByName(trimmed);
  if (existing) return existing;
  return createGlpiProject(trimmed);
}
