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
export async function cleanupOldMessages(): Promise<void> {
  const config = getEnvConfig();

  if (!config.slackPruneOldMessages) {
    return;
  }

  try {
    // Calculate cutoff time
    const cutoffTime = new Date(Date.now() - config.slackKeepMessagesSeconds * 1000);

    // Find old messages using repository
    const oldMessages = await messageRepository.findOldMessages(cutoffTime);

    if (oldMessages.length === 0) {
      return;
    }

    // Initialize Slack client
    const slackClient = getSlackClient();

    // Delete messages from Slack and track successful deletions
    const messageIdsToRemoveFromDb: string[] = [];

    for (const message of oldMessages) {
      try {
        // Delete from Slack
        await slackClient.chat.delete({
          channel: message.channelId,
          ts: message.messageId,
        });

        console.log(
          `Deleted old message ${message.messageId} from channel ${message.channelId}`,
        );
        messageIdsToRemoveFromDb.push(message.messageId);
      } catch (error: any) {
        // If channel not found or message not found, we should still remove from DB
        if (error?.data?.error === 'channel_not_found' || error?.data?.error === 'message_not_found') {
          console.log(`Message ${message.messageId} not accessible (${error.data.error}), removing from database`);
          messageIdsToRemoveFromDb.push(message.messageId);
        } else {
          console.error(`Failed to delete message ${message.messageId}:`, error);
        }
      }
    }

    // Remove successfully deleted messages from database
    if (messageIdsToRemoveFromDb.length > 0) {
      // Delete each message individually
      let deletedCount = 0;
      for (const messageId of messageIdsToRemoveFromDb) {
        const deleted = await messageRepository.delete(messageId);
        if (deleted) deletedCount++;
      }

      console.log(
        `Cleaned up ${deletedCount} old message records (${oldMessages.length} total found)`,
      );
    } else {
      console.log(
        `No messages were successfully deleted or removed from database`,
      );
    }
  } catch (error) {
    console.error("Error during message cleanup:", error);
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
