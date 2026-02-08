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
    // Get pagination and search parameters from query
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = ((req.query.search as string) || '').toLowerCase();

    // Fetch all monitors from UptimeRobot
    const allMonitors = await fetchMonitors();

    // Filter by search if provided
    let filteredMonitors = allMonitors;
    if (search) {
      filteredMonitors = allMonitors.filter(monitor => 
        monitor.friendly_name.toLowerCase().includes(search) ||
        monitor.url.toLowerCase().includes(search)
      );
    }

    // Apply pagination
    const total = filteredMonitors.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedMonitors = filteredMonitors.slice(startIndex, endIndex);

    const websiteIds = paginatedMonitors.map((m) => m.id);

    // Fetch website data from MongoDB using repository
    const dbWebsites = await websiteRepository.findByIds(websiteIds);

    const dbWebsitesMap = new Map(dbWebsites.map(w => [w.id, w]));

    // Merge data
    const mergedData = paginatedMonitors.map((monitor) => {
      const dbData = dbWebsitesMap.get(monitor.id);
      return {
        ...monitor,
        friendly_name: dbData?.friendlyName || monitor.friendly_name,
        url: dbData?.url || monitor.url,
        alertContacts: dbData?.alertContacts || null,
        group: dbData?.group || null,
      };
    });

    sendSuccess(res, mergedData, { total, page, limit });
  } catch (error) {
    console.error('Error in websites API:', error);
    throw error;
  }
}

export default withErrorHandler(handler);
