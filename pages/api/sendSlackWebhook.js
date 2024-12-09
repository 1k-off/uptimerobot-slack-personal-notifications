export default async (req, res) => {
  if (req.method === 'POST') {
    const { action, url, reporter } = req.body;

    try {
      const webhookUrl = process.env.SLACK_WORKFLOW_HOOK;

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, url, reporter }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to send webhook: ${errorText}`);
      }

      res.status(200).json({ message: 'Webhook sent successfully.' });
    } catch (error) {
      console.error('Error sending webhook:', error);
      res.status(500).json({ error: error.message || 'Failed to send webhook.' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};
