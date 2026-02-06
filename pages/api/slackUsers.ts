import { NextApiRequest, NextApiResponse } from 'next';
import { getCachedData, setCachedData } from '@/lib/cache';
import { withErrorHandler, sendSuccess } from '@/lib/api';
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
  const token = process.env.SLACK_BOT_TOKEN;
  
  if (!token) {
    throw new Error('SLACK_BOT_TOKEN not configured');
  }

  let allUsers: SlackUserMember[] = [];
  let cursor: string | undefined;

  // Retrieve cache time from environment variables (in seconds)
  const cacheTimeStr = process.env.SLACK_DATA_CACHE_TIME || '1800';
  const cacheTimeNum = parseInt(cacheTimeStr, 10);

  if (isNaN(cacheTimeNum) || cacheTimeNum <= 0) {
    console.warn(`Invalid SLACK_DATA_CACHE_TIME value: ${cacheTimeStr}. Falling back to default of 1800 seconds.`);
  }
  const cacheTime = (!isNaN(cacheTimeNum) && cacheTimeNum > 0) ? cacheTimeNum : 1800;

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
          'Authorization': `Bearer ${token}`,
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
