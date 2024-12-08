import fetch from 'node-fetch';
import { getCachedData, setCachedData } from '../../lib/cache';

export default async function handler(req, res) {
    const token = process.env.SLACK_BOT_TOKEN;
    let allChannels = [];
    let cursor;

    // Retrieve hidden channels from environment variables
    const hiddenChannelsEnv = process.env.SLACK_HIDDEN_CHANNELS || '';
    
    // Split the string into an array, trim whitespace, and filter out empty strings
    const hiddenChannelNames = hiddenChannelsEnv
        .split(',')
        .map(name => name.trim())
        .filter(name => name.length > 0)
        // Convert to lowercase for case-insensitive comparison
        .map(name => name.toLowerCase());

    // Retrieve cache time from environment variables (in seconds)
    const cacheTimeEnv = process.env.SLACK_DATA_CACHE_TIME || '1800'; // Default to 1800 seconds (30 minutes)
    const cacheTime = parseInt(cacheTimeEnv, 10); // Convert to integer

    // Check if cacheTime is a valid number
    if (isNaN(cacheTime) || cacheTime <= 0) {
        console.warn(`Invalid SLACK_DATA_CACHE_TIME value: ${cacheTimeEnv}. Falling back to default of 1800 seconds.`);
    }

    const effectiveCacheTime = (!isNaN(cacheTime) && cacheTime > 0) ? cacheTime : 1800; // Default to 1800 seconds if invalid

    // Check for cached channels
    const cachedData = getCachedData('channels');
    if (cachedData) {
        const { channels: cachedChannels, timestamp } = cachedData;
        const currentTime = Date.now();
        const elapsedSeconds = (currentTime - timestamp) / 1000; // Convert to seconds

        if (elapsedSeconds < effectiveCacheTime) {
            // Cache is still valid
            // Filter out hidden channels from cached data
            const visibleChannels = cachedChannels.filter(channel => 
                !hiddenChannelNames.includes(channel.name.toLowerCase())
            );
            return res.status(200).json(visibleChannels);
        } else {
            // Cache has expired
            // Optionally, you can remove the expired cache
            // removeCachedData('channels');
        }
    }

    try {
        do {
            const url = new URL('https://slack.com/api/conversations.list');
            url.searchParams.append('types', 'public_channel,private_channel');
            url.searchParams.append('limit', '1000'); // Adjust limit if necessary
            if (cursor) {
                url.searchParams.append('cursor', cursor);
            }

            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (!data.ok) {
                // Log the error details
                console.error('Error fetching channels from Slack API:', data.error);
                console.error('Response data:', JSON.stringify(data, null, 2));
                // Return the error response
                return res.status(500).json({ error: data.error });
            }

            allChannels = allChannels.concat(data.channels);
            cursor = data.response_metadata?.next_cursor; // Get the next cursor for pagination
        } while (cursor);

        // Filter out archived channels and hidden channels by name
        const channels = allChannels
            .filter(channel => !channel.is_archived && !hiddenChannelNames.includes(channel.name.toLowerCase()))
            .map(channel => ({
                id: channel.id,
                name: channel.name,
                isClosed: channel.is_closed || false,
            }));

        // Cache the visible channels with the current timestamp
        setCachedData('channels', { channels, timestamp: Date.now() });

        res.status(200).json(channels);
    } catch (error) {
        console.error('Unexpected error in Slack Channels handler:', error);
        res.status(500).json({ error: 'Failed to fetch channels' });
    }
}
