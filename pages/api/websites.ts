import { NextApiRequest, NextApiResponse } from 'next';
import { getDatabase } from '@/lib/db';
import { fetchMonitors } from '@/lib/uptimeRobot';
import { withErrorHandler, sendSuccess, sendError } from '@/lib/api';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return sendError(res, 405, `Method ${req.method} Not Allowed`);
  }

  try {
    // Fetch monitors from UptimeRobot
    const monitors = await fetchMonitors();
    const websiteIds = monitors.map((m) => m.id);
    const db = await getDatabase();

    // Fetch website data from MongoDB
    const dbWebsites = await db
      .collection('websites')
      .find({ id: { $in: websiteIds } })
      .toArray();

    interface DbWebsite {
      id: number;
      friendlyName?: string;
      url?: string;
      alertContacts?: unknown;
      group?: unknown;
    }

    const dbWebsitesMap: Record<number, DbWebsite> = {};
    dbWebsites.forEach((w) => {
      const website = w as unknown as DbWebsite;
      if (website.id) {
        dbWebsitesMap[website.id] = website;
      }
    });

    // Merge data
    const mergedData = monitors.map((monitor) => {
      const dbData = dbWebsitesMap[monitor.id] || {};
      return {
        ...monitor,
        friendly_name: dbData.friendlyName || monitor.friendly_name,
        url: dbData.url || monitor.url,
        alertContacts: dbData.alertContacts || null,
        group: dbData.group || null,
      };
    });

    sendSuccess(res, mergedData);
  } catch (error) {
    console.error('Error in websites API:', error);
    throw error;
  }
}

export default withErrorHandler(handler);
