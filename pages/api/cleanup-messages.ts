import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]';
import { cleanupOldMessages } from '@/lib/slack-cleanup';

interface ApiResponse {
  message?: string;
  error?: string;
  deletedCount?: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Verify admin access using session
  const session = await getServerSession(req, res, authOptions);
  
  if (!session || !session.user || !(session.user as { isAdmin?: boolean }).isAdmin) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const result = await cleanupOldMessages();
    res.status(200).json({ 
      message: `Cleanup completed: ${result.slackDeleted} deleted from Slack, ${result.skipped} skipped, ${result.deletedCount} removed from DB`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error during manual cleanup:', error);
    res.status(500).json({ error: 'Internal server error during cleanup' });
  }
} 