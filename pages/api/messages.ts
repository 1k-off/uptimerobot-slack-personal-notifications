import { NextApiRequest, NextApiResponse } from 'next';
import { messageRepository, websiteRepository } from '@/lib/db';
import { Message } from '@/types';
import { requireAdminSession } from '@/lib/api/require-admin';
import { fetchMonitors } from '@/lib/uptimeRobot';

export interface MessageListItem extends Message {
  websiteUrl?: string;
  websiteName?: string;
}

interface ApiResponse {
  messages?: MessageListItem[];
  total?: number;
  page?: number;
  limit?: number;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!(await requireAdminSession(req, res))) {
    return;
  }

  try {
    const { page = '1', limit = '50', search = '' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const searchStr = search as string;

    const { messages, total } = await messageRepository.findWithPagination(
      pageNum,
      limitNum,
      searchStr.trim() || undefined
    );

    const websiteIds = [
      ...new Set(
        messages
          .map((message) => message.websiteId)
          .filter((id): id is number => typeof id === 'number' && !Number.isNaN(id)),
      ),
    ];

    const websiteLabels = new Map<number, { url?: string; name?: string }>();

    if (websiteIds.length > 0) {
      try {
        const dbWebsites = await websiteRepository.findByIds(websiteIds);
        for (const website of dbWebsites) {
          websiteLabels.set(website.id, {
            url: website.url,
            name: website.friendlyName,
          });
        }
      } catch (error) {
        console.error('Failed to load website labels from DB:', error);
      }

      try {
        const monitors = await fetchMonitors();
        const monitorById = new Map(
          monitors.map((monitor) => [monitor.id, monitor]),
        );

        for (const id of websiteIds) {
          const existing = websiteLabels.get(id) || {};
          const monitor = monitorById.get(id);
          if (!monitor && !existing.url && !existing.name) {
            continue;
          }
          websiteLabels.set(id, {
            url: existing.url || monitor?.url,
            name: existing.name || monitor?.friendly_name,
          });
        }
      } catch (error) {
        console.error('Failed to load website labels from UptimeRobot:', error);
      }
    }

    const enrichedMessages: MessageListItem[] = messages.map((message) => {
      const label = websiteLabels.get(message.websiteId);
      return {
        ...(message as unknown as Message),
        websiteUrl: label?.url,
        websiteName: label?.name,
      };
    });

    res.status(200).json({
      messages: enrichedMessages,
      total,
      page: pageNum,
      limit: limitNum,
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
