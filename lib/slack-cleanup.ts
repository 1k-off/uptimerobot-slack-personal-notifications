import { getSlackClient } from '@/lib/services/slack-client';
import { getEnvConfig } from '@/lib/config';
import { messageRepository } from "./db";
import { MessageRecord } from "@/types";

/**
 * Save a message record to the database
 */
export async function saveMessageRecord(
  messageRecord: MessageRecord,
): Promise<void> {
  try {
    await messageRepository.create(messageRecord);
  } catch (error) {
    console.error("Error saving message record:", error);
  }
}

/**
 * Update an existing message record (for thread updates)
 */
export async function updateMessageRecord(
  messageId: string,
  threadTs?: string,
): Promise<void> {
  try {
    await messageRepository.updateThreadTs(messageId, threadTs || '');
  } catch (error) {
    console.error("Error updating message record:", error);
  }
}

/**
 * Clean up old messages based on environment settings
 */
export async function cleanupOldMessages(): Promise<{ deletedCount: number; slackDeleted: number; skipped: number }> {
  const config = getEnvConfig();

  if (!config.slackPruneOldMessages) {
    console.log('Cleanup skipped: SLACK_PRUNE_OLD_MESSAGES not enabled');
    return { deletedCount: 0, slackDeleted: 0, skipped: 0 };
  }

  try {
    // Calculate cutoff time
    const cutoffTime = new Date(Date.now() - config.slackKeepMessagesSeconds * 1000);

    // Find old messages using repository
    const oldMessages = await messageRepository.findOldMessages(cutoffTime);

    if (oldMessages.length === 0) {
      console.log('No old messages to clean up');
      return { deletedCount: 0, slackDeleted: 0, skipped: 0 };
    }

    console.log(`Found ${oldMessages.length} old messages to clean up`);

    // Initialize Slack client
    const slackClient = getSlackClient();

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

    // Delete messages from Slack
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

        // Rate limiting: wait between deletions to avoid hitting Slack API limits
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error: unknown) {
        const errorCode = (error as { data?: { error?: string } }).data?.error;

        // Handle expected errors gracefully
        if (errorCode === 'message_not_found' || errorCode === 'channel_not_found') {
          // Message or channel already deleted - this is fine, count as skipped
          skipped++;
        } else if (errorCode === 'cant_delete_message' || errorCode === 'not_in_channel') {
          // Bot doesn't have permission or not in channel - likely from another bot
          console.log(`⚠ Skipping message ${message.messageId}: ${errorCode}`);
          skipped++;
        } else {
          // Other errors - log but continue cleanup
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`✗ Failed to delete message ${message.messageId}: ${errorCode || errorMessage}`);
          skipped++;
        }
      }
    }

    // Remove ALL old messages from database (regardless of Slack deletion success)
    // This is more efficient than individual deletes and ensures DB stays clean
    const deletedCount = await messageRepository.deleteOldMessages(cutoffTime);

    console.log(`
✅ Cleanup Summary:
   - Total old messages: ${oldMessages.length}
   - Deleted from Slack: ${slackDeleted}
   - Skipped (errors/no access): ${skipped}
   - Removed from DB: ${deletedCount}
    `);

    return {
      deletedCount,
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
  const config = getEnvConfig();

  if (!config.slackPruneOldMessages) {
    return;
  }

  // Run cleanup every 5 minutes
  setInterval(cleanupOldMessages, 5 * 60 * 1000);

  // Also run cleanup on startup
  setTimeout(cleanupOldMessages, 10000); // 10 seconds after startup
}
