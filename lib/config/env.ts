/**
 * Environment configuration with validation
 */

interface EnvConfig {
  // Slack
  slackBotToken: string;
  slackHiddenChannels: string[];
  slackDataCacheTime: number;
  slackChannelActionNotify: string[];
  slackPruneOldMessages: boolean;
  slackKeepMessagesSeconds: number;

  // UptimeRobot
  uptimeRobotApiKey: string;
  uptimeRobotDataCacheTime: number;
  uptimeRobotAlertContactNames: string[];

  // MongoDB
  mongodbUri: string;
  mongodbDb?: string;

  // Webhook
  webhookSecretToken: string;

  // NextAuth
  azureAdClientId: string;
  azureAdClientSecret: string;
  azureAdTenantId: string;
  nextAuthSecret: string;
  nextAuthUrl?: string;

  // Admin
  adminEmails: string[];
  adminGroups: string[];

  // Environment
  nodeEnv: 'development' | 'production' | 'test';
}

function parseEnvNumber(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function parseEnvBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) return defaultValue;
  return value === 'true';
}

function parseEnvArray(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(',').map(item => item.trim()).filter(Boolean);
}

function validateEnv(): EnvConfig {
  const errors: string[] = [];

  // Required variables
  const required = {
    SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN,
    UPTIMEROBOT_API_KEY: process.env.UPTIMEROBOT_API_KEY,
    MONGODB_URI: process.env.MONGODB_URI,
    WEBHOOK_SECRET_TOKEN: process.env.WEBHOOK_SECRET_TOKEN,
    AZURE_AD_CLIENT_ID: process.env.AZURE_AD_CLIENT_ID,
    AZURE_AD_CLIENT_SECRET: process.env.AZURE_AD_CLIENT_SECRET,
    AZURE_AD_TENANT_ID: process.env.AZURE_AD_TENANT_ID,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  };

  for (const [key, value] of Object.entries(required)) {
    if (!value) {
      errors.push(`Missing required environment variable: ${key}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
  }

  return {
    // Slack
    slackBotToken: required.SLACK_BOT_TOKEN!,
    slackHiddenChannels: parseEnvArray(process.env.SLACK_HIDDEN_CHANNELS),
    slackDataCacheTime: parseEnvNumber(process.env.SLACK_DATA_CACHE_TIME, 1800),
    slackChannelActionNotify: parseEnvArray(process.env.SLACK_CHANNEL_ACTION_NOTIFY),
    slackPruneOldMessages: parseEnvBoolean(process.env.SLACK_PRUNE_OLD_MESSAGES, false),
    slackKeepMessagesSeconds: parseEnvNumber(process.env.SLACK_KEEP_MESSAGES_SECONDS, 120),

    // UptimeRobot
    uptimeRobotApiKey: required.UPTIMEROBOT_API_KEY!,
    uptimeRobotDataCacheTime: parseEnvNumber(process.env.UPTIMEROBOT_DATA_CACHE_TIME, 600),
    uptimeRobotAlertContactNames: parseEnvArray(process.env.UPTIMEROBOT_ALERT_CONTACT_NAMES),

    // MongoDB
    mongodbUri: required.MONGODB_URI!,
    mongodbDb: process.env.MONGODB_DB,

    // Webhook
    webhookSecretToken: required.WEBHOOK_SECRET_TOKEN!,

    // NextAuth
    azureAdClientId: required.AZURE_AD_CLIENT_ID!,
    azureAdClientSecret: required.AZURE_AD_CLIENT_SECRET!,
    azureAdTenantId: required.AZURE_AD_TENANT_ID!,
    nextAuthSecret: required.NEXTAUTH_SECRET!,
    nextAuthUrl: process.env.NEXTAUTH_URL,

    // Admin
    adminEmails: parseEnvArray(process.env.ADMIN_EMAILS),
    adminGroups: parseEnvArray(process.env.ADMIN_GROUPS),

    // Environment
    nodeEnv: (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test',
  };
}

let cachedConfig: EnvConfig | null = null;

export function getEnvConfig(): EnvConfig {
  if (!cachedConfig) {
    cachedConfig = validateEnv();
  }
  return cachedConfig;
}

// Re-export for convenience
export const env = {
  get config() {
    return getEnvConfig();
  }
};
