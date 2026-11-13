import {
  formatGlpiUserDisplayName,
  getGlpiUser,
  getGlpiUserEmail,
} from './users';

/** Best-effort label for audit: "Name (username)" or email/username. */
export async function resolveGlpiUserLabel(userId: number): Promise<string> {
  if (!userId) return 'Unknown user';
  try {
    const user = await getGlpiUser(userId);
    const name = formatGlpiUserDisplayName(user);
    const username = user.username?.trim();
    const email = getGlpiUserEmail(user);
    if (username && name && name.toLowerCase() !== username.toLowerCase()) {
      return `${name} (${username})`;
    }
    return name || username || email || `User #${userId}`;
  } catch {
    return `User #${userId}`;
  }
}
