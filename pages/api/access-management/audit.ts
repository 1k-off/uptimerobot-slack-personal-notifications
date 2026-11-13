import type { NextApiRequest, NextApiResponse } from 'next';
import { withErrorHandler, sendSuccess } from '@/lib/api/response';
import { requireAccessManagerSession } from '@/lib/api/require-access-manager';
import {
  accessAuditLogRepository,
  type AccessAuditAction,
} from '@/lib/db';
import { resolveGlpiUserLabel } from '@/lib/glpi';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  if (!(await requireAccessManagerSession(req, res))) return;

  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(String(req.query.limit || '50'), 10) || 50),
  );

  const action =
    typeof req.query.action === 'string' &&
    ['created', 'updated', 'deleted'].includes(req.query.action)
      ? (req.query.action as AccessAuditAction)
      : undefined;

  const { items, total } = await accessAuditLogRepository.findWithPagination(
    page,
    limit,
    {
      action,
      actor: typeof req.query.actor === 'string' ? req.query.actor : undefined,
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
      accessId:
        typeof req.query.accessId === 'string'
          ? parseInt(req.query.accessId, 10)
          : undefined,
      glpiUserId:
        typeof req.query.glpiUserId === 'string'
          ? parseInt(req.query.glpiUserId, 10)
          : undefined,
    },
  );

  const missingIds = [
    ...new Set(
      items
        .filter((item) => !item.glpiUserName && item.glpiUserId)
        .map((item) => item.glpiUserId),
    ),
  ];

  const labels = new Map<number, string>();
  await Promise.all(
    missingIds.map(async (id) => {
      labels.set(id, await resolveGlpiUserLabel(id));
    }),
  );

  sendSuccess(
    res,
    items.map((item) => ({
      ...item,
      _id: item._id?.toString(),
      at: item.at?.toISOString?.() || item.at,
      glpiUserName:
        item.glpiUserName ||
        labels.get(item.glpiUserId) ||
        (item.glpiUserId ? `User #${item.glpiUserId}` : undefined),
    })),
    { total, page, limit },
  );
}

export default withErrorHandler(handler);
