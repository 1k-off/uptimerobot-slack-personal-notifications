import type { NextApiRequest, NextApiResponse } from 'next';
import { withErrorHandler, sendSuccess } from '@/lib/api/response';
import { requireAccessManagerSession } from '@/lib/api/require-access-manager';
import { BadRequestError, NotFoundError } from '@/lib/api/errors';
import {
  formatGlpiUserDisplayName,
  getGlpiUser,
  getGlpiProject,
  listGlpiAccessesForUser,
  parseAccessProjectId,
} from '@/lib/glpi';
import { mapGlpiAccessToRecord } from '@/lib/glpi/mappers';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  if (!(await requireAccessManagerSession(req, res))) return;

  const userId = parseInt(String(req.query.id), 10);
  if (Number.isNaN(userId)) {
    throw new BadRequestError('Invalid user id');
  }

  let user;
  try {
    user = await getGlpiUser(userId);
  } catch {
    throw new NotFoundError('GLPI user not found');
  }

  const accesses = await listGlpiAccessesForUser(userId);
  const projectIds = [
    ...new Set(
      accesses
        .map((a) => parseAccessProjectId(a))
        .filter((id): id is number => typeof id === 'number'),
    ),
  ];

  const projectNames = new Map<number, string>();
  await Promise.all(
    projectIds.map(async (projectId) => {
      try {
        const project = await getGlpiProject(projectId);
        projectNames.set(projectId, project.name);
      } catch {
        projectNames.set(projectId, `Project #${projectId}`);
      }
    }),
  );

  sendSuccess(res, {
    user: {
      id: user.id,
      username: user.username || null,
      name: formatGlpiUserDisplayName(user),
      email: user.emails?.find((e) => e.email)?.email || null,
    },
    accesses: accesses.map((access) => {
      const projectId = parseAccessProjectId(access);
      return mapGlpiAccessToRecord(
        access,
        projectId ? projectNames.get(projectId) || null : null,
      );
    }),
  });
}

export default withErrorHandler(handler);
