import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]';
import { cleanupOldMessages, CleanupResult } from '@/lib/slack-cleanup';

interface ApiResponse {
  message?: string;
  error?: string;
  deletedCount?: number;
  slackDeleted?: number;
  skipped?: number;
  processed?: number;
  remaining?: number;
  hasMore?: boolean;
  retryAfterSeconds?: number;
  stoppedReason?: CleanupResult['stoppedReason'];
}

function isAuthorizedCron(req: NextApiRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return false;
  }
  const authHeader = req.headers.authorization;
  return authHeader === `Bearer ${cronSecret}`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  // Vercel Cron uses GET; admin UI uses POST
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const isCron = isAuthorizedCron(req);

  if (!isCron) {
    // Cron without CRON_SECRET never authenticates — surface that clearly for GET (cron)
    if (req.method === 'GET' && process.env.VERCEL && !process.env.CRON_SECRET) {
      console.error(
        'Cleanup cron rejected: set CRON_SECRET in Vercel env so cron can authorize as Bearer token',
      );
      res.status(401).json({
        error: 'Unauthorized — set CRON_SECRET in Vercel project env for cron access',
      });
      return;
    }

    const session = await getServerSession(req, res, authOptions);
    if (!session?.user || !(session.user as { isAdmin?: boolean }).isAdmin) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
  }

  try {
    const result = await cleanupOldMessages();
    const statusLabel = result.hasMore
      ? `partial (${result.stoppedReason}), ${result.remaining} remaining`
      : 'completed';

    res.status(200).json({
      message: `Cleanup ${statusLabel}: ${result.slackDeleted} deleted from Slack, ${result.skipped} skipped, ${result.deletedCount} removed from DB`,
      deletedCount: result.deletedCount,
      slackDeleted: result.slackDeleted,
      skipped: result.skipped,
      processed: result.processed,
      remaining: result.remaining,
      hasMore: result.hasMore,
      retryAfterSeconds: result.retryAfterSeconds,
      stoppedReason: result.stoppedReason,
    });
  } catch (error) {
    console.error('Error during manual cleanup:', error);
    res.status(500).json({ error: 'Internal server error during cleanup' });
  }
}
