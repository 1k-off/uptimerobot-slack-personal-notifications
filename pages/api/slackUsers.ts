import { NextApiRequest, NextApiResponse } from 'next';
import { getCachedData, setCachedData } from '@/lib/cache';
import { withErrorHandler, sendSuccess } from '@/lib/api';
import { getEnvConfig } from '@/lib/config';
import { SlackUser } from '@/types';

interface SlackUserMember {
  id: string;
  name: string;
  deleted: boolean;
  is_bot: boolean;
  real_name?: string;
  profile: {
    display_name?: string;
  };
}

interface SlackUsersResponse {
  ok: boolean;
  error?: string;
  members?: SlackUserMember[];
  response_metadata?: {
    next_cursor?: string;
  };
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const config = getEnvConfig();
  
  let allUsers: SlackUserMember[] = [];
  let cursor: string | undefined;

  const cacheTime = config.slackDataCacheTime;

  // Check for cached users
  const cachedData = getCachedData('users') as { users: SlackUser[]; timestamp: number } | null;
  if (cachedData) {
    const { users: cachedUsers, timestamp } = cachedData;
    const currentTime = Date.now();
    const elapsedSeconds = (currentTime - timestamp) / 1000;

    if (elapsedSeconds < cacheTime) {
      return sendSuccess(res, cachedUsers);
    }
  }

  try {
    do {
      const url = new URL('https://slack.com/api/users.list');
      url.searchParams.append('limit', '200');
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

      const data: SlackUsersResponse = await response.json();

      if (!data.ok) {
        console.error('Error fetching users:', data.error);
        throw new Error(data.error || 'Failed to fetch users');
      }

      // Filter out deactivated users and bots
      const activeUsers = (data.members || []).filter(user => !user.deleted && !user.is_bot);
      allUsers = allUsers.concat(activeUsers);

      cursor = data.response_metadata?.next_cursor;
    } while (cursor);

    const users: SlackUser[] = allUsers.map(user => ({
      id: user.id,
      name: user.profile.display_name || user.real_name || user.name,
    }));

    setCachedData('users', { users, timestamp: Date.now() }, cacheTime);

    sendSuccess(res, users);
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
}

export default withErrorHandler(handler);
