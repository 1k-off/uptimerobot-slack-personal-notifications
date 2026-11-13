import type { NextApiRequest, NextApiResponse } from 'next';
import { withErrorHandler, sendSuccess } from '@/lib/api/response';
import { requireAccessManagerSession } from '@/lib/api/require-access-manager';
import {
  classifyGlpiUserOrg,
  formatGlpiUserDisplayName,
  getGlpiUserEmail,
  searchGlpiUsers,
} from '@/lib/glpi';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  if (!(await requireAccessManagerSession(req, res))) return;

  const q = typeof req.query.q === 'string' ? req.query.q : undefined;
  const users = await searchGlpiUsers(q, 500);

  sendSuccess(
    res,
    users.map((user) => {
      const email = getGlpiUserEmail(user);
      const username = user.username || null;
      return {
        id: user.id,
        username,
        name: formatGlpiUserDisplayName(user),
        email,
        isActive: Boolean(user.is_active),
        org: classifyGlpiUserOrg(username, email),
      };
    }),
  );
}

export default withErrorHandler(handler);
