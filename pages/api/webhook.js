import { connectToDatabase } from '@/lib/mongodb';
import { WebClient } from '@slack/web-api';

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

    // Connect to the database
    const { db } = await connectToDatabase();
    const websitesCollection = db.collection('websites');

    // Retrieve the website (monitor) from the database using monitorID
    const website = await websitesCollection.findOne({ id: parseInt(monitorID) });

    if (!website || !website.alertContacts) {
      return res.status(200).json({ message: 'No alert contacts defined.' });
    }

    const slackUsers = website.alertContacts.slack.users || [];
    const slackChannels = website.alertContacts.slack.channels || [];

    if (slackUsers.length === 0 && slackChannels.length === 0) {
      return res.status(200).json({ message: 'No Slack users or channels to notify.' });
    }

    // Prepare the message to be sent
    const message = formatSlackMessage({
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

    // Initialize Slack Web API client
    const slackToken = process.env.SLACK_BOT_TOKEN;
    const slackClient = new WebClient(slackToken);

    // Send message to Slack users
    for (const userId of slackUsers) {
      try {
        await slackClient.chat.postMessage({
          channel: userId,
          text: message,
        });
      } catch (error) {
        console.error(`Failed to send message to Slack user ${userId}:`, error);
      }
    }

    // Send message to Slack channels
    for (const channelId of slackChannels) {
      try {
        await slackClient.chat.postMessage({
          channel: channelId,
          text: message,
        });
      } catch (error) {
        console.error(`Failed to send message to Slack channel ${channelId}:`, error);
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

  if (alertType == '2' && alertDuration) {
    const duration = formatDuration(alertDuration);
    message += `*Downtime Duration:* ${duration}\n`;
  }

  if (alertType == '3') {
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

// Helper function to format duration from seconds to human-readable format
function formatDuration(seconds) {
  seconds = parseInt(seconds, 10);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  seconds = seconds % 60;

  let duration = '';
  if (hours > 0) {
    duration += `${hours}h `;
  }
  if (minutes > 0) {
    duration += `${minutes}m `;
  }
  duration += `${seconds}s`;

  return duration.trim();
}
