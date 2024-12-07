import fetch from 'node-fetch';
import { getCachedData, setCachedData } from '../../lib/cache';

export default async function handler(req, res) {
    const apiKey = process.env.UPTIMEROBOT_API_KEY; // Make sure to set your UptimeRobot API key in .env.local

    // Check for cached websites
    const cachedWebsites = getCachedData('websites');
    if (cachedWebsites) {
        return res.status(200).json(cachedWebsites);
    }

    const limit = 50; // Maximum number of monitors to fetch per request
    let allMonitors = [];
    let offset = 0;
    let totalMonitors = 0;

    try {
        do {
            const body = new URLSearchParams({
                api_key: apiKey,
                limit: limit,
                offset: offset,
            });

            const response = await fetch('https://api.uptimerobot.com/v2/getMonitors', {
                method: 'POST',
                body: body,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });

            const data = await response.json();

            if (data.stat !== 'ok') {
                return res.status(500).json({ error: data.error });
            }

            totalMonitors = data.monitors.length;
            allMonitors = allMonitors.concat(data.monitors);
            offset += limit; // Move to the next set of monitors
        } while (totalMonitors === limit); // Continue fetching until fewer than limit monitors are returned

        const monitors = allMonitors.map(monitor => ({
            id: monitor.id,
            friendly_name: monitor.friendly_name,
            url: monitor.url,
            type: monitor.type,
            status: monitor.status,
            uptime_ratio: monitor.uptime_ratio,
        }));

        // Cache the websites
        setCachedData('websites', monitors);

        res.status(200).json(monitors);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch monitors' });
    }
}
