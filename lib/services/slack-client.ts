import { WebClient } from '@slack/web-api';
import { getEnvConfig } from '@/lib/config';

let cachedClient: WebClient | null = null;

/**
 * Get or create a singleton Slack WebClient instance
 */
export function getSlackClient(): WebClient {
  if (!cachedClient) {
    const config = getEnvConfig();
    cachedClient = new WebClient(config.slackBotToken);
  }
  return cachedClient;
}

/**
 * Reset the cached client (useful for testing or token rotation)
 */
export function resetSlackClient(): void {
  cachedClient = null;
}
