import { WebClient } from '@slack/web-api';
import type { NextApiRequest, NextApiResponse } from 'next';
import { withErrorHandler } from '@/lib/api/response';

interface TestSlackMessageRequest {
    users?: string[];
    channels?: string[];
}

interface MessageResult {
    channelId?: string;
    userId?: string;
    success: boolean;
    ts?: string;
    error?: string;
}

async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { users = [], channels = [] } = req.body as TestSlackMessageRequest;

    // Validate that at least one recipient is provided
    if (users.length === 0 && channels.length === 0) {
        return res.status(400).json({ error: 'At least one user or channel must be selected' });
    }

    // Initialize Slack Web API client
    const slackToken = process.env.SLACK_BOT_TOKEN;
    if (!slackToken) {
        return res.status(500).json({ error: 'Slack token not configured' });
    }

    const slackClient = new WebClient(slackToken);

    // Prepare a test message
    const testMessage = {
        blocks: [
            {
                type: "header",
                text: {
                    type: "plain_text",
                    text: "🚨 Test Alert - Website Monitoring",
                    emoji: true
                }
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*Website:* Example Website\n*URL:* https://example.com\n*Status:* Test Alert\n*Details:* This is a test message from the admin panel\n*Time:* ${new Date().toLocaleString()}`
                }
            },
            {
                type: "context",
                elements: [
                    {
                        type: "mrkdwn",
                        text: "This is a test message from the admin panel."
                    }
                ]
            }
        ],
        text: "Test alert from admin panel" // Fallback for notifications
    };

    // Send messages to all selected channels
    const channelResults = await Promise.all(
        channels.map(async (channelId): Promise<MessageResult> => {
            try {
                const result = await slackClient.chat.postMessage({
                    channel: channelId,
                    ...testMessage,
                    unfurl_links: false,
                });
                return {
                    channelId,
                    success: true,
                    ts: result.ts
                };
            } catch (error) {
                console.error(`Error sending to channel ${channelId}:`, error);
                return {
                    channelId,
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        })
    );

    // Send messages to all selected users
    const userResults = await Promise.all(
        users.map(async (userId): Promise<MessageResult> => {
            try {
                // For users, we open a direct message channel first
                const conversationResponse = await slackClient.conversations.open({
                    users: userId,
                });

                const dmChannelId = conversationResponse.channel?.id;
                if (!dmChannelId) {
                    throw new Error('Failed to open DM channel');
                }

                const result = await slackClient.chat.postMessage({
                    channel: dmChannelId,
                    ...testMessage,
                    unfurl_links: false,
                });

                return {
                    userId,
                    success: true,
                    ts: result.ts
                };
            } catch (error) {
                console.error(`Error sending to user ${userId}:`, error);
                return {
                    userId,
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        })
    );

    return res.status(200).json({
        success: true,
        message: 'Test Slack message sent',
        results: {
            channels: channelResults,
            users: userResults
        }
    });
}

export default withErrorHandler(handler);
