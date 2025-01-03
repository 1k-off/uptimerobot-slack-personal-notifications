import { WebClient } from '@slack/web-api';

async function getSlackUserIdByEmail(web, email) {
  try {
    const response = await web.users.lookupByEmail({ email });
    return response.user.id;
  } catch (error) {
    console.error('Error finding Slack user by email:', error);
    return null;
  }
}

export async function sendSlackNotification({ action, url, friendly_name, userEmail }) {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    console.warn('No SLACK_BOT_TOKEN specified');
    return;
  }

  const channels = process.env.SLACK_CHANNEL_ACTION_NOTIFY?.split(',').map(channel => channel.trim()) || [];
  if (!channels.length) {
    console.warn('No channels specified in SLACK_CHANNEL_ACTION_NOTIFY');
    return;
  }

  const web = new WebClient(token);
  
  // Get Slack user ID if email is provided
  let actorMention = '';
  if (userEmail) {
    const userId = await getSlackUserIdByEmail(web, userEmail);
    if (userId) {
      actorMention = `<@${userId}>`;
    }
  }

  const message = {
    text: action === 'created' 
      ? `🆕 New website monitor created:\n• Name: ${friendly_name}\n• URL: ${url}${actorMention ? `\n• Actor: ${actorMention}` : ''}`
      : `🗑️ Website monitor deleted:\n• Name: ${friendly_name}\n• URL: ${url}${actorMention ? `\n• Actor: ${actorMention}` : ''}`,
  };

  try {
    const notifications = channels.map(async channel => {
      try {
        await web.chat.postMessage({
          channel: `#${channel.replace(/^#/, '')}`,
          text: message.text,
        });
      } catch (channelError) {
        console.error(`Error sending message to channel ${channel}:`, channelError);
      }
    });

    await Promise.all(notifications);
  } catch (error) {
    console.error('Error sending Slack notifications:', error);
  }
} 