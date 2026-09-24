import { websiteRepository, WebsiteDocument } from '@/lib/db';
import { getSlackUsersSnapshot } from '@/lib/services/slack-users';

export interface PruneDeactivatedUsersResult {
  websitesScanned: number;
  websitesUpdated: number;
  usersRemoved: number;
  removedUserIds: string[];
  details: Array<{
    websiteId: number;
    friendlyName?: string;
    removedUserIds: string[];
  }>;
}

/**
 * Remove Slack user IDs that are deleted / not in the active workspace
 * from all website alert contact subscriptions.
 */
export async function pruneDeactivatedUsersFromSubscriptions(): Promise<PruneDeactivatedUsersResult> {
  const { activeIds } = await getSlackUsersSnapshot({ bypassCache: true });
  const websites = await websiteRepository.findAll();

  const removedUserIds = new Set<string>();
  const details: PruneDeactivatedUsersResult['details'] = [];
  let websitesUpdated = 0;
  let usersRemoved = 0;

  for (const website of websites) {
    const currentUsers = website.alertContacts?.slack?.users;
    if (!currentUsers?.length) {
      continue;
    }

    const kept: string[] = [];
    const removed: string[] = [];

    for (const userId of currentUsers) {
      if (activeIds.has(userId)) {
        kept.push(userId);
      } else {
        removed.push(userId);
        removedUserIds.add(userId);
      }
    }

    if (removed.length === 0) {
      continue;
    }

    const nextContacts: WebsiteDocument['alertContacts'] = {
      slack: {
        users: kept,
        channels: website.alertContacts?.slack?.channels || [],
      },
    };

    await websiteRepository.update(website.id, {
      alertContacts: nextContacts,
    });

    websitesUpdated++;
    usersRemoved += removed.length;
    details.push({
      websiteId: website.id,
      friendlyName: website.friendlyName,
      removedUserIds: removed,
    });
  }

  return {
    websitesScanned: websites.length,
    websitesUpdated,
    usersRemoved,
    removedUserIds: [...removedUserIds],
    details,
  };
}
