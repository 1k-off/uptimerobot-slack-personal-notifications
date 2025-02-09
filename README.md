# UptimeRobot Slack Personal Notifications

This service is an enhancement to UptimeRobot’s functionality, enabling personalized notifications sent directly to Slack 
channels and users about website events.

## Overview

When UptimeRobot detects an event (such as a website downtime or SSL expiration), it triggers a webhook in this service. 
Service looks up the corresponding website in MongoDB. If subscribers are defined for that website, 
the service dispatches notifications to the subscribed Slack users and channels.

If a website belongs to a group, notifications are aggregated into Slack threads to keep conversations in one place. 
An in‑memory cache is used to store Slack thread details and reduce the number of calls to external APIs.

## Features

- **Personalized Alerts:**  
  Notifications are sent to individual Slack users and channels based on subscriptions.

- **Subscription-based Notifications:**  
  Users can subscribe/unsubscribe for website alerts via the service dashboard.

- **Secure Webhook:**  
  The API endpoint is protected by a pre-defined token ensuring that only UptimeRobot can trigger the webhook.

- **Threaded Notifications for Groups:**  
  When websites belong to a group, alerts are posted into Slack threads for clear and organized updates.

## Technologies

- **Next.js:** UI and API routes running on Vercel.
- **Azure Entra:** Secure user authorization via Azure App registration.
- **Slack:** Notifications.
- **MongoDB/Atlas:** Storage for website subscription details.
- **UptimeRobot:** Monitoring websites and sending event notifications.

## Installation

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/1k-off/uptimerobot-slack-personal-notifications.git
   cd uptimerobot-slack-personal-notifications
   ```

2. **Install Dependencies:**

   ```bash
   yarn install
   ```

3. **Configure Environment Variables:**

   Create a `.env` file in the project root with the following variables:

   ```env
    SLACK_BOT_TOKEN=xoxb-....
    UPTIMEROBOT_API_KEY=u1234567-...
    MONGODB_URI=mongodb://login:password@host/database?authSource=database
    SLACK_HIDDEN_CHANNELS=general,random # hide channels from the list
    SLACK_DATA_CACHE_TIME=3600
    UPTIMEROBOT_DATA_CACHE_TIME=360
    WEBHOOK_SECRET_TOKEN=secret
    AZURE_AD_CLIENT_ID=...
    AZURE_AD_CLIENT_SECRET=...
    AZURE_AD_TENANT_ID=...
    NEXTAUTH_SECRET=secret
    UPTIMEROBOT_ALERT_CONTACT_NAMES=...
    NEXT_PUBLIC_UPTIMEROBOT_WEBSITES_ALL=50 # number of websites uptimerobot can handle (price plan)
    SLACK_CHANNEL_ACTION_NOTIFY=monitoring-admin # channel for notifications about creation or deletion websites from dashboard
   ```

## Usage

### Running the Development Server

Start the project locally with:

```bash
yarn dev
```

The service (and its API routes) will run on your local development server. 
Make sure your UptimeRobot webhook is configured to point to your API endpoint and includes the token as a query parameter 
for authorization.

## Deployment

This project is designed for deployment on Vercel.
