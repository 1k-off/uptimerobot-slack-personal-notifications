import { NextApiRequest, NextApiResponse } from 'next';
import { websiteRepository } from '@/lib/db';
import { getSlackClient } from '@/lib/services/slack-client';
import { getEnvConfig } from '@/lib/config';
import { getCachedData, setCachedData } from '@/lib/cache';
import { WebhookData, SlackMessageData, Website } from '@/types';
import { saveMessageRecord, updateMessageRecord } from '@/lib/slack-cleanup';
import '@/lib/init';

const CACHE_TTL_SECONDS = 3600;

interface AggregatedAlert {
  monitorID: string;
  monitorFriendlyName: string;
  monitorURL: string;
  alertTypeFriendlyName: string;
}

interface ApiResponse {
  message?: string;
  error?: string;
}

type AlertEventKind = 'down' | 'up' | 'generic';

function getAlertEventKind(alertType: string, alertTypeFriendlyName: string): AlertEventKind {
  const norm = alertTypeFriendlyName.toLowerCase();
  if (alertType === '1' || norm === 'down') return 'down';
  if (alertType === '2' || norm === 'up') return 'up';
  return 'generic';
}

/**
 * Respect per-monitor notification toggles from the edit UI.
 * Defaults match editWebsite.tsx: down/up on, latency off.
 */
function shouldSendNotification(
  website: Website,
  alertType: string,
  alertTypeFriendlyName: string,
): boolean {
  const prefs = website.notificationPreferences ?? {
    downAlerts: true,
    upAlerts: true,
    latencyAlerts: false,
  };

  const norm = alertTypeFriendlyName.toLowerCase();

  if (norm.includes('latency') || norm.includes('slow') || norm.includes('response time')) {
    return prefs.latencyAlerts === true;
  }

  const kind = getAlertEventKind(alertType, alertTypeFriendlyName);
  if (kind === 'down') return prefs.downAlerts !== false;
  if (kind === 'up') return prefs.upAlerts !== false;

  // SSL / other alert types have no toggle — always notify
  return true;
}

function channelMessageKey(groupId: string, channelId: string, kind: AlertEventKind): string {
  return `${groupId}_${channelId}_${kind}_message`;
}

function aggregatedListKey(groupId: string, kind: AlertEventKind): string {
  return `${groupId}_${kind}_aggregated`;
}

function clearOppositeEventCache(
  groupId: string,
  channelIds: string[],
  currentKind: AlertEventKind,
): void {
  const opposite: AlertEventKind | null =
    currentKind === 'down' ? 'up' : currentKind === 'up' ? 'down' : null;

  if (!opposite) return;

  setCachedData(aggregatedListKey(groupId, opposite), null, 0);
  for (const channelId of channelIds) {
    setCachedData(channelMessageKey(groupId, channelId, opposite), null, 0);
  }

  // Clear legacy group-only keys from older deployments
  setCachedData(`${groupId}_${opposite}_thread`, null, 0);
  setCachedData(`${groupId}_${opposite}_aggregated`, null, 0);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  const config = getEnvConfig();
  const providedToken = req.query.token as string;

  if (!providedToken || providedToken !== config.webhookSecretToken) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  try {
    const {
      monitorID,
      monitorURL,
      monitorFriendlyName,
      alertType,
      alertTypeFriendlyName,
      alertDetails,
      alertDuration,
      alertDateTime,
      sslExpiryDate,
      sslExpiryDaysLeft,
    }: WebhookData = req.body;

    const website = await websiteRepository.findById(parseInt(monitorID)) as Website | null;

    if (!website || !website.alertContacts) {
      res.status(200).json({ message: 'No alert contacts defined.' });
      return;
    }

    if (!shouldSendNotification(website, alertType, alertTypeFriendlyName)) {
      res.status(200).json({ message: 'Notification skipped by preferences.' });
      return;
    }

    const slackUsers = website.alertContacts.slack.users || [];
    const slackChannels = website.alertContacts.slack.channels || [];

    if (slackUsers.length === 0 && slackChannels.length === 0) {
      res.status(200).json({ message: 'No Slack users or channels to notify.' });
      return;
    }

    const slackClient = getSlackClient();

    const standardMessage = formatSlackMessage({
      monitorURL,
      monitorFriendlyName,
      alertType,
      alertTypeFriendlyName,
      alertDetails,
      alertDuration,
      alertDateTime,
      sslExpiryDate,
      sslExpiryDaysLeft,
    });

    if (website.group) {
      const groupId = website.group._id.toString();
      const eventKind = getAlertEventKind(alertType, alertTypeFriendlyName);

      clearOppositeEventCache(groupId, slackChannels, eventKind);

      const aggKey = aggregatedListKey(groupId, eventKind);
      const groupMessage = `Website *${website.friendlyName}* from group *${website.group.name}* is now *${alertTypeFriendlyName}*`;
      const aggregatedList = getCachedData<AggregatedAlert[]>(aggKey) || [];

      if (!aggregatedList.find((item) => item.monitorID === monitorID)) {
        aggregatedList.push({
          monitorID,
          monitorFriendlyName,
          monitorURL,
          alertTypeFriendlyName,
        });
      }
      setCachedData(aggKey, aggregatedList, CACHE_TTL_SECONDS);

      const aggregatedMessage = aggregatedList
        .map(
          (item) =>
            `• *${item.monitorFriendlyName}* (<${item.monitorURL}|${item.monitorURL}>) is now *${item.alertTypeFriendlyName}*`,
        )
        .join('\n');

      // Each channel keeps its own Slack message ts — they are not interchangeable
      for (const channelId of slackChannels) {
        const messageKey = channelMessageKey(groupId, channelId, eventKind);
        const existingTs = getCachedData<string>(messageKey) || undefined;

        if (existingTs) {
          try {
            await slackClient.chat.update({
              channel: channelId,
              ts: existingTs,
              text: aggregatedMessage,
            });
            await updateMessageRecord(existingTs, existingTs);
          } catch (error) {
            console.error(
              `Failed to update aggregated message in channel ${channelId}:`,
              error,
            );
            // Stale ts (e.g. deleted) — post a fresh message for this channel
            const result = await slackClient.chat.postMessage({
              channel: channelId,
              text: aggregatedMessage,
              unfurl_links: false,
              unfurl_media: false,
            });
            if (result.ts) {
              setCachedData(messageKey, result.ts, CACHE_TTL_SECONDS);
              await saveMessageRecord({
                messageId: result.ts,
                channelId,
                threadTs: result.ts,
                websiteId: parseInt(monitorID),
                groupId,
                alertType: alertTypeFriendlyName,
              });
            }
          }
        } else {
          const result = await slackClient.chat.postMessage({
            channel: channelId,
            text: aggregatedMessage,
            unfurl_links: false,
            unfurl_media: false,
          });

          if (result.ts) {
            setCachedData(messageKey, result.ts, CACHE_TTL_SECONDS);
            await saveMessageRecord({
              messageId: result.ts,
              channelId,
              threadTs: result.ts,
              websiteId: parseInt(monitorID),
              groupId,
              alertType: alertTypeFriendlyName,
            });
          }
        }
      }

      for (const userId of slackUsers) {
        try {
          await slackClient.chat.postMessage({
            channel: userId,
            text: groupMessage,
            unfurl_links: false,
            unfurl_media: false,
          });
        } catch (error) {
          console.error(`Failed to send message to Slack user ${userId}:`, error);
        }
      }
    } else {
      for (const channelId of slackChannels) {
        const result = await slackClient.chat.postMessage({
          channel: channelId,
          text: standardMessage,
          unfurl_links: false,
          unfurl_media: false,
        });

        if (result.ts) {
          await saveMessageRecord({
            messageId: result.ts,
            channelId,
            websiteId: parseInt(monitorID),
            alertType: alertTypeFriendlyName,
          });
        }
      }

      for (const userId of slackUsers) {
        try {
          await slackClient.chat.postMessage({
            channel: userId,
            text: standardMessage,
            unfurl_links: false,
            unfurl_media: false,
          });
        } catch (error) {
          console.error(`Failed to send message to Slack user ${userId}:`, error);
        }
      }
    }

    res.status(200).json({ message: 'Notifications sent successfully.' });
  } catch (error) {
    console.error('Error sending notifications:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
}

function formatSlackMessage(data: SlackMessageData): string {
  const {
    monitorURL,
    monitorFriendlyName,
    alertType,
    alertTypeFriendlyName,
    alertDetails,
    alertDuration,
    alertDateTime,
    sslExpiryDate,
    sslExpiryDaysLeft,
  } = data;

  let message = `*${monitorFriendlyName}* (${monitorURL}) is now *${alertTypeFriendlyName}*.\n`;

  if (alertDetails) {
    message += `*Details:* ${alertDetails}\n`;
  }

  if (alertType === '2' && alertDuration) {
    const duration = formatDuration(alertDuration);
    message += `*Downtime Duration:* ${duration}\n`;
  }

  if (alertType === '3') {
    if (sslExpiryDaysLeft) {
      message += `*SSL Certificate expires in:* ${sslExpiryDaysLeft} days\n`;
    }
    if (sslExpiryDate) {
      const expiryDate = new Date(parseInt(sslExpiryDate) * 1000).toLocaleString();
      message += `*SSL Expiry Date:* ${expiryDate}\n`;
    }
  }

  const alertDate = new Date(parseInt(alertDateTime) * 1000).toLocaleString();
  message += `*Alert Time:* ${alertDate}`;

  return message;
}

function formatDuration(seconds: string): string {
  const sec = parseInt(seconds, 10);
  return `${sec} sec`;
}
