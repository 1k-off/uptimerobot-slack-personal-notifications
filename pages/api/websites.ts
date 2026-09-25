import { NextApiRequest, NextApiResponse } from 'next';
import { websiteRepository } from '@/lib/db';
import { fetchMonitors } from '@/lib/uptimeRobot';
import { withErrorHandler, sendSuccess, sendError } from '@/lib/api';
import { getSlackUsersSnapshot } from '@/lib/services/slack-users';
import { getSlackChannelsList } from '@/lib/services/slack-channels';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return sendError(res, 405, `Method ${req.method} Not Allowed`);
  }

  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = ((req.query.search as string) || '').toLowerCase().trim();
    const statusFilter = ((req.query.status as string) || 'all').toLowerCase();

    // Fetch all monitors from UptimeRobot
    const allMonitors = await fetchMonitors();

    // Load MongoDB records for ownership / merge (needed before pagination for not-owned)
    const allDbWebsites = await websiteRepository.findByIds(
      allMonitors.map((m) => m.id),
    );
    const dbWebsitesMap = new Map(allDbWebsites.map((w) => [w.id, w]));

    const hasAlertContacts = (monitorId: number): boolean => {
      const dbData = dbWebsitesMap.get(monitorId);
      const users = dbData?.alertContacts?.slack?.users ?? [];
      const channels = dbData?.alertContacts?.slack?.channels ?? [];
      return users.length > 0 || channels.length > 0;
    };

    // Resolve Slack contact names for search (users + channels)
    const contactLabels = new Map<string, string>();
    if (search) {
      try {
        const [usersSnapshot, channels] = await Promise.all([
          getSlackUsersSnapshot(),
          getSlackChannelsList(),
        ]);
        for (const user of usersSnapshot.activeUsers) {
          contactLabels.set(user.id.toLowerCase(), user.name.toLowerCase());
        }
        for (const channel of channels) {
          contactLabels.set(
            channel.id.toLowerCase(),
            channel.name.toLowerCase(),
          );
        }
      } catch (error) {
        console.warn(
          'Alert-contact search: failed to load Slack contacts',
          error,
        );
      }
    }

    const matchesAlertContacts = (monitorId: number): boolean => {
      const dbData = dbWebsitesMap.get(monitorId);
      const users = dbData?.alertContacts?.slack?.users ?? [];
      const channels = dbData?.alertContacts?.slack?.channels ?? [];
      const ids = [...users, ...channels];

      const needle = search.startsWith('#') ? search.slice(1) : search;

      return ids.some((id) => {
        const idLower = id.toLowerCase();
        if (idLower.includes(needle)) return true;
        const label = contactLabels.get(idLower);
        return Boolean(label && label.includes(needle));
      });
    };

    // Filter by search if provided
    let filteredMonitors = allMonitors;
    if (search) {
      filteredMonitors = filteredMonitors.filter((monitor) => {
        const dbData = dbWebsitesMap.get(monitor.id);
        const name = (
          dbData?.friendlyName ||
          monitor.friendly_name ||
          ''
        ).toLowerCase();
        const url = (dbData?.url || monitor.url || '').toLowerCase();
        const groupName = (dbData?.group?.name || '').toLowerCase();

        return (
          name.includes(search) ||
          url.includes(search) ||
          groupName.includes(search) ||
          matchesAlertContacts(monitor.id)
        );
      });
    }

    // Filter by status: down = LOOKS_DOWN (8) or DOWN (9)
    if (statusFilter === 'down') {
      filteredMonitors = filteredMonitors.filter(
        (monitor) => monitor.status === 8 || monitor.status === 9,
      );
    }

    // Not owned = no Slack users or channels subscribed
    if (statusFilter === 'not-owned' || statusFilter === 'not_owned') {
      filteredMonitors = filteredMonitors.filter(
        (monitor) => !hasAlertContacts(monitor.id),
      );
    }

    // Apply pagination
    const total = filteredMonitors.length;
    const totalAll = allMonitors.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedMonitors = filteredMonitors.slice(startIndex, endIndex);

    // Merge data
    const mergedData = paginatedMonitors.map((monitor) => {
      const dbData = dbWebsitesMap.get(monitor.id);
      return {
        ...monitor,
        friendly_name: dbData?.friendlyName || monitor.friendly_name,
        url: dbData?.url || monitor.url,
        alertContacts: dbData?.alertContacts || null,
        group: dbData?.group || null,
        createdBy: dbData?.createdBy || 'system',
      };
    });

    sendSuccess(res, mergedData, { total, totalAll, page, limit });
  } catch (error) {
    console.error('Error in websites API:', error);
    throw error;
  }
}

export default withErrorHandler(handler);
