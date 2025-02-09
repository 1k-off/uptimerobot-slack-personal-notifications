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
      // Retrieve the thread timestamp from cache
      let thread_ts = getCachedData(groupId);

      const groupMessage = `Website *${website.friendly_name}* from group *${website.group.name}* is now *${alertTypeFriendlyName}*`;
      const aggregatedMessage = `*${monitorFriendlyName}* (${monitorURL}) is now *${alertTypeFriendlyName}*`;

      // For each Slack channel, decide whether to update an existing thread or create a new one
      for (const channelId of slackChannels) {
        if (thread_ts) {
          // Update the main thread message
          await slackClient.chat.update({
            channel: channelId,
            ts: thread_ts,
            text: aggregatedMessage,
          });
          // Then, post the new alert in the existing thread
          await slackClient.chat.postMessage({
            channel: channelId,
            thread_ts,
            text: groupMessage,
          });
        } else {
          // No existing thread: post a new main message and store its thread_ts in cache
          const result = await slackClient.chat.postMessage({
            channel: channelId,
            text: aggregatedMessage,
          });
          thread_ts = result.ts;
          setCachedData(groupId, thread_ts, CACHE_TTL_SECONDS);
          await slackClient.chat.postMessage({
            channel: channelId,
            thread_ts,
            text: groupMessage,
          });
        }
      }

      // For direct Slack user messages, send the group message without threading
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
      // No group defined – send notifications as before
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

      for (const channelId of slackChannels) {
        try {
          await slackClient.chat.postMessage({
            channel: channelId,
            text: standardMessage,
          });
        } catch (error) {
          console.error(`Failed to send message to Slack channel ${channelId}:`, error);
        }
      }
    }

    res.status(200).json({ message: 'Notifications sent successfully.' });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
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