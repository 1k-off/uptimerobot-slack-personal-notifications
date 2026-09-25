import { getEnvConfig } from '@/lib/config';
import { getCachedData, setCachedData } from '@/lib/cache';
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

async function fetchAllConversations(token: string): Promise<SlackConversation[]> {
  const channels: SlackConversation[] = [];
  let cursor: string | undefined;

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
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data: SlackApiResponse = await response.json();

    if (!data.ok) {
      throw new Error(data.error || 'Failed to fetch Slack channels');
    }

    channels.push(...(data.channels || []));
    cursor = data.response_metadata?.next_cursor || undefined;
  } while (cursor);

  return channels;
}

/**
 * Workspace channels (public + private), excluding archived / hidden.
 * Uses the same cache key as /api/slackChannels.
 */
export async function getSlackChannelsList(options?: {
  bypassCache?: boolean;
}): Promise<SlackChannel[]> {
  const config = getEnvConfig();
  const cacheTime = config.slackDataCacheTime;
  const hiddenChannelNames = config.slackHiddenChannels.map((name) =>
    name.toLowerCase(),
  );

  if (!options?.bypassCache) {
    const cachedData = getCachedData('channels') as {
      channels: SlackChannel[];
      timestamp: number;
    } | null;

    if (cachedData) {
      const elapsedSeconds = (Date.now() - cachedData.timestamp) / 1000;
      if (elapsedSeconds < cacheTime) {
        return cachedData.channels.filter(
          (channel) =>
            !hiddenChannelNames.includes(channel.name.toLowerCase()),
        );
      }
    }
  }

  const allChannels = await fetchAllConversations(config.slackBotToken);
  const channels: SlackChannel[] = allChannels
    .filter(
      (channel) =>
        !channel.is_archived &&
        !hiddenChannelNames.includes(channel.name.toLowerCase()),
    )
    .map((channel) => ({
      id: channel.id,
      name: channel.name,
      isClosed: channel.is_closed || false,
    }));

  setCachedData('channels', { channels, timestamp: Date.now() }, cacheTime);
  return channels;
}
