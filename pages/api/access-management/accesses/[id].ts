import type { NextApiRequest, NextApiResponse } from 'next';
import { withErrorHandler, sendSuccess } from '@/lib/api/response';
import { requireAccessManagerSession } from '@/lib/api/require-access-manager';
import { actorFromSession } from '@/lib/api/require-admin';
import { BadRequestError, NotFoundError } from '@/lib/api/errors';
import {
  accessAuditLogRepository,
  buildAccessAuditSummary,
} from '@/lib/db';
import {
  findOrCreateGlpiProject,
  getGlpiAccess,
  getGlpiProject,
  softDeleteGlpiAccess,
  updateGlpiAccess,
  parseAccessProjectId,
  resolveGlpiUserLabel,
} from '@/lib/glpi';
import { mapGlpiAccessToRecord } from '@/lib/glpi/mappers';

interface UpdateAccessBody {
  name?: string;
  userId?: number;
  projectId?: number;
  projectName?: string;
  requestTicket?: string;
  url?: string;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireAccessManagerSession(req, res);
  if (!session) return;

  const accessId = parseInt(String(req.query.id), 10);
  if (Number.isNaN(accessId)) {
    throw new BadRequestError('Invalid access id');
  }

  if (req.method === 'PATCH') {
    const body = req.body as UpdateAccessBody;
    let existing;
    try {
      existing = await getGlpiAccess(accessId);
    } catch {
      throw new NotFoundError('Access not found');
    }

    if (existing.is_deleted) {
      throw new BadRequestError('Access is deleted');
    }

    const fields: string[] = [];
    const update: {
      name?: string;
      userId?: number;
      projectId?: number;
      requestTicket?: string;
      url?: string;
    } = {};

    if (typeof body.name === 'string' && body.name.trim()) {
      update.name = body.name.trim();
      if (update.name !== existing.name) fields.push('name');
    }

    if (body.userId !== undefined) {
      const userId = Number(body.userId);
      if (!Number.isFinite(userId) || userId <= 0) {
        throw new BadRequestError('Invalid userId');
      }
      update.userId = userId;
      if (userId !== existing.user?.id) fields.push('user');
    }

    let projectId =
      body.projectId !== undefined ? Number(body.projectId) : undefined;
    let projectName =
      typeof body.projectName === 'string' ? body.projectName.trim() : '';

    if (
      (projectId === undefined || !Number.isFinite(projectId) || projectId <= 0) &&
      projectName
    ) {
      const project = await findOrCreateGlpiProject(projectName);
      projectId = project.id;
      projectName = project.name;
    }

    if (projectId !== undefined) {
      if (!Number.isFinite(projectId) || projectId <= 0) {
        throw new BadRequestError('Invalid project');
      }
      update.projectId = projectId;
      if (projectId !== parseAccessProjectId(existing)) fields.push('project');
    }

    // given_by is set from session on create only — not editable
    if (typeof body.requestTicket === 'string') {
      update.requestTicket = body.requestTicket.trim();
      if (
        update.requestTicket !== (existing.custom_fields?.request_ticket || '')
      ) {
        fields.push('requestTicket');
      }
    }
    if (typeof body.url === 'string') {
      update.url = body.url.trim();
      if (update.url !== (existing.custom_fields?.url || '')) {
        fields.push('url');
      }
    }

    const access = await updateGlpiAccess(accessId, update);
    const resolvedProjectId = parseAccessProjectId(access);
    if (!projectName && resolvedProjectId) {
      try {
        projectName = (await getGlpiProject(resolvedProjectId)).name;
      } catch {
        projectName = `Project #${resolvedProjectId}`;
      }
    }

    const glpiUserId = access.user?.id || existing.user?.id || 0;
    const glpiUserName = await resolveGlpiUserLabel(glpiUserId);

    await accessAuditLogRepository.append({
      action: 'updated',
      actor: actorFromSession(session),
      accessId: access.id,
      glpiUserId,
      glpiUserName,
      accessName: access.name,
      projectId: resolvedProjectId || undefined,
      projectName: projectName || undefined,
      fields,
      summary: buildAccessAuditSummary('updated', fields, access.name),
    });

    sendSuccess(res, mapGlpiAccessToRecord(access, projectName || null));
    return;
  }

  if (req.method === 'DELETE') {
    let existing;
    try {
      existing = await getGlpiAccess(accessId);
    } catch {
      throw new NotFoundError('Access not found');
    }

    if (existing.is_deleted) {
      sendSuccess(res, { id: accessId, deleted: true });
      return;
    }

    await softDeleteGlpiAccess(accessId);

    const projectId = parseAccessProjectId(existing);
    let projectName: string | undefined;
    if (projectId) {
      try {
        projectName = (await getGlpiProject(projectId)).name;
      } catch {
        projectName = undefined;
      }
    }

    const glpiUserId = existing.user?.id || 0;
    const glpiUserName = await resolveGlpiUserLabel(glpiUserId);

    await accessAuditLogRepository.append({
      action: 'deleted',
      actor: actorFromSession(session),
      accessId,
      glpiUserId,
      glpiUserName,
      accessName: existing.name,
      projectId: projectId || undefined,
      projectName,
      summary: buildAccessAuditSummary('deleted', undefined, existing.name),
    });

    sendSuccess(res, { id: accessId, deleted: true });
    return;
  }

  res.setHeader('Allow', ['PATCH', 'DELETE']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default withErrorHandler(handler);
