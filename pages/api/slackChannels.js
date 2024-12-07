import fetch from 'node-fetch';
import { getCachedData, setCachedData } from '../../lib/cache';

export default async function handler(req, res) {
    const token = process.env.SLACK_BOT_TOKEN;
    let allChannels = [];
    let cursor;

    // Check for cached channels
    const cachedChannels = getCachedData('channels');
    if (cachedChannels) {
        return res.status(200).json(cachedChannels);
    }

    try {
        do {
            const response = await fetch(`https://slack.com/api/conversations.list?types=public_channel,private_channel&cursor=${cursor || ''}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (!data.ok) {
                console.error('Error fetching channels:', data.error);
                return res.status(500).json({ error: data.error });
            }

            allChannels = allChannels.concat(data.channels);
            cursor = data.response_metadata?.next_cursor; // Get the next cursor for pagination
        } while (cursor);

        // Filter out archived channels
        const channels = allChannels
            .filter(channel => !channel.is_archived)
            .map(channel => ({
                id: channel.id,
                name: channel.name,
                isClosed: channel.is_closed || false,
            }));

        // Cache the channels
        setCachedData('channels', channels);

        res.status(200).json(channels);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch channels' });
    }
}
