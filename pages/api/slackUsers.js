import fetch from 'node-fetch';
import { getCachedData, setCachedData } from '../../lib/cache';

export default async function handler(req, res) {
    const token = process.env.SLACK_BOT_TOKEN;

    // Check for cached users
    const cachedUsers = getCachedData('users');
    if (cachedUsers) {
        return res.status(200).json(cachedUsers);
    }

    try {
        const response = await fetch('https://slack.com/api/users.list', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();

        if (!data.ok) {
            return res.status(500).json({ error: data.error });
        }

        const users = data.members.map(user => ({
            id: user.id,
            name: user.profile.display_name,
        }));

        // Cache the users
        setCachedData('users', users);

        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
}
