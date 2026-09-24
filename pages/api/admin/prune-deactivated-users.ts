import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import {
  pruneDeactivatedUsersFromSubscriptions,
  PruneDeactivatedUsersResult,
} from '@/lib/services/prune-deactivated-users';

type ApiResponse = PruneDeactivatedUsersResult | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user || !(session.user as { isAdmin?: boolean }).isAdmin) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const result = await pruneDeactivatedUsersFromSubscriptions();
    res.status(200).json(result);
  } catch (error) {
    console.error('Failed to prune deactivated users:', error);
    res.status(500).json({ error: 'Failed to prune deactivated users' });
  }
}
