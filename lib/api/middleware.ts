import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { Session } from '@/types';
import { UnauthorizedError, ForbiddenError } from './errors';

export async function requireAuth(
  req: NextApiRequest
): Promise<Session> {
  const session = await getSession({ req }) as Session | null;

  if (!session) {
    throw new UnauthorizedError('Authentication required');
  }

  return session;
}

export async function requireAdmin(
  req: NextApiRequest
): Promise<Session> {
  const session = await requireAuth(req);

  if (!session.user.isAdmin) {
    throw new ForbiddenError('Admin access required');
  }

  return session;
}

export function validateMethod(
  req: NextApiRequest,
  res: NextApiResponse,
  allowedMethods: string[]
): void {
  if (!req.method || !allowedMethods.includes(req.method)) {
    res.setHeader('Allow', allowedMethods);
    throw new Error(`Method ${req.method} Not Allowed`);
  }
}

export function validateWebhookToken(
  req: NextApiRequest
): void {
  const { token } = req.query;
  const expectedToken = process.env.WEBHOOK_SECRET_TOKEN;

  if (!expectedToken) {
    throw new Error('WEBHOOK_SECRET_TOKEN not configured');
  }

  if (token !== expectedToken) {
    throw new UnauthorizedError('Invalid webhook token');
  }
}
