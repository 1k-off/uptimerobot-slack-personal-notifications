import { WebClient } from '@slack/web-api';
import { connectToDatabase } from './mongodb';
import { MessageRecord } from '@/types';

/**
 * Save a message record to the database
 */
export async function saveMessageRecord(messageRecord: MessageRecord): Promise<void> {
  try {
    const { db } = await connectToDatabase();
    const messagesCollection = db.collection('messages');
    
    await messagesCollection.insertOne({
      messageId: messageRecord.messageId,
      channelId: messageRecord.channelId,
      threadTs: messageRecord.threadTs,
      websiteId: messageRecord.websiteId,
      groupId: messageRecord.groupId,
      alertType: messageRecord.alertType,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('Error saving message record:', error);
  }
}

/**
 * Update an existing message record (for thread updates)
 */
export async function updateMessageRecord(messageId: string, threadTs?: string): Promise<void> {
  try {
    const { db } = await connectToDatabase();
    const messagesCollection = db.collection('messages');
    
    await messagesCollection.updateOne(
      { messageId },
      { 
        $set: { 
          threadTs,
          updatedAt: new Date()
        }
      }
    );
  } catch (error) {
    console.error('Error updating message record:', error);
  }
}

/**
 * Clean up old messages based on environment settings
 */
export async function cleanupOldMessages(): Promise<void> {
  const shouldPrune = process.env.SLACK_PRUNE_OLD_MESSAGES === 'true';
  const keepSeconds = parseInt(process.env.SLACK_KEEP_MESSAGES_SECONDS || '120', 10);
  
  if (!shouldPrune) {
    return;
  }

  try {
    const { db } = await connectToDatabase();
    const messagesCollection = db.collection('messages');
    
    // Calculate cutoff time
    const cutoffTime = new Date(Date.now() - (keepSeconds * 1000));
    
    // Find old messages
    const oldMessages = await messagesCollection.find({
      createdAt: { $lt: cutoffTime }
    }).toArray();
    
    if (oldMessages.length === 0) {
      return;
    }
    
    // Initialize Slack client
    const slackToken = process.env.SLACK_BOT_TOKEN;
    if (!slackToken) {
      console.error('SLACK_BOT_TOKEN not configured for cleanup');
      return;
    }
    
    const slackClient = new WebClient(slackToken);
    
    // Delete messages from Slack and database
    for (const message of oldMessages) {
      try {
        // Delete from Slack
        await slackClient.chat.delete({
          channel: message.channelId,
          ts: message.messageId,
        });
        
        console.log(`Deleted old message ${message.messageId} from channel ${message.channelId}`);
      } catch (error) {
        console.error(`Failed to delete message ${message.messageId}:`, error);
      }
    }
    
    // Remove from database
    const deleteResult = await messagesCollection.deleteMany({
      createdAt: { $lt: cutoffTime }
    });
    
    console.log(`Cleaned up ${deleteResult.deletedCount} old message records`);
    
  } catch (error) {
    console.error('Error during message cleanup:', error);
  }
}

/**
 * Schedule cleanup to run periodically
 */
export function scheduleCleanup(): void {
  const shouldPrune = process.env.SLACK_PRUNE_OLD_MESSAGES === 'true';
  
  if (!shouldPrune) {
    return;
  }
  
  // Run cleanup every 5 minutes
  setInterval(cleanupOldMessages, 5 * 60 * 1000);
  
  // Also run cleanup on startup
  setTimeout(cleanupOldMessages, 10000); // 10 seconds after startup
} 