declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Slack
      SLACK_BOT_TOKEN: string;
      SLACK_HIDDEN_CHANNELS?: string;
      SLACK_DATA_CACHE_TIME?: string;
      SLACK_CHANNEL_ACTION_NOTIFY?: string;

      // UptimeRobot
      UPTIMEROBOT_API_KEY: string;
      UPTIMEROBOT_DATA_CACHE_TIME?: string;
      UPTIMEROBOT_ALERT_CONTACT_NAMES?: string;
      NEXT_PUBLIC_UPTIMEROBOT_WEBSITES_ALL?: string;

      // MongoDB
      MONGODB_URI: string;
      MONGODB_DB?: string;

      // Webhook
      WEBHOOK_SECRET_TOKEN: string;

      // NextAuth
      AZURE_AD_CLIENT_ID: string;
      AZURE_AD_CLIENT_SECRET: string;
      AZURE_AD_TENANT_ID: string;
      NEXTAUTH_SECRET: string;
      NEXTAUTH_URL?: string;

      // Admin
      ADMIN_EMAILS?: string;
      ADMIN_GROUPS?: string;

      // Access Manager
      ACCESS_MANAGER_EMAILS?: string;
      ACCESS_MANAGER_GROUPS?: string;

      // GLPI high-level API (OAuth)
      GLPI_URL?: string;
      GLPI_OAUTH_CLIENT_ID?: string;
      GLPI_OAUTH_CLIENT_SECRET?: string;
      GLPI_USERNAME?: string;
      GLPI_PASSWORD?: string;

      // Environment
      NODE_ENV: 'development' | 'production' | 'test';
    }
  }
}

export {}; 