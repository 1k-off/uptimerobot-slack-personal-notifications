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
export async function cleanupOldMessages(): Promise<{ deletedCount: number; slackDeleted: number; skipped: number }> {
  const shouldPrune = process.env.SLACK_PRUNE_OLD_MESSAGES === 'true';
  const keepSeconds = parseInt(process.env.SLACK_KEEP_MESSAGES_SECONDS || '120', 10);
  
  if (!shouldPrune) {
    console.log('Cleanup skipped: SLACK_PRUNE_OLD_MESSAGES not enabled');
    return { deletedCount: 0, slackDeleted: 0, skipped: 0 };
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
      console.log('No old messages to clean up');
      return { deletedCount: 0, slackDeleted: 0, skipped: 0 };
    }
    
    console.log(`Found ${oldMessages.length} old messages to clean up`);
    
    // Initialize Slack client
    const slackToken = process.env.SLACK_BOT_TOKEN;
    if (!slackToken) {
      console.error('SLACK_BOT_TOKEN not configured for cleanup');
      return { deletedCount: 0, slackDeleted: 0, skipped: 0 };
    }
    
    const slackClient = new WebClient(slackToken);
    
    // Get bot's own user ID to identify which messages this bot created
    let botUserId: string | undefined;
    try {
      const authTest = await slackClient.auth.test();
      botUserId = authTest.user_id as string;
      console.log(`Current bot user ID: ${botUserId}`);
    } catch (error) {
      console.error('Failed to get bot user ID:', error);
    }
    
    let slackDeleted = 0;
    let skipped = 0;

    // Delete messages from Slack and database
    for (const message of oldMessages) {
      try {
        // Attempt to delete from Slack
        await slackClient.chat.delete({
          channel: message.channelId,
          ts: message.messageId,
          as_user: true, // Delete as the bot user
        });
        
        console.log(`✓ Deleted message ${message.messageId} from ${message.channelId}`);
        slackDeleted++;
        
        // Rate limiting: wait between deletions
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error: unknown) {
        const errorCode = (error as { data?: { error?: string } }).data?.error;
        
        // Handle expected errors gracefully
        if (errorCode === 'message_not_found' || errorCode === 'channel_not_found') {
          // Message or channel already deleted - this is fine
          skipped++;
        } else if (errorCode === 'cant_delete_message' || errorCode === 'not_in_channel') {
          // Bot doesn't have permission or not in channel - likely from another bot
          console.log(`⚠ Skipping message ${message.messageId}: ${errorCode}`);
          skipped++;
        } else {
          // Other errors
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`✗ Failed to delete message ${message.messageId}: ${errorCode || errorMessage}`);
          skipped++;
        }
      }
    }
    
    // Remove ALL old messages from database (regardless of Slack deletion success)
    const deleteResult = await messagesCollection.deleteMany({
      createdAt: { $lt: cutoffTime }
    });
    
    console.log(`
✅ Cleanup Summary:
   - Total old messages: ${oldMessages.length}
   - Deleted from Slack: ${slackDeleted}
   - Skipped (errors/no access): ${skipped}
   - Removed from DB: ${deleteResult.deletedCount}
    `);
    
    return { 
      deletedCount: deleteResult.deletedCount,
      slackDeleted,
      skipped
    };
    
  } catch (error) {
    console.error('Error during message cleanup:', error);
    throw error;
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