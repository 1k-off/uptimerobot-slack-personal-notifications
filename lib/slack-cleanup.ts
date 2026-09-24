import { WebClient } from '@slack/web-api';
import { getEnvConfig } from '@/lib/config';
import { messageRepository } from "./db";
import { MessageRecord } from "@/types";

/** chat.delete is ~Tier 3 (~50+/min). Pace to avoid burning the budget. */
const DELETE_PACE_MS = 1_200;

const SERVERLESS_BATCH_SIZE = 20;
const SERVERLESS_TIME_BUDGET_MS = 8_000;

const LOCAL_BATCH_SIZE = 80;
const LOCAL_TIME_BUDGET_MS = 55_000;

/** When time budget is off, fetch/process in chunks but keep going until drained. */
const UNBOUNDED_CHUNK_SIZE = 100;

export interface CleanupResult {
  deletedCount: number;
  slackDeleted: number;
  skipped: number;
  processed: number;
  remaining: number;
  hasMore: boolean;
  retryAfterSeconds?: number;
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getCleanupSlackClient(token: string): WebClient {
  // No automatic retries — we handle rate limits ourselves within the time budget.
  return new WebClient(token, {
    rejectRateLimitedCalls: true,
    retryConfig: { retries: 0 },
  });
}

function isRateLimited(error: unknown): boolean {
  const err = error as { code?: string; data?: { error?: string } };
  return err.code === 'slack_webapi_rate_limited_error' || err.data?.error === 'rate_limited';
}

function getRetryAfterSeconds(error: unknown): number {
  const err = error as { retryAfter?: number; headers?: { 'retry-after'?: string } };
  if (typeof err.retryAfter === 'number' && err.retryAfter > 0) {
    return Math.ceil(err.retryAfter);
  }
  const header = err.headers?.['retry-after'];
  if (header) {
    const parsed = parseInt(header, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 10;
}

function resolveRunLimits(config: { slackCleanupTimeBudget: boolean }, overrides?: {
  batchSize?: number;
  timeBudgetMs?: number;
}): { batchSize: number; timeBudgetMs: number | null; timeBudgetEnabled: boolean } {
  const timeBudgetEnabled = config.slackCleanupTimeBudget;

  if (!timeBudgetEnabled) {
    return {
      batchSize: overrides?.batchSize ?? UNBOUNDED_CHUNK_SIZE,
      timeBudgetMs: null,
      timeBudgetEnabled: false,
    };
  }

  const defaults = process.env.VERCEL
    ? { batchSize: SERVERLESS_BATCH_SIZE, timeBudgetMs: SERVERLESS_TIME_BUDGET_MS }
    : { batchSize: LOCAL_BATCH_SIZE, timeBudgetMs: LOCAL_TIME_BUDGET_MS };

  return {
    batchSize: overrides?.batchSize ?? defaults.batchSize,
    timeBudgetMs: overrides?.timeBudgetMs ?? defaults.timeBudgetMs,
    timeBudgetEnabled: true,
  };
}

/**
 * Clean up old messages.
 * With SLACK_CLEANUP_TIME_BUDGET=true (default): limited batch + time budget (Vercel-safe).
 * With SLACK_CLEANUP_TIME_BUDGET=false: runs until backlog is drained (local).
 */
export async function cleanupOldMessages(options?: {
  batchSize?: number;
  timeBudgetMs?: number;
}): Promise<CleanupResult> {
  const config = getEnvConfig();
  const { batchSize, timeBudgetMs, timeBudgetEnabled } = resolveRunLimits(config, options);

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
  const elapsed = () => Date.now() - startedAt;
  const remainingBudget = (): number => {
    if (!timeBudgetEnabled || timeBudgetMs === null) {
      return Number.POSITIVE_INFINITY;
    }
    return timeBudgetMs - elapsed();
  };
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

    console.log(
      timeBudgetEnabled
        ? `Cleanup batch: up to ${batchSize} of ${remainingBefore} old messages (budget ${timeBudgetMs}ms)`
        : `Cleanup unbounded: draining ${remainingBefore} old messages (SLACK_CLEANUP_TIME_BUDGET=false)`,
    );

    const slackClient = getCleanupSlackClient(config.slackBotToken);

    let slackDeleted = 0;
    let skipped = 0;
    let stoppedReason: CleanupResult['stoppedReason'] = 'complete';
    let retryAfterSeconds: number | undefined;
    const processedIds: string[] = [];
    let remainingEstimate = remainingBefore;

    // One pass when budgeted; keep fetching chunks until drained when unbounded
    while (remainingEstimate > 0) {
      if (remainingBudget() <= 0) {
        stoppedReason = 'time_budget';
        console.log('Cleanup stopping early: time budget reached');
        break;
      }

      const oldMessages = await messageRepository.findOldMessages(cutoffTime, batchSize);
      if (oldMessages.length === 0) {
        break;
      }

      for (let i = 0; i < oldMessages.length; i++) {
        if (remainingBudget() <= 0) {
          stoppedReason = 'time_budget';
          console.log('Cleanup stopping early: time budget reached');
          break;
        }

        const message = oldMessages[i];

        try {
          await slackClient.chat.delete({
            channel: message.channelId,
            ts: message.messageId,
            as_user: true,
          });

          slackDeleted++;
          processedIds.push(message.messageId);

          if (i < oldMessages.length - 1 || remainingEstimate > oldMessages.length) {
            if (remainingBudget() > DELETE_PACE_MS) {
              await sleep(DELETE_PACE_MS);
            }
          }
        } catch (error: unknown) {
          if (isRateLimited(error)) {
            const waitSeconds = getRetryAfterSeconds(error);
            const waitMs = (waitSeconds + 1) * 1000;

            if (!timeBudgetEnabled || waitMs < remainingBudget()) {
              console.log(
                `Slack rate limited — waiting ${waitSeconds + 1}s then continuing` +
                  (timeBudgetEnabled ? ` (budget left ${remainingBudget()}ms)` : ''),
              );
              await sleep(waitMs);
              i--; // retry same message
              continue;
            }

            stoppedReason = 'rate_limited';
            retryAfterSeconds = waitSeconds;
            console.log(
              `Cleanup stopping early: Slack rate limited (retry after ${waitSeconds}s, not enough budget)`,
            );
            break;
          }

          const errorCode = (error as { data?: { error?: string } }).data?.error;

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

      if (stoppedReason === 'time_budget' || stoppedReason === 'rate_limited') {
        break;
      }

      // Budgeted mode: one chunk per invocation
      if (timeBudgetEnabled) {
        if (oldMessages.length >= batchSize && remainingBefore > processedIds.length) {
          stoppedReason = 'batch_limit';
        }
        break;
      }

      // Unbounded: flush processed so far and continue with next chunk
      if (processedIds.length > 0) {
        await messageRepository.deleteByMessageIds(processedIds.splice(0, processedIds.length));
      }
      remainingEstimate = await messageRepository.countOldMessages(cutoffTime);
      console.log(`Cleanup progress: ${remainingEstimate} remaining after ${elapsed()}ms`);
    }

    const deletedCount =
      processedIds.length > 0
        ? await messageRepository.deleteByMessageIds(processedIds)
        : 0;

    // In unbounded mode we already deleted mid-loop; recount for accuracy
    const remaining = await messageRepository.countOldMessages(cutoffTime);
    const hasMore = remaining > 0;

    // Approximate totals for unbounded (deleted mid-loop + final flush)
    const totalDeletedApprox = remainingBefore - remaining;

    console.log(`
✅ Cleanup summary:
   - Remaining before: ${remainingBefore}
   - Deleted from Slack: ${slackDeleted}
   - Skipped: ${skipped}
   - Removed from DB (approx): ${totalDeletedApprox}
   - Remaining after: ${remaining}
   - Stopped: ${stoppedReason}
   - Time budget: ${timeBudgetEnabled ? 'on' : 'off'}
   - Elapsed: ${elapsed()}ms
    `);

    return {
      deletedCount: timeBudgetEnabled ? deletedCount : totalDeletedApprox,
      slackDeleted,
      skipped,
      processed: slackDeleted + skipped,
      remaining,
      hasMore,
      retryAfterSeconds,
      stoppedReason: hasMore && stoppedReason === 'complete' ? 'batch_limit' : stoppedReason,
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
