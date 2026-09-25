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
  const user = session?.user as
    | {
        email?: string | null;
        upn?: string | null;
        name?: string | null;
      }
    | undefined;

  const email = user?.email?.trim();
  if (email) return email;

  const upn = user?.upn?.trim();
  if (upn) return upn;

  // Last resort: some Azure AD sessions put UPN-like values on name
  const name = user?.name?.trim();
  if (name && name.includes("@")) return name;

  return AUDIT_ACTOR_SYSTEM;
}
