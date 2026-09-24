import { WebClient } from '@slack/web-api';
import { getEnvConfig } from '@/lib/config';
import { messageRepository } from "./db";
import { MessageRecord } from "@/types";

/** Max Slack deletes per invocation — keeps work under Vercel Hobby's 10s limit. */
const DEFAULT_BATCH_SIZE = 25;

/** Stop before the platform kills the function (Hobby = 10s). */
const DEFAULT_TIME_BUDGET_MS = 8_000;

export interface CleanupResult {
  deletedCount: number;
  slackDeleted: number;
  skipped: number;
  processed: number;
  remaining: number;
  hasMore: boolean;
  stoppedReason?: 'complete' | 'batch_limit' | 'time_budget' | 'rate_limited';
}

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

function getCleanupSlackClient(token: string): WebClient {
  // No automatic retries: Slack's default 10s rate-limit wait exceeds Vercel Hobby timeout.
  return new WebClient(token, {
    rejectRateLimitedCalls: true,
    retryConfig: { retries: 0 },
  });
}

function isRateLimited(error: unknown): boolean {
  const err = error as { code?: string; data?: { error?: string } };
  return err.code === 'slack_webapi_rate_limited_error' || err.data?.error === 'rate_limited';
}

/**
 * Clean up a limited batch of old messages.
 * Safe for short-lived serverless invocations — call repeatedly (cron/admin) to drain backlog.
 */
export async function cleanupOldMessages(options?: {
  batchSize?: number;
  timeBudgetMs?: number;
}): Promise<CleanupResult> {
  const config = getEnvConfig();
  const batchSize = options?.batchSize ?? DEFAULT_BATCH_SIZE;
  const timeBudgetMs = options?.timeBudgetMs ?? DEFAULT_TIME_BUDGET_MS;

  if (!config.slackPruneOldMessages) {
    console.log('Cleanup skipped: SLACK_PRUNE_OLD_MESSAGES not enabled');
    return {
      deletedCount: 0,
      slackDeleted: 0,
      skipped: 0,
      processed: 0,
      remaining: 0,
      hasMore: false,
      stoppedReason: 'complete',
    };
  }

  const startedAt = Date.now();
  const cutoffTime = new Date(Date.now() - config.slackKeepMessagesSeconds * 1000);

  try {
    const remainingBefore = await messageRepository.countOldMessages(cutoffTime);
    if (remainingBefore === 0) {
      console.log('No old messages to clean up');
      return {
        deletedCount: 0,
        slackDeleted: 0,
        skipped: 0,
        processed: 0,
        remaining: 0,
        hasMore: false,
        stoppedReason: 'complete',
      };
    }

    const oldMessages = await messageRepository.findOldMessages(cutoffTime, batchSize);
    console.log(
      `Cleanup batch: processing ${oldMessages.length} of ${remainingBefore} old messages (budget ${timeBudgetMs}ms)`,
    );

    const slackClient = getCleanupSlackClient(config.slackBotToken);

    let slackDeleted = 0;
    let skipped = 0;
    let stoppedReason: CleanupResult['stoppedReason'] = 'complete';
    const processedIds: string[] = [];

    for (const message of oldMessages) {
      if (Date.now() - startedAt >= timeBudgetMs) {
        stoppedReason = 'time_budget';
        console.log('Cleanup stopping early: time budget reached');
        break;
      }

      try {
        await slackClient.chat.delete({
          channel: message.channelId,
          ts: message.messageId,
          as_user: true,
        });

        slackDeleted++;
        processedIds.push(message.messageId);
      } catch (error: unknown) {
        if (isRateLimited(error)) {
          stoppedReason = 'rate_limited';
          console.log('Cleanup stopping early: Slack rate limited');
          break;
        }

        const errorCode = (error as { data?: { error?: string } }).data?.error;

        // Already gone / unreachable — drop from DB so we don't retry forever
        if (
          errorCode === 'message_not_found' ||
          errorCode === 'channel_not_found' ||
          errorCode === 'cant_delete_message' ||
          errorCode === 'not_in_channel'
        ) {
          if (errorCode === 'cant_delete_message' || errorCode === 'not_in_channel') {
            console.log(`⚠ Skipping message ${message.messageId}: ${errorCode}`);
          }
          skipped++;
          processedIds.push(message.messageId);
        } else {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(
            `✗ Failed to delete message ${message.messageId}: ${errorCode || errorMessage}`,
          );
          skipped++;
          processedIds.push(message.messageId);
        }
      }
    }

    if (
      stoppedReason === 'complete' &&
      oldMessages.length >= batchSize &&
      remainingBefore > processedIds.length
    ) {
      stoppedReason = 'batch_limit';
    }

    const deletedCount = await messageRepository.deleteByMessageIds(processedIds);
    const remaining = Math.max(0, remainingBefore - deletedCount);
    const hasMore = remaining > 0;

    console.log(`
✅ Cleanup batch summary:
   - Remaining before: ${remainingBefore}
   - Processed this run: ${processedIds.length}
   - Deleted from Slack: ${slackDeleted}
   - Skipped: ${skipped}
   - Removed from DB: ${deletedCount}
   - Remaining after: ${remaining}
   - Stopped: ${stoppedReason}
    `);

    return {
      deletedCount,
      slackDeleted,
      skipped,
      processed: processedIds.length,
      remaining,
      hasMore,
      stoppedReason,
    };
  } catch (error) {
    console.error('Error during message cleanup:', error);
    throw error;
  }
}

/**
 * Schedule cleanup to run periodically (long-lived Node processes only).
 * On Vercel, prefer Cron → /api/cleanup-messages; setInterval does not survive serverless.
 */
export function scheduleCleanup(): void {
  const config = getEnvConfig();

  if (!config.slackPruneOldMessages) {
    return;
  }

  if (process.env.VERCEL) {
    console.log(
      'Skipping in-process cleanup scheduler on Vercel; use Cron → /api/cleanup-messages',
    );
    return;
  }

  setInterval(() => {
    void cleanupOldMessages();
  }, 5 * 60 * 1000);

  setTimeout(() => {
    void cleanupOldMessages();
  }, 10_000);
}
