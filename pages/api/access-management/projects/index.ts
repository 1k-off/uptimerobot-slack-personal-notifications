import type { NextApiRequest, NextApiResponse } from 'next';
import { withErrorHandler, sendSuccess, sendCreated } from '@/lib/api/response';
import { requireAccessManagerSession } from '@/lib/api/require-access-manager';
import { BadRequestError } from '@/lib/api/errors';
import { findOrCreateGlpiProject, searchGlpiProjects } from '@/lib/glpi';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!(await requireAccessManagerSession(req, res))) return;

  if (req.method === 'GET') {
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const projects = await searchGlpiProjects(q, 200);
    const byName = new Map<string, { id: number; name: string }>();
    for (const p of projects) {
      const key = p.name.trim().toLowerCase();
      const existing = byName.get(key);
      if (!existing || p.id < existing.id) {
        byName.set(key, { id: p.id, name: p.name });
      }
    }
    sendSuccess(
      res,
      [...byName.values()].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      ),
    );
    return;
  }

  if (req.method === 'POST') {
    const name =
      typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name) {
      throw new BadRequestError('Project name is required');
    }

    const project = await findOrCreateGlpiProject(name);
    sendCreated(res, { id: project.id, name: project.name });
    return;
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default withErrorHandler(handler);
