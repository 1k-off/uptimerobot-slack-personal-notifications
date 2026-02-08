import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { messageRepository } from '@/lib/db/repositories/message.repository';
import { fetchMonitors } from '@/lib/uptimeRobot';
import { getCachedData } from '@/lib/cache';
import { SlackChannel } from '@/types';

interface Metrics {
  totalMonitors: number;
  activeAlerts: number;
  connectedChannels: number;
  apiUptime: number;
  monitorTrend: string;
  alertSeverity: string;
  recentMessages: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Metrics | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  
  if (!session || !(session.user as any)?.isAdmin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Default values
    let totalMonitors = 0;
    let activeAlerts = 0;
    let connectedChannels = 0;
    let apiUptime = 100.00;
    let recentMessages = 0;
    let previousMessages = 0;

    // Fetch monitors from UptimeRobot
    try {
      const monitors = await fetchMonitors();
      totalMonitors = monitors.length;
      activeAlerts = monitors.filter(m => m.status !== 2).length;
      
      const uptimes = monitors.map(m => parseFloat(String(m.uptime_ratio || 100)));
      apiUptime = uptimes.length > 0 
        ? parseFloat((uptimes.reduce((a, b) => a + b, 0) / uptimes.length).toFixed(2))
        : 100.00;
    } catch (error) {
      console.error('Error fetching monitors:', error);
    }

    // Get channels count from cache
    try {
      const cachedData = getCachedData('channels') as { channels: SlackChannel[]; timestamp: number } | null;
      if (cachedData && cachedData.channels) {
        connectedChannels = cachedData.channels.length;
      }
    } catch (error) {
      console.error('Error fetching channels:', error);
    }

    // Get recent messages count
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
      
      recentMessages = await messageRepository.countByDateRange(oneDayAgo, new Date());
      previousMessages = await messageRepository.countByDateRange(twoDaysAgo, oneDayAgo);
    } catch (error) {
      console.error('Error fetching message counts:', error);
    }

    // Calculate trends
    const trendValue = previousMessages > 0 
      ? Math.round(((recentMessages - previousMessages) / previousMessages) * 100)
      : 0;
    const monitorTrend = `${trendValue > 0 ? '+' : ''}${trendValue}%`;

    const alertSeverity = activeAlerts > 10 ? 'Critical' : activeAlerts > 5 ? 'Warning' : 'Normal';

    const metrics: Metrics = {
      totalMonitors,
      activeAlerts,
      connectedChannels,
      apiUptime,
      monitorTrend,
      alertSeverity,
      recentMessages,
    };

    res.status(200).json(metrics);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
}
