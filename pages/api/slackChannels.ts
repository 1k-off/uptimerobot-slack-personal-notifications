import { NextApiRequest, NextApiResponse } from 'next';
import { getCachedData, setCachedData } from '@/lib/cache';
import { withErrorHandler, sendSuccess } from '@/lib/api';
import { SlackChannel } from '@/types';

interface SlackConversation {
  id: string;
  name: string;
  is_archived: boolean;
  is_closed?: boolean;
}

interface SlackApiResponse {
  ok: boolean;
  error?: string;
  channels?: SlackConversation[];
  response_metadata?: {
    next_cursor?: string;
  };
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = process.env.SLACK_BOT_TOKEN;
  
  if (!token) {
    throw new Error('SLACK_BOT_TOKEN not configured');
  }

  let allChannels: SlackConversation[] = [];
  let cursor: string | undefined;

  // Retrieve hidden channels from environment variables
  const hiddenChannelsEnv = process.env.SLACK_HIDDEN_CHANNELS || '';
  const hiddenChannelNames = hiddenChannelsEnv
    .split(',')
    .map(name => name.trim())
    .filter(name => name.length > 0)
    .map(name => name.toLowerCase());

  // Retrieve cache time from environment variables (in seconds)
  const cacheTimeEnv = process.env.SLACK_DATA_CACHE_TIME || '1800';
  const cacheTime = parseInt(cacheTimeEnv, 10);

  if (isNaN(cacheTime) || cacheTime <= 0) {
    console.warn(`Invalid SLACK_DATA_CACHE_TIME value: ${cacheTimeEnv}. Falling back to default of 1800 seconds.`);
  }

  const effectiveCacheTime = (!isNaN(cacheTime) && cacheTime > 0) ? cacheTime : 1800;

  // Check for cached channels
  const cachedData = getCachedData('channels') as { channels: SlackChannel[]; timestamp: number } | null;
  if (cachedData) {
    const { channels: cachedChannels, timestamp } = cachedData;
    const currentTime = Date.now();
    const elapsedSeconds = (currentTime - timestamp) / 1000;

    if (elapsedSeconds < effectiveCacheTime) {
      const visibleChannels = cachedChannels.filter((channel: SlackChannel) =>
        !hiddenChannelNames.includes(channel.name.toLowerCase())
      );
      return sendSuccess(res, visibleChannels);
    }
  }

  try {
    do {
      const url = new URL('https://slack.com/api/conversations.list');
      url.searchParams.append('types', 'public_channel,private_channel');
      url.searchParams.append('limit', '1000');
      if (cursor) {
        url.searchParams.append('cursor', cursor);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data: SlackApiResponse = await response.json();

      if (!data.ok) {
        console.error('Error fetching channels from Slack API:', data.error);
        throw new Error(data.error || 'Failed to fetch channels');
      }

      allChannels = allChannels.concat(data.channels || []);
      cursor = data.response_metadata?.next_cursor;
    } while (cursor);

    const channels: SlackChannel[] = allChannels
      .filter(channel => !channel.is_archived && !hiddenChannelNames.includes(channel.name.toLowerCase()))
      .map(channel => ({
        id: channel.id,
        name: channel.name,
        isClosed: channel.is_closed || false,
      }));

    setCachedData('channels', { channels, timestamp: Date.now() }, effectiveCacheTime);

    sendSuccess(res, channels);
  } catch (error) {
    console.error('Unexpected error in Slack Channels handler:', error);
    throw error;
  }
}

export default withErrorHandler(handler);
