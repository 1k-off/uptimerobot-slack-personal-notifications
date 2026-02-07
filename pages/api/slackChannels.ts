import { NextApiRequest, NextApiResponse } from 'next';
import { getCachedData, setCachedData } from '@/lib/cache';
import { withErrorHandler, sendSuccess } from '@/lib/api';
import { getEnvConfig } from '@/lib/config';
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
  const config = getEnvConfig();
  
  let allChannels: SlackConversation[] = [];
  let cursor: string | undefined;

  const hiddenChannelNames = config.slackHiddenChannels.map(name => name.toLowerCase());
  const cacheTime = config.slackDataCacheTime;

  // Check for cached channels
  const cachedData = getCachedData('channels') as { channels: SlackChannel[]; timestamp: number } | null;
  if (cachedData) {
    const { channels: cachedChannels, timestamp } = cachedData;
    const currentTime = Date.now();
    const elapsedSeconds = (currentTime - timestamp) / 1000;

    if (elapsedSeconds < cacheTime) {
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
          'Authorization': `Bearer ${config.slackBotToken}`,
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

    setCachedData('channels', { channels, timestamp: Date.now() }, cacheTime);

    sendSuccess(res, channels);
  } catch (error) {
    console.error('Unexpected error in Slack Channels handler:', error);
    throw error;
  }
}

export default withErrorHandler(handler);
