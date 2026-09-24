import { getEnvConfig } from '@/lib/config';
import { getCachedData, setCachedData } from '@/lib/cache';
import { SlackUser } from '@/types';

interface SlackUserMember {
  id: string;
  name: string;
  deleted: boolean;
  is_bot?: boolean;
  is_app_user?: boolean;
  real_name?: string;
  profile?: {
    display_name?: string;
  };
}

interface SlackUsersListResponse {
  ok: boolean;
  error?: string;
  members?: SlackUserMember[];
  response_metadata?: {
    next_cursor?: string;
  };
}

export interface SlackUsersSnapshot {
  activeUsers: SlackUser[];
  activeIds: Set<string>;
  deletedIds: Set<string>;
}

async function fetchAllMembers(token: string): Promise<SlackUserMember[]> {
  const members: SlackUserMember[] = [];
  let cursor: string | undefined;

  do {
    const url = new URL('https://slack.com/api/users.list');
    url.searchParams.append('limit', '200');
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

    const data: SlackUsersListResponse = await response.json();

    if (!data.ok) {
      throw new Error(data.error || 'Failed to fetch Slack users');
    }

    members.push(...(data.members || []));
    cursor = data.response_metadata?.next_cursor || undefined;
  } while (cursor);

  return members;
}

function toSlackUser(member: SlackUserMember): SlackUser {
  return {
    id: member.id,
    name: member.profile?.display_name || member.real_name || member.name,
  };
}

/**
 * Fetch workspace users and split into active vs deleted.
 * Uses the same cache key as /api/slackUsers for active list.
 */
export async function getSlackUsersSnapshot(options?: {
  bypassCache?: boolean;
}): Promise<SlackUsersSnapshot> {
  const config = getEnvConfig();
  const cacheTime = config.slackDataCacheTime;

  if (!options?.bypassCache) {
    const cached = getCachedData('users') as
      | { users: SlackUser[]; timestamp: number; deletedIds?: string[] }
      | null;

    if (cached) {
      const elapsedSeconds = (Date.now() - cached.timestamp) / 1000;
      if (elapsedSeconds < cacheTime && cached.deletedIds) {
        return {
          activeUsers: cached.users,
          activeIds: new Set(cached.users.map((u) => u.id)),
          deletedIds: new Set(cached.deletedIds),
        };
      }
    }
  }

  const members = await fetchAllMembers(config.slackBotToken);

  const activeMembers = members.filter(
    (user) => !user.deleted && !user.is_bot && !user.is_app_user,
  );
  const deletedMembers = members.filter((user) => user.deleted);

  const activeUsers = activeMembers.map(toSlackUser);
  const deletedIds = new Set(deletedMembers.map((u) => u.id));

  setCachedData(
    'users',
    {
      users: activeUsers,
      deletedIds: [...deletedIds],
      timestamp: Date.now(),
    },
    cacheTime,
  );

  return {
    activeUsers,
    activeIds: new Set(activeUsers.map((u) => u.id)),
    deletedIds,
  };
}
