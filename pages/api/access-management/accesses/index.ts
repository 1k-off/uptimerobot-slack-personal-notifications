import type { NextApiRequest, NextApiResponse } from 'next';
import { withErrorHandler, sendCreated } from '@/lib/api/response';
import { requireAccessManagerSession } from '@/lib/api/require-access-manager';
import { actorFromSession } from '@/lib/api/require-admin';
import { BadRequestError } from '@/lib/api/errors';
import {
  accessAuditLogRepository,
  buildAccessAuditSummary,
} from '@/lib/db';
import {
  createGlpiAccess,
  findOrCreateGlpiProject,
  getGlpiProject,
  resolveGlpiUserLabel,
} from '@/lib/glpi';
import { mapGlpiAccessToRecord } from '@/lib/glpi/mappers';
import { parseAccessProjectId } from '@/lib/glpi/accesses';

interface CreateAccessBody {
  name?: string;
  userId?: number;
  projectId?: number;
  projectName?: string;
  requestTicket?: string;
  url?: string;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  const session = await requireAccessManagerSession(req, res);
  if (!session) return;

  const body = req.body as CreateAccessBody;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const userId = Number(body.userId);

  if (!name) throw new BadRequestError('Access name is required');
  if (!Number.isFinite(userId) || userId <= 0) {
    throw new BadRequestError('userId is required');
  }

  let projectId =
    typeof body.projectId === 'number' ? body.projectId : Number(body.projectId);
  let projectName =
    typeof body.projectName === 'string' ? body.projectName.trim() : '';

  if ((!Number.isFinite(projectId) || projectId <= 0) && projectName) {
    const project = await findOrCreateGlpiProject(projectName);
    projectId = project.id;
    projectName = project.name;
  }

  if (!Number.isFinite(projectId) || projectId <= 0) {
    throw new BadRequestError('Project is required');
  }

  if (!projectName) {
    try {
      projectName = (await getGlpiProject(projectId)).name;
    } catch {
      projectName = `Project #${projectId}`;
    }
  }

  const givenBy = actorFromSession(session);

  const access = await createGlpiAccess({
    name,
    userId,
    projectId,
    givenBy,
    requestTicket:
      typeof body.requestTicket === 'string' ? body.requestTicket.trim() : '',
    url: typeof body.url === 'string' ? body.url.trim() : '',
  });

  const glpiUserName = await resolveGlpiUserLabel(userId);

  await accessAuditLogRepository.append({
    action: 'created',
    actor: givenBy,
    accessId: access.id,
    glpiUserId: userId,
    glpiUserName,
    accessName: access.name,
    projectId,
    projectName,
    summary: buildAccessAuditSummary('created', undefined, access.name),
  });

  sendCreated(
    res,
    mapGlpiAccessToRecord(
      access,
      projectName ||
        (parseAccessProjectId(access)
          ? `Project #${parseAccessProjectId(access)}`
          : null),
    ),
  );
}

export default withErrorHandler(handler);
