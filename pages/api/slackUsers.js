import fetch from 'node-fetch';
import { getCachedData, setCachedData } from '@/lib/cache';

export default async function handler(req, res) {
    const token = process.env.SLACK_BOT_TOKEN;
    let allUsers = [];
    let cursor;

    // Retrieve cache time from environment variables (in seconds)
    const cacheTimeStr = process.env.SLACK_DATA_CACHE_TIME || '1800'; // Default to 1800 seconds (30 minutes)
    const cacheTimeNum = parseInt(cacheTimeStr, 10); // Convert to integer

    // Check if cacheTime is a valid number
    if (isNaN(cacheTimeNum) || cacheTimeNum <= 0) {
        console.warn(`Invalid SLACK_DATA_CACHE_TIME value: ${cacheTimeStr}. Falling back to default of 1800 seconds.`);
    }
    const cacheTime = (!isNaN(cacheTimeNum) && cacheTimeNum > 0) ? cacheTimeNum : 1800; // Default to 1800 seconds if invalid

    // Check for cached users
    const cachedData = getCachedData('users');
    if (cachedData) {
        const { users: cachedUsers, timestamp } = cachedData;
        const currentTime = Date.now();
        const elapsedSeconds = (currentTime - timestamp) / 1000; // Convert to seconds

        if (elapsedSeconds < cacheTime) {
            // Cache is still valid
            return res.status(200).json(cachedUsers);
        } else {
            // Cache has expired
            // Optionally, you can remove the expired cache
            // removeCachedData('users');
        }
    }

    try {
        do {
            const url = new URL('https://slack.com/api/users.list');
            // Specify the number of users per request
            url.searchParams.append('limit', '200');
            if (cursor) {
                url.searchParams.append('cursor', cursor);
            }

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (!data.ok) {
                console.error('Error fetching users:', data.error);
                return res.status(500).json({ error: data.error });
            }

            // Filter out deactivated users and bots
            const activeUsers = data.members.filter(user => !user.deleted && !user.is_bot);
            allUsers = allUsers.concat(activeUsers);

            cursor = data.response_metadata?.next_cursor; // Get the next cursor for pagination
        } while (cursor);

        const users = allUsers.map(user => ({
            id: user.id,
            name: user.profile.display_name || user.real_name || user.name,
        }));

        // Cache the users with the current timestamp
        setCachedData('users', { users, timestamp: Date.now() }, cacheTime);

        res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
}
