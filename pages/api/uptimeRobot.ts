import { websiteRepository, auditLogRepository } from '@/lib/db';
import { fetchMonitors, newMonitor, deleteMonitor } from '@/lib/uptimeRobot';
import { sendSlackNotification } from '@/lib/slack';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import type { NextApiRequest, NextApiResponse } from 'next';
import { withErrorHandler } from '@/lib/api/response';
import { actorFromSession } from '@/lib/api/require-admin';

interface NewMonitorRequest {
  action: 'newMonitor';
  url: string;
  keyword_value?: string;
}

interface DeleteMonitorRequest {
  action: 'deleteMonitor';
  id: string;
  url?: string;
  friendly_name?: string;
}

type UptimeRobotRequest = NewMonitorRequest | DeleteMonitorRequest;

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const actor = actorFromSession(session);
  const { method } = req;

  if (method === 'GET') {
    const monitors = await fetchMonitors();
    res.status(200).json(monitors);
    return;
  }

  if (method === 'POST') {
    const { action } = req.body as UptimeRobotRequest;

    switch (action) {
      case 'newMonitor': {
        const { url, keyword_value } = req.body as NewMonitorRequest;

        if (!url) {
          res.status(400).json({ error: 'Missing "url" in request body' });
          return;
        }

        const friendly_name = url.replace(/(^\w+:|^)\/\//, '');
        const createdData = await newMonitor({
          friendly_name,
          url,
          keyword_value: keyword_value || undefined,
        });

        const monitorId = createdData?.id;
        if (typeof monitorId === 'number') {
          try {
            await websiteRepository.upsert(monitorId, {
              friendlyName: friendly_name,
              url,
              createdBy: actor,
              updatedBy: actor,
            });
            await auditLogRepository.append({
              action: 'created',
              websiteId: monitorId,
              url,
              name: friendly_name,
              actor,
              summary: 'Monitor created',
            });
          } catch (error) {
            console.error('Failed to persist create audit:', error);
          }
        }

        await sendSlackNotification({
          action: 'created',
          url,
          friendly_name,
          userEmail: session.user?.email || 'Unknown',
        });

        res.status(200).json({
          message: 'Monitor created',
          data: createdData,
        });
        return;
      }

      case 'deleteMonitor': {
        const { id, url, friendly_name } = req.body as DeleteMonitorRequest;

        if (!id) {
          res.status(400).json({ error: 'Missing "id" in request body' });
          return;
        }

        const numericId = parseInt(id, 10);
        const existing = await websiteRepository.findById(numericId);
        const deletedName = friendly_name || existing?.friendlyName || 'Unknown Name';
        const deletedUrl = url || existing?.url || 'Unknown URL';

        await deleteMonitor({ id: numericId });

        let dbDeleted = false;
        try {
          dbDeleted = await websiteRepository.delete(numericId);
        } catch (dbError) {
          console.error('Error deleting website from DB:', dbError);
          res.status(500).json({
            error:
              'Monitor deleted from UptimeRobot, but failed to delete record in DB.',
            dbError,
          });
          return;
        }

        try {
          await auditLogRepository.append({
            action: 'deleted',
            websiteId: numericId,
            url: deletedUrl !== 'Unknown URL' ? deletedUrl : undefined,
            name: deletedName !== 'Unknown Name' ? deletedName : undefined,
            actor,
            summary: 'Monitor deleted',
          });
        } catch (error) {
          console.error('Failed to persist delete audit:', error);
        }

        await sendSlackNotification({
          action: 'deleted',
          url: deletedUrl,
          friendly_name: deletedName,
          userEmail: session.user?.email || 'Unknown',
        });

        res.status(200).json({
          message: 'Monitor deleted',
          data: {
            uptimeRobotResult: undefined,
            dbDeleted,
          },
        });
        return;
      }

      default:
        res.status(400).json({ error: 'Invalid action' });
        return;
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${method} Not Allowed`);
}

export default withErrorHandler(handler);
