import { NextApiRequest, NextApiResponse } from 'next';
import { websiteRepository } from '@/lib/db';
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

    // Fetch website data from MongoDB using repository
    const dbWebsites = await websiteRepository.findByIds(websiteIds);

    const dbWebsitesMap = new Map(dbWebsites.map(w => [w.id, w]));

    // Merge data
    const mergedData = monitors.map((monitor) => {
      const dbData = dbWebsitesMap.get(monitor.id);
      return {
        ...monitor,
        friendly_name: dbData?.friendlyName || monitor.friendly_name,
        url: dbData?.url || monitor.url,
        alertContacts: dbData?.alertContacts || null,
        group: dbData?.group || null,
      };
    });

    sendSuccess(res, mergedData);
  } catch (error) {
    console.error('Error in websites API:', error);
    throw error;
  }
}

export default withErrorHandler(handler);
