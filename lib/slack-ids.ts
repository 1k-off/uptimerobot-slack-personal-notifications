/** Public (C…) or private (G…) Slack channel — not DMs / user IDs. */
export function isSlackChannelId(id: string): boolean {
  return id.startsWith('C') || id.startsWith('G');
}
