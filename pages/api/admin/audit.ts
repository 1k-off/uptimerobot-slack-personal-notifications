import type { NextApiRequest, NextApiResponse } from 'next';
import {
  auditLogRepository,
  type AuditAction,
  type AuditLogDocument,
} from '@/lib/db';
import { requireAdminSession } from '@/lib/api/require-admin';

interface ApiResponse {
  items?: AuditLogDocument[];
  total?: number;
  page?: number;
  limit?: number;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!(await requireAdminSession(req, res))) {
    return;
  }

  try {
    const {
      page = '1',
      limit = '50',
      search = '',
      websiteId = '',
      action = '',
      actor = '',
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const websiteIdNum =
      websiteId && String(websiteId).trim()
        ? parseInt(String(websiteId), 10)
        : undefined;

    const actionStr = String(action || '').trim();
    const validAction =
      actionStr === 'created' ||
      actionStr === 'updated' ||
      actionStr === 'deleted'
        ? (actionStr as AuditAction)
        : undefined;

    const { items, total } = await auditLogRepository.findWithPagination(
      pageNum,
      limitNum,
      {
        websiteId:
          typeof websiteIdNum === 'number' && !Number.isNaN(websiteIdNum)
            ? websiteIdNum
            : undefined,
        action: validAction,
        actor: String(actor || '').trim() || undefined,
        search: String(search || '').trim() || undefined,
      },
    );

    res.status(200).json({
      items,
      total,
      page: pageNum,
      limit: limitNum,
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
