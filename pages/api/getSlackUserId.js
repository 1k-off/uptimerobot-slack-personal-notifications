import { WebClient } from '@slack/web-api';

const slackToken = process.env.SLACK_BOT_TOKEN; // Ensure this is set in your .env file

const webClient = new WebClient(slackToken);

export default async (req, res) => {
  if (req.method === 'POST') {
    const { email } = req.body;
    try {
      const response = await webClient.users.lookupByEmail({ email });
      const userId = response.user.id;
      res.status(200).json({ userId });
    } catch (error) {
      console.error('Error fetching Slack user ID:', error);
      res.status(500).json({ error: 'Failed to fetch Slack user ID.' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};
