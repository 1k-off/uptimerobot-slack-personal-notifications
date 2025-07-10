import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '@/lib/mongodb';
import { WebClient } from '@slack/web-api';
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  // Verify secret token
  const secretToken = process.env.WEBHOOK_SECRET_TOKEN;
  const providedToken = req.query.token as string;

  if (!providedToken || providedToken !== secretToken) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  try {
    // Extract data from POST request
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

    // Connect to the database and retrieve the website
    const { db } = await connectToDatabase();
    const websitesCollection = db.collection('websites');
    const website = await websitesCollection.findOne({ id: parseInt(monitorID) }) as Website | null;

    if (!website || !website.alertContacts) {
      res.status(200).json({ message: 'No alert contacts defined.' });
      return;
    }

    const slackUsers = website.alertContacts.slack.users || [];
    const slackChannels = website.alertContacts.slack.channels || [];

    if (slackUsers.length === 0 && slackChannels.length === 0) {
      res.status(200).json({ message: 'No Slack users or channels to notify.' });
      return;
    }

    // Initialize Slack Web API client
    const slackToken = process.env.SLACK_BOT_TOKEN;
    if (!slackToken) {
      res.status(500).json({ error: 'Slack token not configured' });
      return;
    }
    const slackClient = new WebClient(slackToken);

    // Prepare the standard Slack message
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

    // If the website has a group, use a thread for updates
    if (website.group) {
      const groupId = website.group._id.toString();
      const normAlert = alertTypeFriendlyName.toLowerCase();

      // Determine cache keys based on event type
      let threadKey: string, aggKey: string;
      if (normAlert === 'down') {
        threadKey = `${groupId}_down_thread`;
        aggKey = `${groupId}_down_aggregated`;
        // Clear any cached "up" thread since a new down event should start a new thread
        setCachedData(`${groupId}_up_thread`, null, 0);
        setCachedData(`${groupId}_up_aggregated`, null, 0);
      } else if (normAlert === 'up') {
        threadKey = `${groupId}_up_thread`;
        aggKey = `${groupId}_up_aggregated`;
        // Clear any cached "down" thread if an up event occurs after a down event
        setCachedData(`${groupId}_down_thread`, null, 0);
        setCachedData(`${groupId}_down_aggregated`, null, 0);
      } else {
        // Fallback for any other event types
        threadKey = `${groupId}_generic_thread`;
        aggKey = `${groupId}_generic_aggregated`;
      }

      const groupMessage = `Website *${website.friendlyName}* from group *${website.group.name}* is now *${alertTypeFriendlyName}*`;
      let thread_ts = getCachedData<string>(threadKey) || undefined;
      let aggregatedList = getCachedData<AggregatedAlert[]>(aggKey) || [];

      // Add current alert to the aggregated list if not already present
      if (!aggregatedList.find(item => item.monitorID === monitorID)) {
        aggregatedList.push({
          monitorID,
          monitorFriendlyName,
          monitorURL,
          alertTypeFriendlyName,
        });
      }
      setCachedData(aggKey, aggregatedList, CACHE_TTL_SECONDS);

      // Build an aggregated message for all alerts in the group of this event type
      const aggregatedMessage = aggregatedList
          .map(
              item =>
                  `• *${item.monitorFriendlyName}* (<${item.monitorURL}|${item.monitorURL}>) is now *${item.alertTypeFriendlyName}*`
          )
          .join('\n');

      // For each Slack channel, update an existing thread or start a new one
      for (const channelId of slackChannels) {
        if (thread_ts) {
          // Update the main thread message with aggregated list
          await slackClient.chat.update({
            channel: channelId,
            ts: thread_ts,
            text: aggregatedMessage,
          });
          
          // Update message record with thread timestamp
          await updateMessageRecord(thread_ts, thread_ts);
        } else {
          // No existing thread: create a new main message and store its thread timestamp
          const result = await slackClient.chat.postMessage({
            channel: channelId,
            text: aggregatedMessage,
            unfurl_links: false,
            unfurl_media: false
          });
          thread_ts = result.ts || undefined;
          setCachedData(threadKey, thread_ts, CACHE_TTL_SECONDS);
          
          // Save message record for new thread
          if (result.ts) {
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

      // Send a separate notification to each Slack user
      for (const userId of slackUsers) {
        try {
          const result = await slackClient.chat.postMessage({
            channel: userId,
            text: groupMessage,
            unfurl_links: false,
            unfurl_media: false
          });
          
          // Save message record for user DM
          if (result.ts) {
            await saveMessageRecord({
              messageId: result.ts,
              channelId: userId,
              websiteId: parseInt(monitorID),
              groupId,
              alertType: alertTypeFriendlyName,
            });
          }
        } catch (error) {
          console.error(`Failed to send message to Slack user ${userId}:`, error);
        }
      }
    } else {
      // For websites without a group, send the standard message separately
      for (const channelId of slackChannels) {
        const result = await slackClient.chat.postMessage({
          channel: channelId,
          text: standardMessage,
          unfurl_links: false,
          unfurl_media: false
        });
        
        // Save message record for channel message
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
          const result = await slackClient.chat.postMessage({
            channel: userId,
            text: standardMessage,
            unfurl_links: false,
            unfurl_media: false
          });
          
          // Save message record for user DM
          if (result.ts) {
            await saveMessageRecord({
              messageId: result.ts,
              channelId: userId,
              websiteId: parseInt(monitorID),
              alertType: alertTypeFriendlyName,
            });
          }
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

// Helper function to format the Slack message
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

// Helper function to format duration from seconds
function formatDuration(seconds: string): string {
  const sec = parseInt(seconds, 10);
  return `${sec} sec`;
} 