import fetch from 'node-fetch';
import { getCachedData, setCachedData } from './cache';

export async function fetchMonitors() {
  const apiKey = process.env.UPTIMEROBOT_API_KEY;

  // ... (existing caching logic) ...

  const limit = 50;
  let allMonitors = [];
  let offset = 0;
  let totalMonitors = 0;

  try {
    do {
      const body = new URLSearchParams({
        api_key: apiKey,
        format: 'json',
        limit: limit.toString(),
        offset: offset.toString(),
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
        console.error('Error fetching monitors:', data.error);
        throw new Error(data.error);
      }

      totalMonitors = data.monitors.length;
      allMonitors = allMonitors.concat(data.monitors);
      offset += limit;
    } while (totalMonitors === limit);

    const monitors = allMonitors.map((monitor) => ({
      id: monitor.id,
      friendly_name: monitor.friendly_name,
      url: monitor.url,
      type: monitor.type,
      status: monitor.status,
      uptime_ratio: monitor.uptime_ratio,
    }));

    // Cache the monitors
    setCachedData('websites', { monitors, timestamp: Date.now() });

    return monitors;
  } catch (error) {
    console.error('Error fetching monitors:', error);
    throw error;
  }
}
