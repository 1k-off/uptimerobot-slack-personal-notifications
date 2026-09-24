import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { fetchMonitors, MONITOR_STATUS } from '@/lib/uptimeRobot';

interface Metrics {
  totalMonitors: number;
  activeAlerts: number;
  alertSeverity: 'Healthy' | 'Degraded' | 'Down';
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Metrics | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session || !(session.user as { isAdmin?: boolean })?.isAdmin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    let totalMonitors = 0;
    let activeAlerts = 0;
    let downCount = 0;
    let looksDownCount = 0;

    try {
      const monitors = await fetchMonitors();
      totalMonitors = monitors.length;

      for (const monitor of monitors) {
        if (monitor.status === MONITOR_STATUS.DOWN) {
          downCount += 1;
        } else if (monitor.status === MONITOR_STATUS.SEEMS_DOWN) {
          looksDownCount += 1;
        }
      }

      activeAlerts = downCount + looksDownCount;
    } catch (error) {
      console.error('Error fetching monitors:', error);
    }

    const alertSeverity: Metrics['alertSeverity'] =
      downCount > 0 ? 'Down' : looksDownCount > 0 ? 'Degraded' : 'Healthy';

    res.status(200).json({
      totalMonitors,
      activeAlerts,
      alertSeverity,
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
}
