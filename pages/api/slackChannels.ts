import { NextApiRequest, NextApiResponse } from 'next';
import { withErrorHandler, sendSuccess } from '@/lib/api';
import { getSlackChannelsList } from '@/lib/services/slack-channels';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const channels = await getSlackChannelsList();
  sendSuccess(res, channels);
}

export default withErrorHandler(handler);
