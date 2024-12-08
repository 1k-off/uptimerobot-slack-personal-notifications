import clientPromise from '../../lib/mongodb';
import { fetchMonitors } from '../../lib/uptimeRobot';

export default async function handler(req, res) {
  const { method } = req;

  if (method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${method} Not Allowed`);
  }

  try {
    // Fetch monitors from UptimeRobot
    const monitors = await fetchMonitors();

    // Convert monitor IDs to integers
    const websiteIds = monitors.map((m) => parseInt(m.id));

    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db();

    // Fetch website data from MongoDB
    const dbWebsites = await db
      .collection('websites')
      .find({ id: { $in: websiteIds } })
      .toArray();

    const dbWebsitesMap = {};
    dbWebsites.forEach((w) => {
      dbWebsitesMap[w.id] = w;
    });

    // Merge data
    const mergedData = monitors.map((monitor) => {
      const dbData = dbWebsitesMap[parseInt(monitor.id)] || {};
      return {
        ...monitor,
        friendly_name: dbData.friendlyName || monitor.friendly_name,
        url: dbData.url || monitor.url,
        alertContacts: dbData.alertContacts || null,
      };
    });

    res.status(200).json(mergedData);
  } catch (error) {
    console.error('Error in websites API:', error);
    res.status(500).json({ error: 'Failed to fetch websites' });
  }
}
