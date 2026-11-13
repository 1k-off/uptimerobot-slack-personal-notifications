import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession, type Session } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { isAccessManagerFromClaims } from '@/lib/auth/access-manager';

/**
 * Require Access Manager (or Admin) NextAuth session.
 * Returns the session, or null after sending 401.
 */
export async function requireAccessManagerSession(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<Session | null> {
  const session = await getServerSession(req, res, authOptions);
  const user = session?.user as
    | {
        email?: string | null;
        roles?: string[];
        groups?: string[];
        isAdmin?: boolean;
        isAccessManager?: boolean;
      }
    | undefined;

  const allowed =
    Boolean(user?.isAccessManager) ||
    Boolean(user?.isAdmin) ||
    isAccessManagerFromClaims({
      email: user?.email,
      roles: user?.roles,
      groups: user?.groups,
    });

  if (!session?.user || !allowed) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  return session;
}
