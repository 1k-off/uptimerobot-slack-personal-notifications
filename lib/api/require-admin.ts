import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession, type Session } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { AUDIT_ACTOR_SYSTEM } from '@/lib/db';

/**
 * Require an admin NextAuth session. Returns false and sends 401 if unauthorized.
 */
export async function requireAdminSession(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<boolean> {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user || !(session.user as { isAdmin?: boolean }).isAdmin) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

/**
 * Require any authenticated session. Returns the session or null after sending 401.
 */
export async function requireAuthSession(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<Session | null> {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return session;
}

export function actorFromSession(session: Session | null | undefined): string {
  return session?.user?.email?.trim() || AUDIT_ACTOR_SYSTEM;
}
