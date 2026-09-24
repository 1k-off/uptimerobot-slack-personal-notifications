import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { messageRepository } from '@/lib/db/repositories/message.repository';
import { getSlackClient } from '@/lib/services/slack-client';
import { ObjectId } from 'mongodb';

interface ApiResponse {
  message?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  if (req.method !== 'DELETE') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Verify admin access using session
  const session = await getServerSession(req, res, authOptions);
  
  if (!session || !session.user || !(session.user as { isAdmin?: boolean }).isAdmin) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    res.status(400).json({ error: 'Message ID is required' });
    return;
  }

  try {
    // First, get the message to retrieve Slack details
    const collection = await messageRepository['getCollection']();
    const messageDoc = await collection.findOne({ _id: new ObjectId(id) });
    
    if (!messageDoc) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    // Delete from Slack first
    const slackClient = getSlackClient();
    try {
      await slackClient.chat.delete({
        channel: messageDoc.channelId,
        ts: messageDoc.messageId,
      });
      console.log(`Deleted Slack message ${messageDoc.messageId} from channel ${messageDoc.channelId}`);
    } catch (slackError: any) {
      // If message not found in Slack, that's okay - continue with DB deletion
      if (slackError?.data?.error === 'message_not_found' || slackError?.data?.error === 'channel_not_found') {
        console.log(`Slack message ${messageDoc.messageId} not found (${slackError.data.error}), continuing with database deletion`);
      } else {
        console.error('Error deleting from Slack:', slackError);
        // Still continue with DB deletion even if Slack deletion fails
      }
    }

    // Delete from database
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      res.status(404).json({ error: 'Message not found in database' });
      return;
    }

    res.status(200).json({ message: 'Message deleted successfully from Slack and database' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
