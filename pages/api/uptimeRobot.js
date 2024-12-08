// pages/api/uptimeRobot.js
import { fetchMonitors } from '../../lib/uptimeRobot';

export default async function handler(req, res) {
  try {
    const monitors = await fetchMonitors();
    res.status(200).json(monitors);
  } catch (error) {
    console.error('Error in uptimeRobot API:', error);
    res.status(500).json({ error: 'Failed to fetch monitors' });
  }
}