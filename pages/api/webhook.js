import { connectToDatabase } from '@/lib/mongodb';
import { WebClient } from '@slack/web-api';
import { getCachedData, setCachedData } from '@/lib/cache';

const CACHE_TTL_SECONDS = 3600;

export default async function handler(req, res) {
  // Verify secret token
  const secretToken = process.env.WEBHOOK_SECRET_TOKEN;
  const providedToken = req.query.token;

  if (!providedToken || providedToken !== secretToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
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
    } = req.body;

    // Connect to the database and retrieve the website
    const { db } = await connectToDatabase();
    const websitesCollection = db.collection('websites');
    const website = await websitesCollection.findOne({ id: parseInt(monitorID) });

    if (!website || !website.alertContacts) {
      return res.status(200).json({ message: 'No alert contacts defined.' });
    }

    const slackUsers = website.alertContacts.slack.users || [];
    const slackChannels = website.alertContacts.slack.channels || [];

    if (slackUsers.length === 0 && slackChannels.length === 0) {
      return res.status(200).json({ message: 'No Slack users or channels to notify.' });
    }

    // Initialize Slack Web API client
    const slackToken = process.env.SLACK_BOT_TOKEN;
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
      let threadKey, aggKey;
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
      let thread_ts = getCachedData(threadKey);
      let aggregatedList = getCachedData(aggKey) || [];

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
          // Update the main thread message
          await slackClient.chat.update({
            channel: channelId,
            ts: thread_ts,
            text: aggregatedMessage,
          });
          // Post the new alert as a reply in the existing thread
          await slackClient.chat.postMessage({
            channel: channelId,
            thread_ts,
            text: groupMessage,
          });
        } else {
          // No existing thread: create a new main message and store its thread timestamp
          const result = await slackClient.chat.postMessage({
            channel: channelId,
            text: aggregatedMessage,
          });
          thread_ts = result.ts;
          setCachedData(threadKey, thread_ts, CACHE_TTL_SECONDS);
          // Post the current alert as a reply in the new thread
          await slackClient.chat.postMessage({
            channel: channelId,
            thread_ts,
            text: groupMessage,
          });
        }
      }

      // Send a separate notification to each Slack user
      for (const userId of slackUsers) {
        try {
          await slackClient.chat.postMessage({
            channel: userId,
            text: groupMessage,
          });
        } catch (error) {
          console.error(`Failed to send message to Slack user ${userId}:`, error);
        }
      }
    } else {
      // For websites without a group, send the standard message separately
      for (const channelId of slackChannels) {
        await slackClient.chat.postMessage({
          channel: channelId,
          text: standardMessage,
        });
      }
      for (const userId of slackUsers) {
        try {
          await slackClient.chat.postMessage({
            channel: userId,
            text: standardMessage,
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

// Helper function to format the Slack message
function formatSlackMessage(data) {
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
function formatDuration(seconds) {
  const sec = parseInt(seconds, 10);
  return `${sec} sec`;
}