import { NextApiRequest, NextApiResponse } from 'next';
import { withErrorHandler, sendSuccess } from '@/lib/api';
import { getSlackUsersSnapshot } from '@/lib/services/slack-users';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const snapshot = await getSlackUsersSnapshot();
  sendSuccess(res, snapshot.activeUsers);
}

export default withErrorHandler(handler);
