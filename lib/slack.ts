import { getSlackClient } from '@/lib/services/slack-client';
import { getEnvConfig } from '@/lib/config';
import type { WebClient } from '@slack/web-api';

interface SlackNotificationParams {
  action: 'created' | 'deleted';
  url: string;
  friendly_name: string;
  userEmail?: string;
}

async function getSlackUserIdByEmail(web: WebClient, email: string): Promise<string | null> {
  try {
    const response = await web.users.lookupByEmail({ email });
    return response.user?.id || null;
  } catch (error) {
    console.error('Error finding Slack user by email:', error);
    return null;
  }
}

export async function sendSlackNotification(params: SlackNotificationParams): Promise<void> {
  const { action, url, friendly_name, userEmail } = params;
  const config = getEnvConfig();

  if (!config.slackChannelActionNotify.length) {
    console.warn('No channels specified in SLACK_CHANNEL_ACTION_NOTIFY');
    return;
  }

  const web = getSlackClient();
  
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
    const notifications = config.slackChannelActionNotify.map(async channel => {
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
