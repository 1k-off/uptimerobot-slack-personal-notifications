import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { messageRepository } from '@/lib/db/repositories/message.repository';
import { getSlackClient } from '@/lib/services/slack-client';
import { ObjectId } from 'mongodb';

interface ApiResponse {
  message?: string;
  error?: string;
  deleted?: number;
  failed?: number;
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

  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: 'Message IDs array is required' });
    return;
  }

  try {
    const collection = await messageRepository['getCollection']();
    const slackClient = getSlackClient();
    
    let deletedCount = 0;
    let failedCount = 0;

    for (const id of ids) {
      try {
        // Get the message to retrieve Slack details
        const messageDoc = await collection.findOne({ _id: new ObjectId(id) });
        
        if (!messageDoc) {
          console.log(`Message ${id} not found in database`);
          failedCount++;
          continue;
        }

        // Delete from Slack first
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
        
        if (result.deletedCount > 0) {
          deletedCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        console.error(`Error deleting message ${id}:`, error);
        failedCount++;
      }
    }

    res.status(200).json({ 
      message: `Deleted ${deletedCount} message(s) successfully${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
      deleted: deletedCount,
      failed: failedCount
    });
  } catch (error) {
    console.error('Error in bulk delete:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
